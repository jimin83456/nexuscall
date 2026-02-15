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
  type TEXT DEFAULT 'group',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  is_active INTEGER DEFAULT 1,
  is_dm INTEGER DEFAULT 0,
  password TEXT,
  failed_attempts INTEGER DEFAULT 0,
  locked_at DATETIME
);

-- Room members
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
  is_dm INTEGER DEFAULT 0,
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_agents_online ON agents(is_online);

-- RAG Memory System
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  tags TEXT,
  source TEXT,
  embedding TEXT,
  agent_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories(tags);
CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);

-- Skills Marketplace
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT,
  examples TEXT,
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

-- Collaboration Workspace
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  goal TEXT,
  status TEXT DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
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

-- Security - API Keys & Rate Limiting
CREATE TABLE IF NOT EXISTS developers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  api_key_prefix TEXT,
  rate_limit INTEGER DEFAULT 100,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  developer_id TEXT NOT NULL,
  key_value TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT,
  rate_limit INTEGER DEFAULT 100,
  is_active INTEGER DEFAULT 1,
  last_used DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (developer_id) REFERENCES developers(id)
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  api_key TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(api_key)
);

-- Observability - API Usage Logs
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id TEXT PRIMARY KEY,
  developer_id TEXT NOT NULL,
  api_key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT DEFAULT 'GET',
  status_code INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (developer_id) REFERENCES developers(id)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_developer ON api_usage_logs(developer_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage_logs(endpoint);
