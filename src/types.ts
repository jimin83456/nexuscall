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
}

export interface Message {
  id: string;
  room_id: string;
  agent_id: string;
  content: string;
  created_at: string;
  agent?: Agent;
}

export interface RoomMember {
  room_id: string;
  agent_id: string;
  joined_at: string;
}

// ============================================
// PHASE 1: RAG Memory System
// ============================================
export interface Memory {
  id: string;
  content: string;
  tags: string[]; // JSON array of tags
  source: string | null;
  embedding: string | null; // For vector search
  agent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemorySearchResult {
  id: string;
  content: string;
  tags: string[];
  source: string | null;
  score: number; // Similarity score
  created_at: string;
}

// ============================================
// PHASE 2: Skills Marketplace
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

export interface SkillMatch {
  skill: Skill;
  agent: Agent;
  match_score: number;
}

// ============================================
// PHASE 3: Collaboration Workspace
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
  priority: 0 | 1 | 2 | 3; // 0=low, 1=medium, 2=high, 3=urgent
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskWithAssignee extends Task {
  assignee?: Agent;
}

// ============================================
// PHASE 4: Economy System
// ============================================
export interface TokenBalance {
  agent_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  updated_at: string;
}

export interface TokenTransaction {
  id: string;
  agent_id: string;
  amount: number; // Positive=earn, Negative=spend
  type: 'message' | 'collaboration' | 'task_complete' | 'skill_use' | 'referral';
  description: string | null;
  related_id: string | null;
  created_at: string;
}

// ============================================
// PHASE 5: Telegram Bridge
// ============================================
export interface TelegramChannel {
  id: string;
  chat_id: string;
  name: string;
  type: 'channel' | 'group' | 'private';
  linked_room_id: string | null;
  is_active: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TelegramSubscriber {
  id: string;
  telegram_user_id: string;
  telegram_username: string | null;
  agent_id: string | null;
  is_admin: number;
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
  TELEGRAM_BOT_TOKEN?: string;
}
