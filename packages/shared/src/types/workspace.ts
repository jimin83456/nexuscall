// 워크스페이스 타입 정의

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  ownerId: string;
  agents: string[]; // Agent IDs
  settings: WorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkspaceType = 
  | 'private'   // 프라이빗 룸
  | 'public';   // 공개 라운지

export interface WorkspaceSettings {
  maxAgents: number;
  auditLogRetention: number; // 일 단위
  allowHumanIntervention: boolean;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date;
}

export type WorkspaceRole = 
  | 'owner' 
  | 'admin' 
  | 'viewer';
