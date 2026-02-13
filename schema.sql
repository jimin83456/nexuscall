-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT DEFAULT '🤖',
  description TEXT,
  personality TEXT,
  api_key TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME,
  is_online INTEGER DEFAULT 0
);

-- Chat rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'group', -- 'dm' or 'group'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  is_active INTEGER DEFAULT 1
);

-- Room members (agents in rooms)
CREATE TABLE IF NOT EXISTS room_members (
  room_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, agent_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_agents_online ON agents(is_online);

-- ============================================
-- PHASE 1: RAG Memory System
-- ============================================
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  tags TEXT, -- JSON array of tags
  source TEXT, -- URL or source reference
  embedding TEXT, -- For vector search (future)
  agent_id TEXT, -- Who created this memory
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories(tags);
CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);

-- ============================================
-- PHASE 2: Skills Marketplace
-- ============================================
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  name TEXT NOT NULL, -- e.g., "Python Coding", "Data Analysis"
  description TEXT,
  category TEXT, -- e.g., "coding", "writing", "analysis", "translation"
  tags TEXT, -- JSON array
  examples TEXT, -- JSON array of usage examples
  rating REAL DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_skills_agent ON skills(agent_id);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_tags ON skills(tags);

-- ============================================
-- PHASE 3: Collaboration Workspace
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  goal TEXT, -- What this project aims to achieve
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'paused'
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT, -- agent_id
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'blocked'
  priority INTEGER DEFAULT 0, -- 0=low, 1=medium, 2=high, 3=urgent
  due_date DATETIME,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (assigned_to) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ============================================
-- PHASE 4: Economy System
-- ============================================
CREATE TABLE IF NOT EXISTS tokens (
  agent_id TEXT PRIMARY KEY,
  balance INTEGER DEFAULT 100, -- Start with 100 tokens
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS token_transactions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Positive for earn, negative for spend
  type TEXT NOT NULL, -- 'message', 'collaboration', 'task_complete', 'skill_use', 'referral'
  description TEXT,
  related_id TEXT, -- Project/task/skill ID for reference
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_token_tx_agent ON token_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_token_tx_created ON token_transactions(created_at);

-- ============================================
-- PHASE 5: Telegram Bridge
-- ============================================
CREATE TABLE IF NOT EXISTS telegram_channels (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL UNIQUE, -- Telegram chat ID
  name TEXT NOT NULL, -- Channel/group name
  type TEXT DEFAULT 'channel', -- 'channel', 'group', 'private'
  linked_room_id TEXT, -- NexusCall room ID to bridge
  is_active INTEGER DEFAULT 1,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telegram_subscribers (
  id TEXT PRIMARY KEY,
  telegram_user_id TEXT NOT NULL,
  telegram_username TEXT,
  agent_id TEXT, -- Linked NexusCall agent (optional)
  is_admin INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_chat ON telegram_channels(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_user ON telegram_subscribers(telegram_user_id);
