import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Env }>();

// 모든 에이전트 조회 (인증 필요)
app.get('/', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  
  const { results } = await c.env.DB.prepare(
    `SELECT a.* FROM agents a
     JOIN workspaces w ON a.workspace_id = w.id
     WHERE w.owner_id = ?
     ORDER BY a.created_at DESC`
  ).bind(user.id).all();
  
  return c.json({
    success: true,
    data: {
      agents: results,
      total: results.length,
    },
    timestamp: new Date().toISOString(),
  });
});

// 에이전트 생성 (인증 필요)
app.post('/', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  const body = await c.req.json();
  const { name, type, workspace_id, config } = body;
  
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
    'INSERT INTO agents (id, name, type, workspace_id, config, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, name, type, workspace_id, JSON.stringify(config || {}), 'offline').run();
  
  return c.json({
    success: true,
    data: {
      id,
      name,
      type,
      workspace_id,
      status: 'offline',
    },
    timestamp: new Date().toISOString(),
  });
});

// 에이전트 상세 (인증 필요)
app.get('/:id', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  const id = c.req.param('id');
  
  const result = await c.env.DB.prepare(
    `SELECT a.* FROM agents a
     JOIN workspaces w ON a.workspace_id = w.id
     WHERE a.id = ? AND w.owner_id = ?`
  ).bind(id, user.id).first();
  
  if (!result) {
    return c.json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '에이전트를 찾을 수 없습니다.',
      },
      timestamp: new Date().toISOString(),
    }, 404);
  }
  
  return c.json({
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
  });
});

// 에이전트 상태 업데이트 (인증 필요)
app.patch('/:id/status', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  const id = c.req.param('id');
  const body = await c.req.json();
  const { status } = body;
  
  // 소유자 확인
  const agent = await c.env.DB.prepare(
    `SELECT a.id FROM agents a
     JOIN workspaces w ON a.workspace_id = w.id
     WHERE a.id = ? AND w.owner_id = ?`
  ).bind(id, user.id).first();
  
  if (!agent) {
    return c.json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '이 에이전트에 접근할 권한이 없습니다.',
      },
      timestamp: new Date().toISOString(),
    }, 403);
  }
  
  await c.env.DB.prepare(
    'UPDATE agents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(status, id).run();
  
  return c.json({
    success: true,
    data: {
      id,
      status,
    },
    timestamp: new Date().toISOString(),
  });
});

// 에이전트 삭제 (인증 필요)
app.delete('/:id', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  const id = c.req.param('id');
  
  // 소유자 확인 후 삭제
  await c.env.DB.prepare(
    `DELETE FROM agents WHERE id = ? AND workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = ?
    )`
  ).bind(id, user.id).run();
  
  return c.json({
    success: true,
    data: {
      message: '에이전트가 삭제되었습니다.',
    },
    timestamp: new Date().toISOString(),
  });
});

export default app;
