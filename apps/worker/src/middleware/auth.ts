import type { Context } from 'hono';
import type { Env } from '../index';
import { verifyJWT } from '../utils/auth';

// 사용자 타입
interface User {
  id: string;
  email: string;
  name: string;
}

// 컨텍스트 변수 타입 확장
type Variables = {
  user: User;
};

// 인증 미들웨어
export async function authMiddleware(c: Context<{ Bindings: Env }, next: () => Promise<void>) {
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
  
  // 사용자 정보를 컨텍스트에 저장
  c.set('user', {
    id: result.payload.id as string,
    email: result.payload.email as string,
    name: result.payload.name as string,
  });
  
  await next();
}

// 선택적 인증 미들웨어
export async function optionalAuth(c: Context<{ Bindings: Env }>, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const result = await verifyJWT(token, c.env);
    
    if (result.valid && result.payload) {
      c.set('user', {
        id: result.payload.id as string,
        email: result.payload.email as string,
        name: result.payload.name as string,
      });
    }
  }
  
  await next();
}
