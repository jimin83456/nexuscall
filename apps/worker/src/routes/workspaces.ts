import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Env }>();

// 모든 워크스페이스 조회 (인증 필요)
app.get('/', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM workspaces WHERE owner_id = ? ORDER BY created_at DESC'
  ).bind(user.id).all();
  
  return c.json({
    success: true,
    data: {
      workspaces: results,
      total: results.length,
    },
    timestamp: new Date().toISOString(),
  });
});

// 워크스페이스 생성 (인증 필요)
app.post('/', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  const body = await c.req.json();
  const { name, type, settings } = body;
  
  const id = crypto.randomUUID();
  
  await c.env.DB.prepare(
    'INSERT INTO workspaces (id, name, type, owner_id, settings) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, name, type || 'private', user.id, JSON.stringify(settings || {})).run();
  
  return c.json({
    success: true,
    data: {
      id,
      name,
      type: type || 'private',
      owner_id: user.id,
    },
    timestamp: new Date().toISOString(),
  });
});

// 워크스페이스 상세 (인증 필요)
app.get('/:id', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  const id = c.req.param('id');
  
  const workspace = await c.env.DB.prepare(
    'SELECT * FROM workspaces WHERE id = ? AND owner_id = ?'
  ).bind(id, user.id).first();
  
  if (!workspace) {
    return c.json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '워크스페이스를 찾을 수 없습니다.',
      },
      timestamp: new Date().toISOString(),
    }, 404);
  }
  
  // 워크스페이스의 에이전트 목록도 함께 조회
  const { results: agents } = await c.env.DB.prepare(
    'SELECT * FROM agents WHERE workspace_id = ?'
  ).bind(id).all();
  
  return c.json({
    success: true,
    data: {
      ...workspace,
      agents,
    },
    timestamp: new Date().toISOString(),
  });
});

// 워크스페이스에 에이전트 추가 (인증 필요)
app.post('/:id/agents', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  const workspaceId = c.req.param('id');
  
  // 워크스페이스 소유자 확인
  const workspace = await c.env.DB.prepare(
    'SELECT id FROM workspaces WHERE id = ? AND owner_id = ?'
  ).bind(workspaceId, user.id).first();
  
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
  
  const body = await c.req.json();
  const { name, type, config } = body;
  
  const id = crypto.randomUUID();
  
  await c.env.DB.prepare(
    'INSERT INTO agents (id, name, type, workspace_id, config, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, name, type, workspaceId, JSON.stringify(config || {}), 'offline').run();
  
  return c.json({
    success: true,
    data: {
      id,
      name,
      type,
      workspace_id: workspaceId,
      status: 'offline',
    },
    timestamp: new Date().toISOString(),
  });
});

// 워크스페이스 삭제 (인증 필요)
app.delete('/:id', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  const id = c.req.param('id');
  
  const result = await c.env.DB.prepare(
    'DELETE FROM workspaces WHERE id = ? AND owner_id = ?'
  ).bind(id, user.id).run();
  
  return c.json({
    success: true,
    data: {
      message: '워크스페이스가 삭제되었습니다.',
    },
    timestamp: new Date().toISOString(),
  });
});

export default app;
