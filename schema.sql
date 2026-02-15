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

-- ============================================
-- Phase 1: MCP Tool Registry
-- ============================================

CREATE TABLE IF NOT EXISTS mcp_tools (
  id TEXT PRIMARY KEY,                    -- tool_<nanoid>
  agent_id TEXT NOT NULL,                 -- FK to agents table
  name TEXT NOT NULL,                     -- ^[a-z0-9_]+$ , 1-64 chars
  description TEXT,                       -- 1-500 chars
  version TEXT DEFAULT '1.0.0',           -- semver
  input_schema TEXT NOT NULL,             -- JSON Schema string
  output_schema TEXT,                     -- JSON Schema string
  tags TEXT,                              -- JSON array as string
  endpoint TEXT NOT NULL,                 -- Agent's tool endpoint URL
  auth_type TEXT DEFAULT 'bearer',        -- bearer | api_key | none
  auth_config_encrypted TEXT,             -- 암호화된 인증 설정
  rate_limit_per_min INTEGER DEFAULT 60,
  pricing_model TEXT DEFAULT 'free',      -- free | per_call | subscription
  price_usd REAL DEFAULT 0,
  status TEXT DEFAULT 'active',           -- active | inactive | deprecated
  call_count INTEGER DEFAULT 0,
  avg_latency_ms REAL DEFAULT 0,
  success_rate REAL DEFAULT 1.0,
  deprecated_at TEXT,
  sunset_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  UNIQUE(agent_id, name, version)
);

CREATE TABLE IF NOT EXISTS mcp_tool_tags (
  tool_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (tool_id, tag),
  FOREIGN KEY (tool_id) REFERENCES mcp_tools(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mcp_tools_agent ON mcp_tools(agent_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tools_status ON mcp_tools(status);
CREATE INDEX IF NOT EXISTS idx_mcp_tools_name ON mcp_tools(name);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_tags_tag ON mcp_tool_tags(tag);

-- ============================================
-- Phase 2: MCP Relay/Proxy - Invocations
-- ============================================

CREATE TABLE IF NOT EXISTS mcp_invocations (
  id TEXT PRIMARY KEY,                    -- inv_<nanoid>
  tool_id TEXT NOT NULL,
  caller_agent_id TEXT NOT NULL,
  provider_agent_id TEXT NOT NULL,
  input TEXT NOT NULL,                    -- JSON
  output TEXT,                            -- JSON
  status TEXT DEFAULT 'pending',          -- pending | running | success | error | timeout
  error_code TEXT,
  error_message TEXT,
  latency_ms INTEGER,
  is_async INTEGER DEFAULT 0,
  callback_url TEXT,
  retry_count INTEGER DEFAULT 0,
  trace_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (tool_id) REFERENCES mcp_tools(id),
  FOREIGN KEY (caller_agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_inv_tool ON mcp_invocations(tool_id);
CREATE INDEX IF NOT EXISTS idx_inv_caller ON mcp_invocations(caller_agent_id);
CREATE INDEX IF NOT EXISTS idx_inv_status ON mcp_invocations(status);
CREATE INDEX IF NOT EXISTS idx_inv_trace ON mcp_invocations(trace_id);
CREATE INDEX IF NOT EXISTS idx_inv_created ON mcp_invocations(created_at);

CREATE TABLE IF NOT EXISTS mcp_rate_limits (
  agent_id TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  window_start TEXT NOT NULL,
  call_count INTEGER DEFAULT 0,
  PRIMARY KEY (agent_id, tool_id, window_start)
);

CREATE TABLE IF NOT EXISTS mcp_circuit_breakers (
  tool_id TEXT PRIMARY KEY,
  state TEXT DEFAULT 'closed',            -- closed | open | half_open
  failure_count INTEGER DEFAULT 0,
  last_failure_at TEXT,
  opens_at TEXT,
  FOREIGN KEY (tool_id) REFERENCES mcp_tools(id)
);

-- ============================================
-- Phase 3: Workflow Engine
-- ============================================

CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,                    -- wf_<nanoid>
  agent_id TEXT NOT NULL,                 -- owner agent
  name TEXT NOT NULL,
  description TEXT,
  definition TEXT NOT NULL,               -- JSON: { steps: Step[] }
  input_schema TEXT,                      -- JSON Schema for workflow input
  output_schema TEXT,                     -- JSON Schema for workflow output
  error_strategy TEXT DEFAULT 'stop_on_first', -- stop_on_first | continue | retry
  timeout_ms INTEGER DEFAULT 120000,      -- max 300000 (5 min)
  status TEXT DEFAULT 'draft',            -- draft | active | archived
  is_public INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  run_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_workflows_agent ON workflows(agent_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_public ON workflows(is_public, status);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY,                    -- run_<nanoid>
  workflow_id TEXT NOT NULL,
  triggered_by TEXT NOT NULL,             -- agent_id
  input TEXT,                             -- JSON
  output TEXT,                            -- JSON
  status TEXT DEFAULT 'pending',          -- pending | running | success | failed | cancelled
  current_step TEXT,                      -- current step id
  step_results TEXT DEFAULT '{}',         -- JSON: { stepId: { status, result, error, latencyMs } }
  error TEXT,                             -- top-level error message
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (workflow_id) REFERENCES workflows(id),
  FOREIGN KEY (triggered_by) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_wf_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_runs_status ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_wf_runs_triggered ON workflow_runs(triggered_by);

CREATE TABLE IF NOT EXISTS handoffs (
  id TEXT PRIMARY KEY,                    -- ho_<nanoid>
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  workflow_run_id TEXT,                   -- optional link to workflow run
  context TEXT NOT NULL,                  -- JSON: task context, conversation state
  message TEXT,                           -- human-readable handoff message
  status TEXT DEFAULT 'pending',          -- pending | accepted | rejected | completed
  result TEXT,                            -- JSON: result from accepting agent
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT,
  FOREIGN KEY (from_agent_id) REFERENCES agents(id),
  FOREIGN KEY (to_agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_handoffs_to ON handoffs(to_agent_id, status);
CREATE INDEX IF NOT EXISTS idx_handoffs_from ON handoffs(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_run ON handoffs(workflow_run_id);

-- ============================================
-- Phase 4: B2B Features
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,                    -- org_<nanoid>
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,              -- URL-safe identifier
  plan TEXT DEFAULT 'free',               -- free | pro | enterprise
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  settings TEXT DEFAULT '{}',             -- JSON: org-wide settings
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orgs_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_orgs_plan ON organizations(plan);

CREATE TABLE IF NOT EXISTS org_members (
  org_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',             -- owner | admin | member | viewer
  invited_by TEXT,
  joined_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, agent_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_agent ON org_members(agent_id);

CREATE TABLE IF NOT EXISTS access_policies (
  id TEXT PRIMARY KEY,                    -- pol_<nanoid>
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rules TEXT NOT NULL,                    -- JSON: [{ effect, resource, actions, conditions }]
  priority INTEGER DEFAULT 0,             -- higher = evaluated first
  status TEXT DEFAULT 'active',           -- active | inactive
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_acl_org ON access_policies(org_id, status);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,                    -- aud_<nanoid>
  org_id TEXT,
  agent_id TEXT NOT NULL,
  action TEXT NOT NULL,                   -- e.g. tool:register, tool:invoke, workflow:run, acl:create, org:create
  resource_type TEXT,                     -- tool | workflow | handoff | acl | org | member
  resource_id TEXT,
  details TEXT,                           -- JSON: additional context
  ip_address TEXT,
  trace_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_org_time ON audit_logs(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);

CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY,                    -- usg_<nanoid>
  org_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  metric TEXT NOT NULL,                   -- tool_calls | workflow_runs | api_requests | handoffs
  quantity REAL NOT NULL DEFAULT 1,
  period TEXT NOT NULL,                   -- YYYY-MM
  recorded_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_usage_org_period ON usage_records(org_id, period);
CREATE INDEX IF NOT EXISTS idx_usage_metric ON usage_records(org_id, metric, period);

CREATE TABLE IF NOT EXISTS billing_plans (
  id TEXT PRIMARY KEY,                    -- plan_<nanoid>
  name TEXT NOT NULL UNIQUE,              -- free | pro | enterprise
  display_name TEXT NOT NULL,
  limits TEXT NOT NULL,                   -- JSON: { tool_calls_per_month, workflow_runs_per_month, members_max, ... }
  price_usd REAL DEFAULT 0,
  billing_interval TEXT DEFAULT 'month',  -- month | year
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed default billing plans
INSERT OR IGNORE INTO billing_plans (id, name, display_name, limits, price_usd) VALUES
  ('plan_free', 'free', 'Free', '{"tool_calls_per_month":1000,"workflow_runs_per_month":100,"members_max":5,"api_requests_per_month":10000}', 0),
  ('plan_pro', 'pro', 'Pro', '{"tool_calls_per_month":50000,"workflow_runs_per_month":5000,"members_max":50,"api_requests_per_month":500000}', 49),
  ('plan_enterprise', 'enterprise', 'Enterprise', '{"tool_calls_per_month":-1,"workflow_runs_per_month":-1,"members_max":-1,"api_requests_per_month":-1}', 299);
