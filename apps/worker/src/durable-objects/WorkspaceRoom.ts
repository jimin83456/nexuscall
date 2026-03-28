// 타입 정의 (Env 타입을 직접 정의)
interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  WORKSPACE_ROOM: DurableObjectNamespace;
}

interface WebSocketMessage {
  type: 'join' | 'leave' | 'message' | 'agent_status' | 'ping' | 'pong';
  payload: any;
  userId?: string;
  agentId?: string;
}

interface ConnectionState {
  userId: string;
  userName: string;
  websocket: WebSocket;
  joinedAt: number;
}

export class WorkspaceRoom {
  private state: DurableObjectState;
  private env: Env;
  private connections: Map<WebSocket, ConnectionState>;
  private messages: Array<{ id: string; agentId?: string; agentName?: string; content: string; timestamp: number; type: string }>;
  private workspaceId: string;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.connections = new Map();
    this.messages = [];
    this.workspaceId = '';
    
    // 저장된 메시지 복구
    this.state.storage.get('messages').then((msgs) => {
      if (Array.isArray(msgs)) {
        this.messages = msgs;
      }
    });
  }

  // HTTP 요청 처리
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // WebSocket 업그레이드
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }
    
    // HTTP API
    if (url.pathname === '/messages') {
      return new Response(JSON.stringify({
        messages: this.messages.slice(-100), // 최근 100개
        connections: this.connections.size,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (url.pathname === '/broadcast') {
      const body = await request.json() as WebSocketMessage;
      this.broadcast(body);
      return new Response(JSON.stringify({ success: true }));
    }
    
    return new Response('Not Found', { status: 404 });
  }

  // WebSocket 처리
  async handleWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || 'anonymous';
    const userName = url.searchParams.get('userName') || 'Anonymous';
    this.workspaceId = url.searchParams.get('workspaceId') || '';

    // WebSocket 쌍 생성
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // 연결 수락
    server.accept();
    
    // 연결 상태 저장
    this.connections.set(server, {
      userId,
      userName,
      websocket: server,
      joinedAt: Date.now(),
    });

    // 입장 알림
    this.broadcast({
      type: 'join',
      payload: { userId, userName, timestamp: Date.now() },
    });

    // 최근 메시지 전송
    server.send(JSON.stringify({
      type: 'history',
      payload: this.messages.slice(-50),
    }));

    // 메시지 수신 처리
    server.addEventListener('message', (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string) as WebSocketMessage;
        this.handleMessage(server, message);
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    });

    // 연결 종료 처리
    server.addEventListener('close', () => {
      const state = this.connections.get(server);
      if (state) {
        this.broadcast({
          type: 'leave',
          payload: { userId: state.userId, userName: state.userName, timestamp: Date.now() },
        });
      }
      this.connections.delete(server);
    });

    // 에러 처리
    server.addEventListener('error', (err) => {
      console.error('WebSocket error:', err);
      this.connections.delete(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  // 메시지 처리
  handleMessage(ws: WebSocket, message: WebSocketMessage) {
    const state = this.connections.get(ws);
    if (!state) return;

    switch (message.type) {
      case 'message':
        // 에이전트 메시지 저장 및 브로드캐스트
        const msgRecord = {
          id: crypto.randomUUID(),
          agentId: message.agentId,
          agentName: message.payload.agentName || state.userName,
          content: message.payload.content,
          timestamp: Date.now(),
          type: 'message',
        };
        this.messages.push(msgRecord);
        
        // 저장 (최근 1000개만)
        if (this.messages.length > 1000) {
          this.messages = this.messages.slice(-1000);
        }
        this.state.storage.put('messages', this.messages);
        
        this.broadcast({
          type: 'message',
          payload: msgRecord,
        });
        break;

      case 'agent_status':
        // 에이전트 상태 변경
        this.broadcast({
          type: 'agent_status',
          payload: {
            agentId: message.agentId,
            status: message.payload.status,
            timestamp: Date.now(),
          },
        });
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', payload: { timestamp: Date.now() } }));
        break;
    }
  }

  // 브로드캐스트
  broadcast(message: WebSocketMessage) {
    const messageStr = JSON.stringify(message);
    
    for (const [ws] of this.connections) {
      try {
        ws.send(messageStr);
      } catch (err) {
        // 연결이 끊어진 경우 제거
        this.connections.delete(ws);
      }
    }
  }
}
