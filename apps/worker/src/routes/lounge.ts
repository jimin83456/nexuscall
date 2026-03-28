import { Hono } from 'hono';
import type { Env } from '../index';
import { generateAgentToken, verifyAgentToken } from '../utils/agent-auth';

const app = new Hono<{ Bindings: Env }>();

// ==========================================
// API 인증 미들웨어
// ==========================================
async function requireAgentAuth(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'API 키가 필요합니다. POST /api/lounge/join 으로 참여하세요.' }, 401);
  }
  const token = authHeader.substring(7);
  const agent = await verifyAgentToken(c.env, token);
  if (!agent) {
    return c.json({ error: '유효하지 않은 API 키입니다.' }, 401);
  }
  c.set('agent', agent);
  await next();
}

// ==========================================
// POST /api/lounge/join - 에이전트 입장 & API 키 발급
// ==========================================
app.post('/join', async (c) => {
  const body = await c.req.json();
  const { agentId, agentName, agentType, loungeId } = body;

  if (!agentId || !agentName) {
    return c.json({ error: 'agentId와 agentName은 필수입니다.' }, 400);
  }

  const lounge = loungeId || 'lounge-public';

  // 라운지 존재 확인
  const loungeExists = await c.env.DB.prepare(
    'SELECT id FROM lounges WHERE id = ?'
  ).bind(lounge).first();
  if (!loungeExists) {
    return c.json({ error: '존재하지 않는 라운지입니다.' }, 404);
  }

  // 이미 참여 중인지 확인
  const existing = await c.env.DB.prepare(
    'SELECT id FROM lounge_agents WHERE agent_id = ? AND lounge_id = ?'
  ).bind(agentId, lounge).first();

  if (existing) {
    // 재입장: 상태 업데이트 + 새 토큰 발급
    await c.env.DB.prepare(
      'UPDATE lounge_agents SET status = ?, last_active_at = CURRENT_TIMESTAMP WHERE agent_id = ? AND lounge_id = ?'
    ).bind('online', agentId, lounge).run();
  } else {
    // 신규 참여
    await c.env.DB.prepare(
      'INSERT INTO lounge_agents (id, lounge_id, agent_id, agent_name, agent_type, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), lounge, agentId, agentName, agentType || 'custom', 'online').run();
  }

  // API 토큰 발급
  const token = await generateAgentToken(c.env, { agentId, agentName, loungeId: lounge });

  // 시스템 메시지
  await c.env.DB.prepare(
    'INSERT INTO lounge_messages (id, lounge_id, sender_id, sender_name, content, message_type) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), lounge, 'system', '시스템', `${agentName}님이 라운지에 입장했습니다.`, 'system').run();

  // Durable Object 브로드캐스트
  try {
    const roomId = c.env.WORKSPACE_ROOM.idFromName(lounge);
    const room = c.env.WORKSPACE_ROOM.get(roomId);
    await room.fetch(new Request('https://internal/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'agent_joined',
        agentId,
        agentName,
        timestamp: new Date().toISOString(),
      }),
    }));
  } catch {}

  return c.json({
    success: true,
    data: {
      token,
      loungeId: lounge,
      message: `${agentName}님, 라운지에 참여했습니다!`,
    },
  });
});

// ==========================================
// POST /api/lounge/leave - 에이전트 퇴장
// ==========================================
app.post('/leave', requireAgentAuth, async (c) => {
  const agent = c.get('agent');

  await c.env.DB.prepare(
    'UPDATE lounge_agents SET status = ?, last_active_at = CURRENT_TIMESTAMP WHERE agent_id = ? AND lounge_id = ?'
  ).bind('offline', agent.agentId, agent.loungeId).run();

  await c.env.DB.prepare(
    'INSERT INTO lounge_messages (id, lounge_id, sender_id, sender_name, content, message_type) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), agent.loungeId, 'system', '시스템', `${agent.agentName}님이 라운지에서 퇴장했습니다.`, 'system').run();

  try {
    const roomId = c.env.WORKSPACE_ROOM.idFromName(agent.loungeId);
    const room = c.env.WORKSPACE_ROOM.get(roomId);
    await room.fetch(new Request('https://internal/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'agent_left',
        agentId: agent.agentId,
        agentName: agent.agentName,
        timestamp: new Date().toISOString(),
      }),
    }));
  } catch {}

  return c.json({ success: true, message: '퇴장했습니다.' });
});

// ==========================================
// POST /api/lounge/send - 메시지 전송
// ==========================================
app.post('/send', requireAgentAuth, async (c) => {
  const agent = c.get('agent');
  const body = await c.req.json();
  const { content, replyTo } = body;

  if (!content?.trim()) {
    return c.json({ error: '메시지 내용이 필요합니다.' }, 400);
  }

  if (content.length > 5000) {
    return c.json({ error: '메시지는 5000자 이하로 입력해주세요.' }, 400);
  }

  const messageId = crypto.randomUUID();

  await c.env.DB.prepare(
    'INSERT INTO lounge_messages (id, lounge_id, sender_id, sender_name, content, message_type, reply_to_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(messageId, agent.loungeId, agent.agentId, agent.agentName, content.trim(), 'text', replyTo || null).run();

  // 마지막 활동 시간 업데이트
  await c.env.DB.prepare(
    'UPDATE lounge_agents SET last_active_at = CURRENT_TIMESTAMP WHERE agent_id = ? AND lounge_id = ?'
  ).bind(agent.agentId, agent.loungeId).run();

  // 브로드캐스트
  const messageData = {
    type: 'message',
    id: messageId,
    senderId: agent.agentId,
    senderName: agent.agentName,
    content: content.trim(),
    replyTo: replyTo || null,
    timestamp: new Date().toISOString(),
  };

  try {
    const roomId = c.env.WORKSPACE_ROOM.idFromName(agent.loungeId);
    const room = c.env.WORKSPACE_ROOM.get(roomId);
    await room.fetch(new Request('https://internal/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData),
    }));
  } catch {}

  return c.json({ success: true, data: messageData });
});

// ==========================================
// GET /api/lounge/messages - 메시지 조회 (API 인증 불필요, 읽기 전용)
// ==========================================
app.get('/messages', async (c) => {
  const loungeId = c.req.query('lounge') || 'lounge-public';
  const since = c.req.query('since'); // ISO timestamp
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);

  let query = 'SELECT id, sender_id, sender_name, content, message_type, reply_to_id, created_at FROM lounge_messages WHERE lounge_id = ?';
  const params: any[] = [loungeId];

  if (since) {
    query += ' AND created_at > ?';
    params.push(since);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  return c.json({
    success: true,
    data: {
      messages: (results || []).reverse(), // 오래된 순으로
    },
  });
});

// ==========================================
// GET /api/lounge/agents - 참여 중인 에이전트 목록
// ==========================================
app.get('/agents', async (c) => {
  const loungeId = c.req.query('lounge') || 'lounge-public';

  const { results } = await c.env.DB.prepare(
    'SELECT agent_id, agent_name, agent_type, status, last_active_at, joined_at FROM lounge_agents WHERE lounge_id = ? ORDER BY joined_at'
  ).bind(loungeId).all();

  return c.json({
    success: true,
    data: { agents: results || [] },
  });
});

// ==========================================
// GET /api/lounge/lounges - 라운지 목록
// ==========================================
app.get('/lounges', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT l.id, l.name, l.description, l.is_active, COUNT(la.id) as agent_count FROM lounges l LEFT JOIN lounge_agents la ON l.id = la.laounge_id AND la.status = ? WHERE l.is_active = 1 GROUP BY l.id'
  ).bind('online').all();

  // 쿼리 에러 방지를 위해 간단한 쿼리로 변경
  const lounges = await c.env.DB.prepare(
    'SELECT id, name, description, is_active FROM lounges WHERE is_active = 1'
  ).all();

  return c.json({
    success: true,
    data: { lounges: lounges.results || [] },
  });
});

export default app;
