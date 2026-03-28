import { Hono } from 'hono';
import type { Env } from '../index';
import { hashPassword, verifyPassword, generateJWT, verifyJWT } from '../utils/auth';

const app = new Hono<{ Bindings: Env }>();

// 비밀번호 복잡도 검증
function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: '비밀번호는 8자 이상이어야 합니다.' };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, message: '비밀번호에 영문자가 포함되어야 합니다.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '비밀번호에 숫자가 포함되어야 합니다.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: '비밀번호에 특수문자가 포함되어야 합니다.' };
  }
  return { valid: true, message: '' };
}

// 이메일 형식 검증
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Rate limiting (KV 기반)
async function checkRateLimit(c: any, key: string, maxAttempts: number = 5, windowSec: number = 300): Promise<{ allowed: boolean; remaining: number }> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowSec)}`;
  
  const current = await c.env.CACHE.get(windowKey);
  const attempts = current ? parseInt(current) : 0;
  
  if (attempts >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }
  
  await c.env.CACHE.put(windowKey, String(attempts + 1), { expirationTtl: windowSec });
  return { allowed: true, remaining: maxAttempts - attempts - 1 };
}

// 회원가입
app.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { email, name, password } = body;
    
    // 필수 필드 확인
    if (!email || !name || !password) {
      return c.json({
        success: false,
        error: { code: 'BAD_REQUEST', message: '이메일, 이름, 비밀번호는 필수입니다.' },
        timestamp: new Date().toISOString(),
      }, 400);
    }
    
    // 이메일 형식 검증
    if (!validateEmail(email)) {
      return c.json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: '올바른 이메일 형식이 아닙니다.' },
        timestamp: new Date().toISOString(),
      }, 400);
    }
    
    // 비밀번호 복잡도 검증
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return c.json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: pwCheck.message },
        timestamp: new Date().toISOString(),
      }, 400);
    }
    
    // Rate limiting
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const rateLimit = await checkRateLimit(c, `register:${ip}`, 3, 600);
    if (!rateLimit.allowed) {
      return c.json({
        success: false,
        error: { code: 'RATE_LIMITED', message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
        timestamp: new Date().toISOString(),
      }, 429);
    }
    
    // 이메일 중복 확인
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (existingUser) {
      return c.json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: '이미 등록된 이메일입니다.' },
        timestamp: new Date().toISOString(),
      }, 400);
    }
    
    // 비밀번호 해시
    const { hash, salt } = await hashPassword(password);
    const passwordHash = `${hash}:${salt}`;
    
    // 사용자 생성
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT INTO users (id, email, name, password_hash, plan) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, email, name, passwordHash, 'free').run();
    
    // JWT 토큰 생성
    const token = await generateJWT({ id, email, name }, c.env);
    
    return c.json({
      success: true,
      data: { user: { id, email, name, plan: 'free' }, token },
      timestamp: new Date().toISOString(),
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '회원가입 중 오류가 발생했습니다.' },
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

// 로그인
app.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return c.json({
        success: false,
        error: { code: 'BAD_REQUEST', message: '이메일과 비밀번호는 필수입니다.' },
        timestamp: new Date().toISOString(),
      }, 400);
    }
    
    // Rate limiting
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const rateLimit = await checkRateLimit(c, `login:${email}`, 5, 300);
    if (!rateLimit.allowed) {
      return c.json({
        success: false,
        error: { code: 'RATE_LIMITED', message: '너무 많은 로그인 시도입니다. 5분 후 다시 시도해주세요.' },
        timestamp: new Date().toISOString(),
      }, 429);
    }
    
    // 사용자 조회
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first() as any;
    
    if (!user) {
      return c.json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        timestamp: new Date().toISOString(),
      }, 401);
    }
    
    // 비밀번호 검증
    const [hash, salt] = user.password_hash.split(':');
    const isValid = await verifyPassword(password, hash, salt);
    
    if (!isValid) {
      return c.json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        timestamp: new Date().toISOString(),
      }, 401);
    }
    
    // JWT 토큰 생성
    const token = await generateJWT({ id: user.id, email: user.email, name: user.name }, c.env);
    
    return c.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
        token,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '로그인 중 오류가 발생했습니다.' },
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

// 현재 사용자 조회
app.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' },
      timestamp: new Date().toISOString(),
    }, 401);
  }
  
  const { valid, payload } = await verifyJWT(authHeader.substring(7), c.env);
  if (!valid || !payload) {
    return c.json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: '유효하지 않은 토큰입니다.' },
      timestamp: new Date().toISOString(),
    }, 401);
  }
  
  const user = await c.env.DB.prepare(
    'SELECT id, email, name, plan, created_at FROM users WHERE id = ?'
  ).bind(payload.id as string).first();
  
  if (!user) {
    return c.json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.' },
      timestamp: new Date().toISOString(),
    }, 404);
  }
  
  return c.json({ success: true, data: user, timestamp: new Date().toISOString() });
});

// 로그아웃
app.post('/logout', async (c) => {
  return c.json({
    success: true,
    data: { message: '로그아웃되었습니다.' },
    timestamp: new Date().toISOString(),
  });
});

export default app;
