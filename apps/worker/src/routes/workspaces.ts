import { Hono } from 'hono';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// 모든 워크스페이스 조회
app.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM workspaces ORDER BY created_at DESC'
  ).all();
  
  return c.json({
    success: true,
    data: {
      workspaces: results,
      total: results.length,
    },
    timestamp: new Date().toISOString(),
  });
});

// 워크스페이스 생성
app.post('/', async (c) => {
  const body = await c.req.json();
  const { name, type, owner_id, settings } = body;
  
  const id = crypto.randomUUID();
  
  await c.env.DB.prepare(
    'INSERT INTO workspaces (id, name, type, owner_id, settings) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, name, type || 'private', owner_id, JSON.stringify(settings || {})).run();
  
  return c.json({
    success: true,
    data: {
      id,
      name,
      type: type || 'private',
      owner_id,
    },
    timestamp: new Date().toISOString(),
  });
});

// 워크스페이스 상세
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  const workspace = await c.env.DB.prepare(
    'SELECT * FROM workspaces WHERE id = ?'
  ).bind(id).first();
  
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

// 워크스페이스에 에이전트 추가
app.post('/:id/agents', async (c) => {
  const workspaceId = c.req.param('id');
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

// 워크스페이스 삭제
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  
  await c.env.DB.prepare(
    'DELETE FROM workspaces WHERE id = ?'
  ).bind(id).run();
  
  return c.json({
    success: true,
    data: {
      message: '워크스페이스가 삭제되었습니다.',
    },
    timestamp: new Date().toISOString(),
  });
});

export default app;
