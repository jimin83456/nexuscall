// ============================================
// API Key Scope Middleware
// ============================================

import type { D1Database } from '@cloudflare/workers-types';
import { errorResponse, jsonResponse, ApiErrors, StatusCodes } from './api-utils';

// Define available scopes
export const SCOPES = {
  AGENTS_READ: 'agents:read',
  AGENTS_WRITE: 'agents:write',
  ROOMS_READ: 'rooms:read',
  ROOMS_WRITE: 'rooms:write',
  MESSAGES_READ: 'messages:read',
  MESSAGES_WRITE: 'messages:write',
  ADMIN: 'admin',
} as const;

export type Scope = typeof SCOPES[keyof typeof SCOPES];

// Map endpoints to required scopes
const ENDPOINT_SCOPES: Record<string, Scope[]> = {
  // Agents
  'GET /api/v1/agents': [SCOPES.AGENTS_READ],
  'POST /api/v1/agents': [SCOPES.AGENTS_WRITE],
  'GET /api/v1/agents/:id': [SCOPES.AGENTS_READ],
  
  // Rooms
  'GET /api/v1/rooms': [SCOPES.ROOMS_READ],
  'POST /api/v1/rooms': [SCOPES.ROOMS_WRITE],
  'GET /api/v1/rooms/:id': [SCOPES.ROOMS_READ],
  'POST /api/v1/rooms/:id/join': [SCOPES.ROOMS_WRITE],
  'POST /api/v1/rooms/:id/leave': [SCOPES.ROOMS_WRITE],
  'GET /api/v1/rooms/:id/members': [SCOPES.ROOMS_READ],
  
  // Messages
  'GET /api/v1/rooms/:id/messages': [SCOPES.MESSAGES_READ],
  'POST /api/v1/rooms/:id/messages': [SCOPES.MESSAGES_WRITE],
};

interface ApiKeyData {
  id: string;
  scopes: Scope[];
  is_active: number;
}

/**
 * Validate API key and check scopes
 */
export async function validateApiKey(
  db: D1Database,
  apiKey: string,
  requiredScopes: Scope[]
): Promise<{ valid: boolean; data?: ApiKeyData; error?: string }> {
  try {
    // Query database for API key
    const result = await db
      .prepare('SELECT id, scopes, is_active FROM api_keys WHERE key = ?')
      .bind(apiKey)
      .first<ApiKeyData>();
    
    if (!result) {
      return { valid: false, error: 'Invalid API key' };
    }
    
    if (!result.is_active) {
      return { valid: false, error: 'API key is deactivated' };
    }
    
    // Parse scopes (stored as JSON string)
    const scopes: Scope[] = typeof result.scopes === 'string' 
      ? JSON.parse(result.scopes) 
      : result.scopes;
    
    // Check if key has admin scope (admin bypasses all checks)
    if (scopes.includes(SCOPES.ADMIN)) {
      return { valid: true, data: { ...result, scopes } };
    }
    
    // Check if key has required scopes
    const hasRequiredScopes = requiredScopes.every(scope => scopes.includes(scope));
    if (!hasRequiredScopes) {
      return { 
        valid: false, 
        error: `Insufficient permissions. Required: ${requiredScopes.join(', ')}` 
      };
    }
    
    return { valid: true, data: { ...result, scopes } };
  } catch (error) {
    console.error('API key validation error:', error);
    return { valid: false, error: 'Failed to validate API key' };
  }
}

/**
 * Get required scopes for endpoint
 */
export function getRequiredScopes(method: string, path: string): Scope[] {
  // Normalize path (remove IDs)
  const normalizedPath = path.replace(/\/[a-f0-9-]+/g, '/:id');
  const key = `${method} ${normalizedPath}`;
  
  return ENDPOINT_SCOPES[key] || [SCOPES.ADMIN];  // Default to admin for unknown endpoints
}

/**
 * Authentication middleware
 */
export function withAuth(
  handler: (request: Request, env: any, ctx: any) => Promise<Response>,
  requiredScopes?: Scope[]
) {
  return async (request: Request, env: any, ctx: any): Promise<Response> => {
    // Get API key from header
    const apiKey = request.headers.get('X-API-Key');
    
    if (!apiKey) {
      return jsonResponse(
        errorResponse(ApiErrors.UNAUTHORIZED, 'X-API-Key header required'),
        StatusCodes[ApiErrors.UNAUTHORIZED]
      );
    }
    
    // Determine required scopes
    const url = new URL(request.url);
    const scopes = requiredScopes || getRequiredScopes(request.method, url.pathname);
    
    // Validate API key
    const result = await validateApiKey(env.DB, apiKey, scopes);
    
    if (!result.valid) {
      return jsonResponse(
        errorResponse(ApiErrors.FORBIDDEN, result.error || 'Access denied'),
        StatusCodes[ApiErrors.FORBIDDEN]
      );
    }
    
    // Add API key data to request context
    ctx.apiKey = result.data;
    
    return handler(request, env, ctx);
  };
}

/**
 * Create default scopes for new API key
 */
export function createDefaultScopes(): Scope[] {
  return [
    SCOPES.AGENTS_READ,
    SCOPES.AGENTS_WRITE,
    SCOPES.ROOMS_READ,
    SCOPES.ROOMS_WRITE,
    SCOPES.MESSAGES_READ,
    SCOPES.MESSAGES_WRITE,
  ];
}
