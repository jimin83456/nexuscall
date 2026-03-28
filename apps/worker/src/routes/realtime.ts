import { Hono } from 'hono';
import type { Env } from '../index';
import { verifyJWT } from '../utils/auth';

const app = new Hono<{ Bindings: Env }>();

// WebSocket 연결 (Durable Objects)
app.get('/ws/:workspaceId', async (c) => {
  const workspaceId = c.req.param('workspaceId');
  const token = c.req.query('token');
  
  // 토큰 검증
  if (!token) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '토큰이 필요합니다.',
      },
      timestamp: new Date().toISOString(),
    }, 401);
  }
  
  try {
    const result = await verifyJWT(token, c.env);
    
    if (!result.valid || !result.payload) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '유효하지 않은 토큰입니다.',
        },
        timestamp: new Date().toISOString(),
      }, 401);
    }
    
    const userId = result.payload.id as string;
    const userName = (result.payload.name as string) || 'Anonymous';
    
    // 워크스페이스 소유자 확인
    const workspace = await c.env.DB.prepare(
      'SELECT id FROM workspaces WHERE id = ? AND owner_id = ?'
    ).bind(workspaceId, userId).first();
    
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
    
    // Durable Object ID 생성 (워크스페이스별 고유)
    const id = c.env.WORKSPACE_ROOM.idFromName(workspaceId);
    const stub = c.env.WORKSPACE_ROOM.get(id);
    
    // WebSocket 업그레이드 요청을 Durable Object로 전달
    const url = new URL(c.req.url);
    url.searchParams.set('userId', userId);
    url.searchParams.set('userName', userName);
    url.searchParams.set('workspaceId', workspaceId);
    
    return stub.fetch(new Request(url.toString(), {
      headers: c.req.raw.headers,
    }));
  } catch (err) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '유효하지 않은 토큰입니다.',
      },
      timestamp: new Date().toISOString(),
    }, 401);
  }
});

// 메시지 히스토리 조회
app.get('/history/:workspaceId', async (c) => {
  const workspaceId = c.req.param('workspaceId');
  const token = c.req.query('token');
  
  if (!token) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '토큰이 필요합니다.',
      },
      timestamp: new Date().toISOString(),
    }, 401);
  }
  
  try {
    const result = await verifyJWT(token, c.env);
    
    if (!result.valid || !result.payload) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '유효하지 않은 토큰입니다.',
        },
        timestamp: new Date().toISOString(),
      }, 401);
    }
    
    const userId = result.payload.id as string;
    
    // 워크스페이스 소유자 확인
    const workspace = await c.env.DB.prepare(
      'SELECT id FROM workspaces WHERE id = ? AND owner_id = ?'
    ).bind(workspaceId, userId).first();
    
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
    
    // Durable Object에서 히스토리 조회
    const id = c.env.WORKSPACE_ROOM.idFromName(workspaceId);
    const stub = c.env.WORKSPACE_ROOM.get(id);
    
    const response = await stub.fetch(
      new Request(`https://internal/messages`)
    );
    
    const data = await response.json();
    
    return c.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

export default app;
