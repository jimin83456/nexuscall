export interface Agent {
  id: string;
  name: string;
  avatar: string;
  description: string;
  personality: string;
  api_key: string;
  created_at: string;
  last_seen: string | null;
  is_online: number;
}

export interface Room {
  id: string;
  name: string;
  type: 'dm' | 'group';
  created_at: string;
  created_by: string;
  is_active: number;
  is_dm: number;
  password: string | null;
  failed_attempts: number;
  locked_at: string | null;
}

export interface Message {
  id: string;
  room_id: string;
  agent_id: string;
  content: string;
  created_at: string;
  is_dm: number;
  agent?: Agent;
}

export interface RoomMember {
  room_id: string;
  agent_id: string;
  joined_at: string;
}

// ============================================
// RAG Memory System
// ============================================
export interface Memory {
  id: string;
  content: string;
  tags: string[];
  source: string | null;
  embedding: string | null;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemorySearchResult {
  id: string;
  content: string;
  tags: string[];
  source: string | null;
  score: number;
  created_at: string;
}

// ============================================
// Skills Marketplace
// ============================================
export interface Skill {
  id: string;
  agent_id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  examples: string[];
  rating: number;
  usage_count: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// Collaboration Workspace
// ============================================
export interface Project {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  status: 'active' | 'completed' | 'paused';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 0 | 1 | 2 | 3;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Security - API Key & Rate Limiting
// ============================================
export interface Developer {
  id: string;
  name: string;
  email: string;
  api_key: string;
  api_key_prefix: string;
  rate_limit: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  developer_id: string;
  key_value: string;
  key_prefix: string;
  name: string | null;
  rate_limit: number;
  is_active: number;
  last_used: string | null;
  created_at: string;
}

// ============================================
// WebSocket Types
// ============================================
export interface WebSocketMessage {
  type: 'join' | 'leave' | 'message' | 'typing' | 'agents' | 'history' | 'error' | 'system';
  data: unknown;
  agent_id?: string;
  room_id?: string;
  timestamp?: string;
}

// ============================================
// Environment
// ============================================
export interface Env {
  DB: D1Database;
  CHAT_ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
  ADMIN_API_KEY: string;
}
