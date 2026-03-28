import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Env }>();

// 감사 로그 조회 (인증 필요)
app.get('/', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  const query = c.req.query();
  const { workspace_id, agent_id, action, limit = '50', offset = '0' } = query;
  
  let sql = `
    SELECT al.* FROM audit_logs al
    JOIN workspaces w ON al.workspace_id = w.id
    WHERE w.owner_id = ?
  `;
  const params: string[] = [user.id];
  
  if (workspace_id) {
    sql += ' AND al.workspace_id = ?';
    params.push(workspace_id);
  }
  
  if (agent_id) {
    sql += ' AND al.agent_id = ?';
    params.push(agent_id);
  }
  
  if (action) {
    sql += ' AND al.action = ?';
    params.push(action);
  }
  
  sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  
  // 총 개수 조회
  let countSql = `
    SELECT COUNT(*) as total FROM audit_logs al
    JOIN workspaces w ON al.workspace_id = w.id
    WHERE w.owner_id = ?
  `;
  const countParams: string[] = [user.id];
  
  if (workspace_id) {
    countSql += ' AND al.workspace_id = ?';
    countParams.push(workspace_id);
  }
  
  if (agent_id) {
    countSql += ' AND al.agent_id = ?';
    countParams.push(agent_id);
  }
  
  if (action) {
    countSql += ' AND al.action = ?';
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
app.post('/', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  const body = await c.req.json();
  const { workspace_id, agent_id, action, details } = body;
  
  // 워크스페이스 소유자 확인
  const workspace = await c.env.DB.prepare(
    'SELECT id FROM workspaces WHERE id = ? AND owner_id = ?'
  ).bind(workspace_id, user.id).first();
  
  if (!workspace) {
    return c.json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '이 워크스페이스에 접근할 권한이 없습니다.',
      },
      timestamp: new Date().toISOString(),
    }, 403);
  }
  
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
