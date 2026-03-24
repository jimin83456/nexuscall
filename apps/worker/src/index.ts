import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

// 라우트
import agentRoutes from './routes/agents';
import workspaceRoutes from './routes/workspaces';
import auditRoutes from './routes/audit';
import healthRoutes from './routes/health';

// 타입 정의
export type Env = {
  DB: D1Database;
  CACHE: KVNamespace;
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Env }>();

// 미들웨어
app.use('*', logger());
app.use('*', cors());
app.use('*', prettyJSON());

// 라우트
app.route('/health', healthRoutes);
app.route('/api/agents', agentRoutes);
app.route('/api/workspaces', workspaceRoutes);
app.route('/api/audit', auditRoutes);

// 404 처리
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '요청하신 리소스를 찾을 수 없습니다.',
      },
      timestamp: new Date().toISOString(),
    },
    404
  );
});

// 에러 처리
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message,
      },
      timestamp: new Date().toISOString(),
    },
    500
  );
});

export default app;
