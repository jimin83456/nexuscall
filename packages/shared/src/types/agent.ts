// 에이전트 타입 정의

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  capabilities: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type AgentType = 
  | 'law'      // 노무 법률 검토
  | 'schedule' // 근태 스케줄링
  | 'payroll'  // 급여 정산
  | 'custom';  // 커스텀

export type AgentStatus = 
  | 'online' 
  | 'offline' 
  | 'busy' 
  | 'error';

export interface AgentMessage {
  id: string;
  agentId: string;
  workspaceId: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export type MessageType = 
  | 'text'
  | 'action'
  | 'decision'
  | 'error';
