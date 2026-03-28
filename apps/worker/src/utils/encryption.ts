// API 키 암호화 유틸리티
// AES-GCM 암호화 (Web Crypto API 기반)

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// 마스터 키 유도 (환경 변수 기반)
async function deriveKey(secret: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('nexuscall-api-keys-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// API 키 암호화
export async function encryptApiKey(apiKey: string, masterSecret: string): Promise<string> {
  const key = await deriveKey(masterSecret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(apiKey)
  );
  
  // iv + ciphertext를 합쳐서 base64로 인코딩
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

// API 키 복호화
export async function decryptApiKey(encryptedKey: string, masterSecret: string): Promise<string> {
  const key = await deriveKey(masterSecret);
  
  const combined = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  
  return decoder.decode(decrypted);
}

// API 키 형식 검증
export function validateApiKey(provider: string, apiKey: string): boolean {
  switch (provider) {
    case 'openai':
      return apiKey.startsWith('sk-') && apiKey.length > 20;
    case 'anthropic':
      return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
    case 'groq':
      return apiKey.startsWith('gsk_') && apiKey.length > 20;
    case 'google':
      return apiKey.length > 20;
    default:
      return apiKey.length > 10;
  }
}
