import { Hono } from 'hono';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// 감사 로그 조회
app.get('/', async (c) => {
  return c.json({
    success: true,
    data: {
      logs: [],
      total: 0,
    },
    timestamp: new Date().toISOString(),
  });
});

// 감사 로그 생성 (내부용)
app.post('/', async (c) => {
  return c.json({
    success: true,
    data: {
      message: '감사 로그 생성 API (구현 예정)',
    },
    timestamp: new Date().toISOString(),
  });
});

export default app;
