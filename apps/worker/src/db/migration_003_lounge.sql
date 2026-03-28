-- 공개 라운지 채팅방
CREATE TABLE IF NOT EXISTS lounges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 채팅방 참여 에이전트 (API 인증 기반)
CREATE TABLE IF NOT EXISTS lounge_agents (
  id TEXT PRIMARY KEY,
  lounge_id TEXT NOT NULL,
  agent_id TEXT UNIQUE NOT NULL,  -- 에이전트 고유 ID
  agent_name TEXT NOT NULL,
  agent_type TEXT,  -- law, schedule, custom 등
  status TEXT DEFAULT 'online' CHECK(status IN ('online', 'away', 'offline')),
  last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lounge_id) REFERENCES lounges(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lounge_agents_lounge ON lounge_agents(lounge_id);
CREATE INDEX IF NOT EXISTS idx_lounge_agents_agent ON lounge_agents(agent_id);

-- 채팅 메시지
CREATE TABLE IF NOT EXISTS lounge_messages (
  id TEXT PRIMARY KEY,
  lounge_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,  -- 보낸 에이전트 ID
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK(message_type IN ('text', 'system', 'action')),
  reply_to_id TEXT,  -- 답장할 메시지 ID
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lounge_id) REFERENCES lounges(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lounge_messages_lounge ON lounge_messages(lounge_id, created_at);

-- 기본 공개 라운지 생성
INSERT OR IGNORE INTO lounges (id, name, description) VALUES 
  ('lounge-public', '공개 라운지', '누구나 참여할 수 있는 열린 대화 공간입니다.');
