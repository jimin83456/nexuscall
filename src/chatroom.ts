import type { WebSocketMessage, Agent } from './types';

interface Session {
  webSocket: WebSocket;
  agentId: string;
  agentName: string;
  agentAvatar: string;
}

export class ChatRoom {
  private sessions: Map<string, Session> = new Map();
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // REST endpoints for the room
    if (url.pathname.endsWith('/agents')) {
      return this.getOnlineAgents();
    }

    return new Response('ChatRoom Durable Object', { status: 200 });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const agentId = url.searchParams.get('agent_id');
    const agentName = url.searchParams.get('agent_name') || 'Unknown';
    const agentAvatar = url.searchParams.get('agent_avatar') || '🤖';

    if (!agentId) {
      return new Response('Missing agent_id', { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket
    this.state.acceptWebSocket(server);

    // Store session info
    const session: Session = {
      webSocket: server,
      agentId,
      agentName,
      agentAvatar,
    };
    this.sessions.set(agentId, session);

    // Notify others of new agent
    this.broadcast({
      type: 'join',
      data: {
        agent_id: agentId,
        agent_name: agentName,
        agent_avatar: agentAvatar,
      },
      timestamp: new Date().toISOString(),
    }, agentId);

    // Send current online agents to the new connection
    const onlineAgents = Array.from(this.sessions.values()).map(s => ({
      id: s.agentId,
      name: s.agentName,
      avatar: s.agentAvatar,
    }));

    server.send(JSON.stringify({
      type: 'agents',
      data: onlineAgents,
      timestamp: new Date().toISOString(),
    }));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const data = JSON.parse(message as string) as WebSocketMessage;
      const session = this.findSessionByWebSocket(ws);

      if (!session) {
        ws.send(JSON.stringify({ type: 'error', data: 'Session not found' }));
        return;
      }

      switch (data.type) {
        case 'message':
          // Broadcast message to all connected agents
          this.broadcast({
            type: 'message',
            data: {
              content: data.data,
              agent_id: session.agentId,
              agent_name: session.agentName,
              agent_avatar: session.agentAvatar,
            },
            timestamp: new Date().toISOString(),
          });
          break;

        case 'typing':
          this.broadcast({
            type: 'typing',
            data: {
              agent_id: session.agentId,
              agent_name: session.agentName,
            },
            timestamp: new Date().toISOString(),
          }, session.agentId);
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  }

  async webSocketClose(ws: WebSocket) {
    const session = this.findSessionByWebSocket(ws);
    if (session) {
      this.sessions.delete(session.agentId);
      
      // Notify others of agent leaving
      this.broadcast({
        type: 'leave',
        data: {
          agent_id: session.agentId,
          agent_name: session.agentName,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    console.error('WebSocket error:', error);
    const session = this.findSessionByWebSocket(ws);
    if (session) {
      this.sessions.delete(session.agentId);
    }
  }

  private findSessionByWebSocket(ws: WebSocket): Session | undefined {
    for (const session of this.sessions.values()) {
      if (session.webSocket === ws) {
        return session;
      }
    }
    return undefined;
  }

  private broadcast(message: WebSocketMessage, excludeAgentId?: string) {
    const messageStr = JSON.stringify(message);
    for (const [agentId, session] of this.sessions) {
      if (excludeAgentId && agentId === excludeAgentId) continue;
      try {
        session.webSocket.send(messageStr);
      } catch (error) {
        console.error(`Failed to send to ${agentId}:`, error);
        this.sessions.delete(agentId);
      }
    }
  }

  private getOnlineAgents(): Response {
    const agents = Array.from(this.sessions.values()).map(s => ({
      id: s.agentId,
      name: s.agentName,
      avatar: s.agentAvatar,
    }));
    return Response.json({ agents, count: agents.length });
  }
}
