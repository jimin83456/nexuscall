// 에이전트 API 인증 (API Key 기반)
const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface AgentInfo {
  agentId: string;
  agentName: string;
  loungeId: string;
}

// 에이전트 토큰 생성 (HMAC-SHA256 서명)
export async function generateAgentToken(
  env: { JWT_SECRET?: string },
  agent: AgentInfo,
  expiresIn: number = 86400 // 24시간
): Promise<string> {
  const secret = env.JWT_SECRET || 'nexuscall-default-secret';
  const header = { alg: 'HS256', typ: 'agent-token' };
  const now = Math.floor(Date.now() / 1000);
  const data = {
    ...agent,
    iat: now,
    exp: now + expiresIn,
    // 에이전트 토큰 임의 식별자
    jti: crypto.randomUUID(),
  };

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

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const signatureB64 = base64UrlEncode(signature);

  return `${message}.${signatureB64}`;
}

// 에이전트 토큰 검증
export async function verifyAgentToken(
  env: { JWT_SECRET?: string },
  token: string
): Promise<AgentInfo | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const message = `${headerB64}.${payloadB64}`;
    const secret = env.JWT_SECRET || 'nexuscall-default-secret';

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = base64UrlDecode(signatureB64);
    const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(message));

    if (!isValid) return null;

    const payload = JSON.parse(decoder.decode(base64UrlDecode(payloadB64)));

    // 만료 확인
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    // 에이전트 토큰 타입 확인
    const header = JSON.parse(decoder.decode(base64UrlDecode(headerB64)));
    if (header.typ !== 'agent-token') return null;

    return {
      agentId: payload.agentId,
      agentName: payload.agentName,
      loungeId: payload.loungeId,
    };
  } catch {
    return null;
  }
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
