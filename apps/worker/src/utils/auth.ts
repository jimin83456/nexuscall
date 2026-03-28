// 인증 유틸리티
// Cloudflare Workers에서 사용 가능한 Web Crypto API 기반

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// 비밀번호 해시 (PBKDF2)
export async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = salt ? hexToBytes(salt) : crypto.getRandomValues(new Uint8Array(16));
  const passwordBytes = encoder.encode(password);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  
  return {
    hash: bytesToHex(new Uint8Array(derivedBits)),
    salt: bytesToHex(saltBytes),
  };
}

// 비밀번호 검증
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string
): Promise<boolean> {
  const { hash: newHash } = await hashPassword(password, salt);
  return hash === newHash;
}

// JWT 시크릿 (환경 변수에서 가져옴)
function getJWTSecret(env: { JWT_SECRET?: string }): string {
  return env.JWT_SECRET || 'nexuscall-default-secret-change-in-production';
}

// JWT 토큰 생성
export async function generateJWT(
  payload: Record<string, unknown>,
  env: { JWT_SECRET?: string },
  expiresIn: number = 86400 // 24시간
): Promise<string> {
  const secret = getJWTSecret(env);
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const data = { ...payload, iat: now, exp: now + expiresIn };
  
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(data));
  const message = `${headerB64}.${payloadB64}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );
  
  const signatureB64 = base64UrlEncode(signature);
  return `${message}.${signatureB64}`;
}

// JWT 토큰 검증
export async function verifyJWT(
  token: string,
  env: { JWT_SECRET?: string }
): Promise<{ valid: boolean; payload?: Record<string, unknown> }> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false };
    }
    
    const [headerB64, payloadB64, signatureB64] = parts;
    const message = `${headerB64}.${payloadB64}`;
    
    const secret = getJWTSecret(env);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signature = base64UrlDecode(signatureB64);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(message)
    );
    
    if (!isValid) {
      return { valid: false };
    }
    
    const payload = JSON.parse(decoder.decode(base64UrlDecode(payloadB64)));
    
    // 만료 확인
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false };
    }
    
    return { valid: true, payload };
  } catch (error) {
    return { valid: false };
  }
}

// 유틸리티 함수
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function base64UrlEncode(data: string | ArrayBuffer): string {
  const bytes = typeof data === 'string' ? encoder.encode(data) : new Uint8Array(data);
  const binString = Array.from(bytes, byte => String.fromCodePoint(byte)).join('');
  return btoa(binString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const binString = atob(base64);
  return Uint8Array.from(binString, char => char.codePointAt(0) as number);
}
