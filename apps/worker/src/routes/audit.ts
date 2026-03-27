import { Hono } from 'hono';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// 감사 로그 조회
app.get('/', async (c) => {
  const query = c.req.query();
  const { workspace_id, agent_id, action, limit = '50', offset = '0' } = query;
  
  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: string[] = [];
  
  if (workspace_id) {
    sql += ' AND workspace_id = ?';
    params.push(workspace_id);
  }
  
  if (agent_id) {
    sql += ' AND agent_id = ?';
    params.push(agent_id);
  }
  
  if (action) {
    sql += ' AND action = ?';
    params.push(action);
  }
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  
  // 총 개수 조회
  let countSql = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
  const countParams: string[] = [];
  
  if (workspace_id) {
    countSql += ' AND workspace_id = ?';
    countParams.push(workspace_id);
  }
  
  if (agent_id) {
    countSql += ' AND agent_id = ?';
    countParams.push(agent_id);
  }
  
  if (action) {
    countSql += ' AND action = ?';
    countParams.push(action);
  }
  
  const countResult = await c.env.DB.prepare(countSql).bind(...countParams).first();
  
  return c.json({
    success: true,
    data: {
      logs: results,
      total: countResult?.total || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    },
    timestamp: new Date().toISOString(),
  });
});

// 감사 로그 생성 (내부용)
app.post('/', async (c) => {
  const body = await c.req.json();
  const { workspace_id, agent_id, action, details } = body;
  
  const id = crypto.randomUUID();
  
  await c.env.DB.prepare(
    'INSERT INTO audit_logs (id, workspace_id, agent_id, action, details) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, workspace_id, agent_id, action, JSON.stringify(details || {})).run();
  
  return c.json({
    success: true,
    data: {
      id,
      workspace_id,
      agent_id,
      action,
    },
    timestamp: new Date().toISOString(),
  });
});

export default app;
