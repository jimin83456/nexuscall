import { Hono } from 'hono';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// 에이전트 목록
app.get('/', async (c) => {
  // TODO: DB에서 에이전트 목록 조회
  return c.json({
    success: true,
    data: {
      agents: [],
      total: 0,
    },
    timestamp: new Date().toISOString(),
  });
});

// 에이전트 생성
app.post('/', async (c) => {
  // TODO: 에이전트 생성 로직
  return c.json({
    success: true,
    data: {
      message: '에이전트 생성 API (구현 예정)',
    },
    timestamp: new Date().toISOString(),
  });
});

// 에이전트 상세
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  return c.json({
    success: true,
    data: {
      id,
      name: 'Sample Agent',
      type: 'law',
      status: 'online',
    },
    timestamp: new Date().toISOString(),
  });
});

// 에이전트 상태 업데이트
app.patch('/:id/status', async (c) => {
  const id = c.req.param('id');
  
  return c.json({
    success: true,
    data: {
      id,
      message: '상태 업데이트 API (구현 예정)',
    },
    timestamp: new Date().toISOString(),
  });
});

export default app;
