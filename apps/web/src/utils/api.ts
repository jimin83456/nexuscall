const API_BASE = '/api';

interface ApiError {
  code: string;
  message: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
}

export async function api<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return response.json();
}

// Types
interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
}

interface AuthResponse {
  user: User;
  token: string;
}

export interface Workspace {
  id: string;
  name: string;
  type: 'private' | 'public';
  owner_id: string;
  settings: string;
  created_at: string;
  updated_at: string;
  agents?: Agent[];
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  workspace_id: string;
  config: string;
  status: 'online' | 'offline' | 'busy' | 'error';
  created_at: string;
  updated_at: string;
}

interface AuditLog {
  id: string;
  workspace_id: string;
  agent_id: string;
  action: string;
  details: string;
  created_at: string;
}

// Auth API
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api<AuthResponse>('/auth/register', { method: 'POST', body: data }),
  
  login: (data: { email: string; password: string }) =>
    api<AuthResponse>('/auth/login', { method: 'POST', body: data }),
  
  me: () => api<User>('/auth/me'),
  
  logout: () => api('/auth/logout', { method: 'POST' }),
};

// Workspaces API
export const workspacesApi = {
  list: () => api<{ workspaces: Workspace[]; total: number }>('/workspaces'),
  
  get: (id: string) => api<Workspace>(`/workspaces/${id}`),
  
  create: (data: { name: string; type?: 'private' | 'public'; settings?: object }) =>
    api<Workspace>('/workspaces', { method: 'POST', body: data }),
  
  delete: (id: string) =>
    api<{ message: string }>(`/workspaces/${id}`, { method: 'DELETE' }),
  
  addAgent: (workspaceId: string, data: { name: string; type: string; config?: object }) =>
    api<Agent>(`/workspaces/${workspaceId}/agents`, { method: 'POST', body: data }),
};

// Agents API
export const agentsApi = {
  list: () => api<{ agents: Agent[]; total: number }>('/agents'),
  
  get: (id: string) => api<Agent>(`/agents/${id}`),
  
  updateStatus: (id: string, status: 'online' | 'offline' | 'busy' | 'error') =>
    api<{ id: string; status: string }>(`/agents/${id}/status`, { method: 'PATCH', body: { status } }),
  
  delete: (id: string) =>
    api<{ message: string }>(`/agents/${id}`, { method: 'DELETE' }),
};

// Audit Logs API
export const auditApi = {
  list: (params?: { workspace_id?: string; agent_id?: string; action?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.workspace_id) query.set('workspace_id', params.workspace_id);
    if (params?.agent_id) query.set('agent_id', params.agent_id);
    if (params?.action) query.set('action', params.action);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    
    return api<{ logs: AuditLog[]; total: number; limit: number; offset: number }>(`/audit?${query.toString()}`);
  },
  
  create: (data: { workspace_id: string; agent_id: string; action: string; details?: object }) =>
    api<AuditLog>('/audit', { method: 'POST', body: data }),
};
