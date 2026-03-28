import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { serveStatic } from 'hono/cloudflare-workers';

// 라우트
import agentRoutes from './routes/agents';
import workspaceRoutes from './routes/workspaces';
import auditRoutes from './routes/audit';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';

// 타입 정의
export type Env = {
  DB: D1Database;
  CACHE: KVNamespace;
  __STATIC_CONTENT: Fetcher;
  ENVIRONMENT: string;
  JWT_SECRET?: string;
};

const app = new Hono<{ Bindings: Env }>();

// 미들웨어
app.use('*', logger());
app.use('*', cors());
app.use('*', prettyJSON());

// 정적 파일 서빙 (assets 폴더)
app.use('/assets/*', serveStatic({ root: './', manifest: {} }));
app.use('/favicon.svg', serveStatic({ path: './favicon.svg' }));

// API 라우트
app.route('/health', healthRoutes);
app.route('/api/auth', authRoutes);
app.route('/api/agents', agentRoutes);
app.route('/api/workspaces', workspaceRoutes);
app.route('/api/audit', auditRoutes);

// SPA fallback - index.html 반환
app.get('*', async (c) => {
  return c.env.__STATIC_CONTENT.fetch(
    new Request(new URL('/index.html', c.req.url))
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
