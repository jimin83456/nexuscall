import { Hono } from 'hono';
import type { Env } from '../index';
import { hashPassword, verifyPassword, generateJWT, verifyJWT } from '../utils/auth';

const app = new Hono<{ Bindings: Env }>();

// 회원가입
app.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { email, name, password } = body;
    
    // 필수 필드 확인
    if (!email || !name || !password) {
      return c.json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: '이메일, 이름, 비밀번호는 필수입니다.',
        },
        timestamp: new Date().toISOString(),
      }, 400);
    }
    
    // 이메일 중복 확인
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (existingUser) {
      return c.json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: '이미 등록된 이메일입니다.',
        },
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
      data: {
        user: {
          id,
          email,
          name,
          plan: 'free',
        },
        token,
      },
      timestamp: new Date().toISOString(),
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '회원가입 중 오류가 발생했습니다.',
      },
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
        error: {
          code: 'BAD_REQUEST',
          message: '이메일과 비밀번호는 필수입니다.',
        },
        timestamp: new Date().toISOString(),
      }, 400);
    }
    
    // 사용자 조회
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first() as { id: string; email: string; name: string; password_hash: string; plan: string } | null;
    
    if (!user) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '이메일 또는 비밀번호가 올바르지 않습니다.',
        },
        timestamp: new Date().toISOString(),
      }, 401);
    }
    
    // 비밀번호 검증
    const [hash, salt] = user.password_hash.split(':');
    const isValid = await verifyPassword(password, hash, salt);
    
    if (!isValid) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '이메일 또는 비밀번호가 올바르지 않습니다.',
        },
        timestamp: new Date().toISOString(),
      }, 401);
    }
    
    // JWT 토큰 생성
    const token = await generateJWT({ id: user.id, email: user.email, name: user.name }, c.env);
    
    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
        },
        token,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '로그인 중 오류가 발생했습니다.',
      },
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

// 현재 사용자 조회 (인증 필요)
app.get('/me', async (c) => {
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
  
  if (!valid || !payload) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: '유효하지 않은 토큰입니다.',
      },
      timestamp: new Date().toISOString(),
    }, 401);
  }
  
  // 사용자 정보 조회
  const user = await c.env.DB.prepare(
    'SELECT id, email, name, plan, created_at FROM users WHERE id = ?'
  ).bind(payload.id as string).first();
  
  if (!user) {
    return c.json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.',
      },
      timestamp: new Date().toISOString(),
    }, 404);
  }
  
  return c.json({
    success: true,
    data: user,
    timestamp: new Date().toISOString(),
  });
});

// 로그아웃 (클라이언트에서 토큰 삭제)
app.post('/logout', async (c) => {
  return c.json({
    success: true,
    data: {
      message: '로그아웃되었습니다.',
    },
    timestamp: new Date().toISOString(),
  });
});

export default app;
