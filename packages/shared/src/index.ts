// 타입 익스포트
export * from './types/agent';
export * from './types/workspace';
export * from './types/audit';
export * from './types/api';

// 상수
export const AGENT_TYPES = {
  LAW: 'law',
  SCHEDULE: 'schedule',
  PAYROLL: 'payroll',
  CUSTOM: 'custom',
} as const;

export const WORKSPACE_TYPES = {
  PRIVATE: 'private',
  PUBLIC: 'public',
} as const;

export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: '무료',
    price: 0,
    maxWorkspaces: 1,
    maxAgents: 2,
    auditLogRetention: 7,
  },
  PRO: {
    name: '프로',
    price: 49000,
    maxWorkspaces: 5,
    maxAgents: 10,
    auditLogRetention: 90,
  },
  ENTERPRISE: {
    name: '엔터프라이즈',
    price: 200000,
    maxWorkspaces: Infinity,
    maxAgents: Infinity,
    auditLogRetention: Infinity,
  },
} as const;
