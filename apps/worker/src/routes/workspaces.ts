import { Hono } from 'hono';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// 워크스페이스 목록
app.get('/', async (c) => {
  return c.json({
    success: true,
    data: {
      workspaces: [],
      total: 0,
    },
    timestamp: new Date().toISOString(),
  });
});

// 워크스페이스 생성
app.post('/', async (c) => {
  return c.json({
    success: true,
    data: {
      message: '워크스페이스 생성 API (구현 예정)',
    },
    timestamp: new Date().toISOString(),
  });
});

// 워크스페이스 상세
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  return c.json({
    success: true,
    data: {
      id,
      name: 'Sample Workspace',
      type: 'private',
      agents: [],
    },
    timestamp: new Date().toISOString(),
  });
});

// 워크스페이스에 에이전트 초대
app.post('/:id/agents', async (c) => {
  const id = c.req.param('id');
  
  return c.json({
    success: true,
    data: {
      workspaceId: id,
      message: '에이전트 초대 API (구현 예정)',
    },
    timestamp: new Date().toISOString(),
  });
});

export default app;
