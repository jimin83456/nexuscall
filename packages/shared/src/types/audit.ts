// 감사 로그 타입 정의

export interface AuditLog {
  id: string;
  workspaceId: string;
  agentId: string;
  action: AuditAction;
  details: AuditDetails;
  timestamp: Date;
  ip?: string;
}

export type AuditAction = 
  | 'message_sent'
  | 'decision_made'
  | 'agent_joined'
  | 'agent_left'
  | 'workspace_created'
  | 'workspace_updated';

export interface AuditDetails {
  messageId?: string;
  decision?: string;
  agentName?: string;
  workspaceName?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilter {
  workspaceId?: string;
  agentId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}
