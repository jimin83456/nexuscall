import { Hono } from 'hono';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'healthy',
      version: '0.1.0',
      environment: c.env.ENVIRONMENT,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  });
});

export default app;
