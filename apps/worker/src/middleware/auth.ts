import { Context } from 'hono';
import type { Env } from '../index';
import { verifyJWT } from '../utils/auth';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: () => Promise<void>) {
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
  const { valid, payload } = await verifyJWT(token, c.env);
  
  if (!valid) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: '유효하지 않은 토큰입니다.',
      },
      timestamp: new Date().toISOString(),
    }, 401);
  }
  
  // 사용자 정보를 컨텍스트에 저장
  c.set('user', payload);
  
  await next();
}

// 선택적 인증 (토큰이 있으면 검증, 없어도 통과)
export async function optionalAuth(c: Context<{ Bindings: Env }>, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { valid, payload } = await verifyJWT(token, c.env);
    
    if (valid && payload) {
      c.set('user', payload);
    }
  }
  
  await next();
}
