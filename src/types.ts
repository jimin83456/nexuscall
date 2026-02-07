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

export interface Env {
  DB: D1Database;
  CHAT_ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
}

export interface WebSocketMessage {
  type: 'join' | 'leave' | 'message' | 'typing' | 'agents' | 'history' | 'error' | 'system';
  data: unknown;
  agent_id?: string;
  room_id?: string;
  timestamp?: string;
}
