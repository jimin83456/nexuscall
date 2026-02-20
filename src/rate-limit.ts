// ============================================
// Rate Limiting Middleware
// ============================================

import type { KVNamespace } from '@cloudflare/workers-types';
import { errorResponse, jsonResponse, ApiErrors, StatusCodes } from './api-utils';

interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour?: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  requestsPerMinute: 60,  // 60 requests per minute
  requestsPerHour: 1000,  // 1000 requests per hour
};

/**
 * Check rate limit for API key
 * Uses KV storage with per-minute and per-hour windows
 */
export async function checkRateLimit(
  kv: KVNamespace,
  apiKey: string,
  endpoint: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  const minute = Math.floor(now / 60000);  // Current minute
  const hour = Math.floor(now / 3600000);  // Current hour
  
  // Per-minute limit
  const minuteKey = `ratelimit:${apiKey}:${endpoint}:min:${minute}`;
  const minuteCount = parseInt(await kv.get(minuteKey) || '0');
  
  if (minuteCount >= config.requestsPerMinute) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: (minute + 1) * 60000,
    };
  }
  
  // Per-hour limit
  if (config.requestsPerHour) {
    const hourKey = `ratelimit:${apiKey}:${endpoint}:hour:${hour}`;
    const hourCount = parseInt(await kv.get(hourKey) || '0');
    
    if (hourCount >= config.requestsPerHour) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: (hour + 1) * 3600000,
      };
    }
    
    // Increment hour counter
    await kv.put(hourKey, (hourCount + 1).toString(), { expirationTtl: 3600 });
  }
  
  // Increment minute counter
  await kv.put(minuteKey, (minuteCount + 1).toString(), { expirationTtl: 60 });
  
  return {
    allowed: true,
    remaining: config.requestsPerMinute - minuteCount - 1,
    resetTime: (minute + 1) * 60000,
  };
}

/**
 * Rate limiting middleware wrapper
 */
export function withRateLimit(
  handler: (request: Request, env: any, ctx: any) => Promise<Response>,
  config?: RateLimitConfig
) {
  return async (request: Request, env: any, ctx: any): Promise<Response> => {
    // Get API key from header or query
    const apiKey = request.headers.get('X-API-Key') || 
                   new URL(request.url).searchParams.get('api_key');
    
    if (!apiKey) {
      return jsonResponse(
        errorResponse(ApiErrors.UNAUTHORIZED, 'API key required'),
        StatusCodes[ApiErrors.UNAUTHORIZED]
      );
    }
    
    const endpoint = new URL(request.url).pathname;
    const result = await checkRateLimit(env.KV, apiKey, endpoint, config);
    
    if (!result.allowed) {
      return jsonResponse(
        errorResponse(
          ApiErrors.RATE_LIMITED,
          'Rate limit exceeded. Please try again later.',
          { resetTime: new Date(result.resetTime).toISOString() }
        ),
        StatusCodes[ApiErrors.RATE_LIMITED],
        {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetTime.toString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        }
      );
    }
    
    // Add rate limit headers to response
    const response = await handler(request, env, ctx);
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
    
    return response;
  };
}
