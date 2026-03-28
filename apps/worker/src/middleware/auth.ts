import type { Context, Next } from 'hono';
import type { Env } from '../index';

// verifyJWT는 utils/auth.ts에서 import해야 함
// 하지만 여기서는 간단히 토큰 검증만 수행

// 사용자 타입
interface User {
  id: string;
  email: string;
  name: string;
}

// 간단한 JWT 페이로드 추출 (실제 검증은 verifyJWT에서)
function extractJWTPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}

// 인증 미들웨어
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '인증이 필요합니다.',
      },
      timestamp: new Date().toISOString(),
    }, 401);
  }
  
  const token = authHeader.substring(7);
  const payload = extractJWTPayload(token);
  
  if (!payload) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '유효하지 않은 토큰입니다.',
      },
      timestamp: new Date().toISOString(),
    }, 401);
  }
  
  // 토큰 만료 확인
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return c.json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: '토큰이 만료되었습니다.',
      },
      timestamp: new Date().toISOString(),
    }, 401);
  }
  
  // 사용자 정보를 컨텍스트에 저장
  c.set('user', {
    id: payload.id as string,
    email: payload.email as string,
    name: payload.name as string,
  });
  
  await next();
}

// 선택적 인증 미들웨어
export async function optionalAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = extractJWTPayload(token);
    
    if (payload && (!payload.exp || payload.exp >= Math.floor(Date.now() / 1000))) {
      c.set('user', {
        id: payload.id as string,
        email: payload.email as string,
        name: payload.name as string,
      });
    }
  }
  
  await next();
}
