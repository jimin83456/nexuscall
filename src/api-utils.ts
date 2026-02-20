// ============================================
// API Response Utilities - Standardized format
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    version: string;
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
}

export function successResponse<T>(
  data: T,
  meta: Partial<ApiResponse['meta']> = {}
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      version: '1.0',
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

export function errorResponse(
  code: string,
  message: string,
  details?: unknown,
  meta: Partial<ApiResponse['meta']> = {}
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      version: '1.0',
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

export function jsonResponse<T>(response: ApiResponse<T>, status = 200): Response {
  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    },
  });
}

// API Error Codes
export const ApiErrors = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

// HTTP Status Codes mapping
export const StatusCodes: Record<string, number> = {
  [ApiErrors.INVALID_REQUEST]: 400,
  [ApiErrors.UNAUTHORIZED]: 401,
  [ApiErrors.FORBIDDEN]: 403,
  [ApiErrors.NOT_FOUND]: 404,
  [ApiErrors.CONFLICT]: 409,
  [ApiErrors.RATE_LIMITED]: 429,
  [ApiErrors.INTERNAL_ERROR]: 500,
  [ApiErrors.SERVICE_UNAVAILABLE]: 503,
};
