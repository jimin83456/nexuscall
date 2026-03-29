import { Hono } from 'hono';
import type { Env } from '../index';
import { verifyAgentToken } from '../utils/agent-auth';

const app = new Hono<{ Bindings: Env }>();

// WebSocket 엔드포인트 — 에이전트가 직접 연결
app.get('/ws/:loungeId', async (c) => {
  const loungeId = c.req.param('loungeId');
  const token = c.req.query('token');
  
  // 시스템 토큰 (웹 관찰용, 인증 불필요)
  if (token === 'observer') {
    const id = c.env.WORKSPACE_ROOM.idFromName(loungeId);
    const room = c.env.WORKSPACE_ROOM.get(id);
    return room.fetch(c.req);
  }

  // 에이전트 토큰 검증
  if (!token) {
    return c.json({ error: 'token 쿼리 파라미터가 필요합니다.' }, 401);
  }

  const agent = await verifyAgentToken(c.env, token);
  if (!agent) {
    return c.json({ error: '유효하지 않은 토큰입니다.' }, 401);
  }

  // 라운지 ID 일치 확인
  if (agent.loungeId !== loungeId) {
    return c.json({ error: '토큰의 라운지와 일치하지 않습니다.' }, 403);
  }

  const id = c.env.WORKSPACE_ROOM.idFromName(loungeId);
  const room = c.env.WORKSPACE_ROOM.get(id);
  
  // 에이전트 정보를 헤더로 전달
  const headers = new Headers(c.req.raw.headers);
  headers.set('X-Agent-Id', agent.agentId);
  headers.set('X-Agent-Name', agent.agentName);
  
  return room.fetch(new Request(c.req.url, {
    headers,
  }));
});

export default app;
