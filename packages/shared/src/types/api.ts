// API 응답 타입 정의

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Date;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// WebSocket 메시지 타입
export interface WsMessage<T = unknown> {
  type: WsMessageType;
  payload: T;
  timestamp: Date;
}

export type WsMessageType = 
  | 'agent:message'
  | 'agent:status'
  | 'workspace:update'
  | 'audit:new'
  | 'error';
