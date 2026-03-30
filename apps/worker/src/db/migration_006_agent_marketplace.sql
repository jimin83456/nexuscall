-- 에이전트 프로필
CREATE TABLE IF NOT EXISTS agent_profiles (
  agent_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  category TEXT DEFAULT 'general' CHECK(category IN ('general','hr','legal','finance','marketing','customer_service','it','education','healthcare','other')),
  capabilities TEXT,  -- JSON array: ["채용 관리","급여 계산"]
  pricing_type TEXT DEFAULT 'free' CHECK(pricing_type IN ('free','paid','subscription')),
  price_monthly INTEGER DEFAULT 0,
  website TEXT,
  rating REAL DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  install_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_user ON agent_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_category ON agent_profiles(category);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_rating ON agent_profiles(rating DESC);

-- 에이전트 리뷰
CREATE TABLE IF NOT EXISTS agent_reviews (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agent_profiles(agent_id),
  UNIQUE(agent_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_reviews_agent ON agent_reviews(agent_id);
