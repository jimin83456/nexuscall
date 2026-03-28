import { Hono } from 'hono';
import type { Env } from '../index';
import { encryptApiKey, decryptApiKey, validateApiKey } from '../utils/encryption';
import { verifyJWT } from '../utils/auth';

const app = new Hono<{ Bindings: Env }>();

// API 키 목록 조회 (복호화된 키는 마스킹)
app.get('/', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }, 401);
  }

  const result = await verifyJWT(authHeader.substring(7), c.env);
  if (!result.valid || !result.payload) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' } }, 401);
  }

  const userId = result.payload.id as string;
  const { results } = await c.env.DB.prepare(
    'SELECT id, provider, label, is_default, created_at, updated_at FROM user_api_keys WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all();

  return c.json({
    success: true,
    data: { keys: results },
    timestamp: new Date().toISOString(),
  });
});

// API 키 등록
app.post('/', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }, 401);
  }

  const result = await verifyJWT(authHeader.substring(7), c.env);
  if (!result.valid || !result.payload) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' } }, 401);
  }

  const userId = result.payload.id as string;
  const body = await c.req.json();
  const { provider, apiKey, label, isDefault } = body;

  // 필수 필드 확인
  if (!provider || !apiKey) {
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'provider와 apiKey는 필수입니다.' },
      timestamp: new Date().toISOString(),
    }, 400);
  }

  // API 키 형식 검증
  if (!validateApiKey(provider, apiKey)) {
    return c.json({
      success: false,
      error: { code: 'INVALID_API_KEY', message: `${provider} API 키 형식이 올바르지 않습니다.` },
      timestamp: new Date().toISOString(),
    }, 400);
  }

  // 지원하는 provider 확인
  const supportedProviders = ['openai', 'anthropic', 'groq', 'google'];
  if (!supportedProviders.includes(provider)) {
    return c.json({
      success: false,
      error: { code: 'UNSUPPORTED_PROVIDER', message: `지원하지 않는 provider입니다. (${supportedProviders.join(', ')})` },
      timestamp: new Date().toISOString(),
    }, 400);
  }

  // 이미 등록된 키가 있는지 확인
  const existing = await c.env.DB.prepare(
    'SELECT id FROM user_api_keys WHERE user_id = ? AND provider = ?'
  ).bind(userId, provider).first();

  if (existing) {
    return c.json({
      success: false,
      error: { code: 'ALREADY_EXISTS', message: `${provider} API 키가 이미 등록되어 있습니다. 삭제 후 재등록하세요.` },
      timestamp: new Date().toISOString(),
    }, 409);
  }

  // API 키 암호화
  const masterSecret = c.env.ENCRYPTION_SECRET || c.env.JWT_SECRET || 'default-secret-change-me';
  const encrypted = await encryptApiKey(apiKey, masterSecret);

  // 기본 키 처리
  if (isDefault) {
    await c.env.DB.prepare(
      'UPDATE user_api_keys SET is_default = 0 WHERE user_id = ?'
    ).bind(userId).run();
  }

  // DB에 저장
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO user_api_keys (id, user_id, provider, api_key_encrypted, label, is_default) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, provider, encrypted, label || null, isDefault ? 1 : 0).run();

  return c.json({
    success: true,
    data: {
      id,
      provider,
      label,
      isDefault: isDefault || false,
    },
    timestamp: new Date().toISOString(),
  });
});

// API 키 삭제
app.delete('/:id', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }, 401);
  }

  const result = await verifyJWT(authHeader.substring(7), c.env);
  if (!result.valid || !result.payload) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' } }, 401);
  }

  const userId = result.payload.id as string;
  const keyId = c.req.param('id');

  // 소유자 확인 후 삭제
  await c.env.DB.prepare(
    'DELETE FROM user_api_keys WHERE id = ? AND user_id = ?'
  ).bind(keyId, userId).run();

  return c.json({
    success: true,
    data: { message: 'API 키가 삭제되었습니다.' },
    timestamp: new Date().toISOString(),
  });
});

// 복호화된 API 키 조회 (에이전트 실행 시 내부용)
// 이 엔드포인트는 agent-execute.ts에서만 호출해야 함
export async function getUserApiKey(
  db: D1Database,
  userId: string,
  provider: string,
  masterSecret: string
): Promise<string | null> {
  // 먼저 기본 키 확인
  let row = await db.prepare(
    'SELECT api_key_encrypted FROM user_api_keys WHERE user_id = ? AND provider = ? AND is_default = 1'
  ).bind(userId, provider).first() as any;

  // 기본 키가 없으면 첫 번째 키 사용
  if (!row) {
    row = await db.prepare(
      'SELECT api_key_encrypted FROM user_api_keys WHERE user_id = ? AND provider = ? LIMIT 1'
    ).bind(userId, provider).first() as any;
  }

  if (!row) return null;

  return decryptApiKey(row.api_key_encrypted, masterSecret);
}

export default app;
