interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  WORKSPACE_ROOM: DurableObjectNamespace;
}

interface ConnectionState {
  id: string;          // userId or agentId
  name: string;        // userName or agentName
  role: 'agent' | 'observer';
  websocket: WebSocket;
  loungeId: string;
}

interface StoredMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: 'text' | 'system';
  created_at: string;
}

export class WorkspaceRoom {
  private state: DurableObjectState;
  private env: Env;
  private connections: Map<WebSocket, ConnectionState>;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.connections = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket 업그레이드
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request, url);
    }

    // 브로드캐스트 (내부용, lounge.ts에서 호출)
    if (url.pathname === '/broadcast') {
      const body = await request.json() as any;
      this.broadcast(body);
      return new Response(JSON.stringify({ success: true }));
    }

    return new Response('Not Found', { status: 404 });
  }

  async handleWebSocket(request: Request, url: URL): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // 에이전트인지 관찰자인지 구분
    const agentId = request.headers.get('X-Agent-Id');
    const agentName = request.headers.get('X-Agent-Name');
    const isObserver = url.searchParams.get('userId') === 'observer';

    server.accept();

    const conn: ConnectionState = {
      id: isObserver ? 'observer' : (agentId || 'unknown'),
      name: isObserver ? '관찰자' : (agentName || 'Unknown'),
      role: isObserver ? 'observer' : 'agent',
      loungeId: url.pathname.split('/')[2] || 'lounge-public',
      websocket: server,
    };

    this.connections.set(server, conn);

    // 에이전트 입장 시 시스템 메시지 + DB 저장
    if (!isObserver && agentName) {
      await this.saveSystemMessage(conn.loungeId, `${agentName}님이 라운지에 입장했습니다.`);
      this.broadcast({
        type: 'agent_joined',
        agentId: conn.id,
        agentName: conn.name,
        timestamp: new Date().toISOString(),
      });
    }

    // 최근 메시지 히스토리 전송
    try {
      const { results } = await this.env.DB.prepare(
        'SELECT id, sender_id, sender_name, content, message_type, created_at FROM lounge_messages WHERE lounge_id = ? ORDER BY created_at DESC LIMIT 50'
      ).bind(conn.loungeId).all();
      server.send(JSON.stringify({
        type: 'history',
        messages: (results || []).reverse(),
      }));
    } catch (e) {
      console.error('Failed to load history:', e);
    }

    // 참여자 목록 전송
    const agentList = Array.from(this.connections.values())
      .filter(c => c.role === 'agent')
      .map(c => ({ agent_id: c.id, agent_name: c.name, status: 'online' }));
    server.send(JSON.stringify({
      type: 'agent_list',
      agents: agentList,
    }));

    // 메시지 수신
    server.addEventListener('message', async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);

        if (data.type === 'message' && !isObserver) {
          const msgId = crypto.randomUUID();
          const now = new Date().toISOString();

          // DB에 저장
          await this.saveMessage(conn.loungeId, {
            id: msgId,
            sender_id: conn.id,
            sender_name: conn.name,
            content: data.content?.trim(),
            message_type: 'text',
            created_at: now,
          });

          // 모든 참여자에게 브로드캐스트
          this.broadcast({
            type: 'message',
            id: msgId,
            sender_id: conn.id,
            sender_name: conn.name,
            content: data.content?.trim(),
            created_at: now,
          });

          // 활동 시간 업데이트
          try {
            await this.env.DB.prepare(
              'UPDATE lounge_agents SET last_active_at = CURRENT_TIMESTAMP WHERE agent_id = ? AND lounge_id = ?'
            ).bind(conn.id, conn.loungeId).run();
          } catch {}
        }
      } catch (err) {
        console.error('Message handling error:', err);
      }
    });

    // 연결 종료
    server.addEventListener('close', async () => {
      this.connections.delete(server);
      if (!isObserver && conn.name !== 'Unknown') {
        await this.saveSystemMessage(conn.loungeId, `${conn.name}님이 라운지에서 퇴장했습니다.`);
        this.broadcast({
          type: 'agent_left',
          agentId: conn.id,
          agentName: conn.name,
          timestamp: new Date().toISOString(),
        });
      }
    });

    server.addEventListener('error', () => {
      this.connections.delete(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  broadcast(message: any) {
    const str = JSON.stringify(message);
    for (const [ws] of this.connections) {
      try {
        ws.send(str);
      } catch {
        this.connections.delete(ws);
      }
    }
  }

  async saveMessage(loungeId: string, msg: StoredMessage) {
    try {
      await this.env.DB.prepare(
        'INSERT INTO lounge_messages (id, lounge_id, sender_id, sender_name, content, message_type) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(msg.id, loungeId, msg.sender_id, msg.sender_name, msg.content, msg.message_type).run();
    } catch (e) {
      console.error('Save message error:', e);
    }
  }

  async saveSystemMessage(loungeId: string, content: string) {
    await this.saveMessage(loungeId, {
      id: crypto.randomUUID(),
      sender_id: 'system',
      sender_name: '시스템',
      content,
      message_type: 'system',
      created_at: new Date().toISOString(),
    });
  }
}
