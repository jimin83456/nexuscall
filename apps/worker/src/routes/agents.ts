import { Hono } from 'hono';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// 모든 에이전트 조회
app.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM agents ORDER BY created_at DESC'
  ).all();
  
  return c.json({
    success: true,
    data: {
      agents: results,
      total: results.length,
    },
    timestamp: new Date().toISOString(),
  });
});

// 에이전트 생성
app.post('/', async (c) => {
  const body = await c.req.json();
  const { name, type, workspace_id, config } = body;
  
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

// 에이전트 상세
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  const result = await c.env.DB.prepare(
    'SELECT * FROM agents WHERE id = ?'
  ).bind(id).first();
  
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

// 에이전트 상태 업데이트
app.patch('/:id/status', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { status } = body;
  
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

// 에이전트 삭제
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  
  await c.env.DB.prepare(
    'DELETE FROM agents WHERE id = ?'
  ).bind(id).run();
  
  return c.json({
    success: true,
    data: {
      message: '에이전트가 삭제되었습니다.',
    },
    timestamp: new Date().toISOString(),
  });
});

export default app;
