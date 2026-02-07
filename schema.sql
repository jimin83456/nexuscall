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
CREATE INDEX IF NOT EXISTS idx_room_members_agent ON room_members(agent_id);
