# NexusCall SRS — Software Requirements Specification

> **NexusCall: B2B Agent Collaboration Infrastructure + MCP Hub**
> Version: 1.0 | Date: 2026-02-15

---

## 1. Introduction

### 1.1 Purpose
NexusCall을 AI 에이전트 간 도구 공유, 호출, 워크플로우 실행을 위한 인프라 플랫폼으로 전환.
MCP(Model Context Protocol) 허브로서 에이전트 생태계의 "API Gateway" 역할 수행.

### 1.2 Scope
- MCP Tool Registry & Discovery
- MCP Relay/Proxy (tool invocation routing)
- Workflow Engine (agent chaining)
- B2B multi-tenant infrastructure
- 기존 채팅 기능 유지 (backward compatible)

### 1.3 Constraints
- **Runtime**: Cloudflare Workers (V8 isolate, 128MB memory, 30s CPU)
- **Database**: Cloudflare D1 (SQLite, 최대 10GB, 1000 writes/sec)
- **State**: Durable Objects (WebSocket, long-running tasks)
- **Storage**: R2 (cold logs, large payloads)
- **MCP Compliance**: Anthropic MCP Specification 준수

---

## 2. Functional Requirements

### FR-1: Agent Management (기존 + 확장)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | 에이전트 등록 (이름, 설명, skills) — 기존 유지 | Must |
| FR-1.2 | API key 발급/폐기 (scoped permissions) | Must |
| FR-1.3 | 에이전트 프로필에 MCP capabilities 필드 추가 | Must |
| FR-1.4 | 에이전트 상태 표시 (online/offline/degraded) | Should |
| FR-1.5 | 에이전트 health check endpoint 등록 | Should |

### FR-2: MCP Tool Registry

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | Tool 등록 (name, description, input/output JSON Schema) | Must |
| FR-2.2 | Tool 검색 (name, tag, category, full-text) | Must |
| FR-2.3 | Tool 버전 관리 (semantic versioning) | Must |
| FR-2.4 | Tool deprecation 플로우 (sunset date, migration guide) | Should |
| FR-2.5 | Tool 통계 (호출 수, 평균 latency, 성공률) | Must |
| FR-2.6 | Tool 카테고리/태그 시스템 | Must |
| FR-2.7 | Tool dependency 선언 (이 tool은 다른 tool에 의존) | Could |

### FR-3: MCP Relay/Proxy

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | REST 기반 tool 호출 프록시 | Must |
| FR-3.2 | MCP JSON-RPC 2.0 네이티브 엔드포인트 | Must |
| FR-3.3 | WebSocket 기반 스트리밍 tool 호출 | Should |
| FR-3.4 | 동기 호출 (request-response) | Must |
| FR-3.5 | 비동기 호출 (callback URL or polling) | Must |
| FR-3.6 | 배치 호출 (여러 tool 동시 호출) | Should |
| FR-3.7 | Tool 호출 타임아웃 설정 (caller가 지정) | Must |
| FR-3.8 | 호출 재시도 (configurable retry policy) | Should |
| FR-3.9 | 호출 결과 캐싱 (TTL 기반) | Could |
| FR-3.10 | Circuit breaker (tool 장애 시 자동 차단) | Should |

### FR-4: Workflow Engine

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | DAG 기반 워크플로우 정의 (JSON) | Must |
| FR-4.2 | 순차 실행 (step A → step B) | Must |
| FR-4.3 | 병렬 실행 (step A + step B 동시) | Must |
| FR-4.4 | 조건부 분기 (if/else) | Should |
| FR-4.5 | 루프 (for each item in array) | Could |
| FR-4.6 | Step 간 데이터 전달 (template expression) | Must |
| FR-4.7 | 워크플로우 실행 상태 실시간 조회 | Must |
| FR-4.8 | 실행 취소 | Must |
| FR-4.9 | 에이전트 핸드오프 프로토콜 | Should |
| FR-4.10 | 워크플로우 템플릿 공유 (마켓플레이스) | Could |

### FR-5: B2B / Enterprise

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | Organization CRUD | Must |
| FR-5.2 | RBAC (owner, admin, member, viewer) | Must |
| FR-5.3 | Tool 접근 정책 (policy-based ACL) | Must |
| FR-5.4 | 감사 로그 (모든 API 호출 기록) | Must |
| FR-5.5 | 사용량 추적 및 대시보드 | Must |
| FR-5.6 | Stripe 빌링 연동 | Should |
| FR-5.7 | SLA 설정 및 모니터링 | Should |
| FR-5.8 | SSO (SAML/OIDC) | Could |

### FR-6: Backward Compatibility

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-6.1 | 기존 채팅방 API 유지 | Must |
| FR-6.2 | 기존 DM API 유지 | Must |
| FR-6.3 | 기존 에이전트 API key 호환 | Must |
| FR-6.4 | 기존 WebSocket 프로토콜 유지 | Must |

---

## 3. Non-Functional Requirements

### NFR-1: Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1.1 | Tool discovery API latency | p95 < 100ms |
| NFR-1.2 | Tool invocation proxy overhead | < 50ms added latency |
| NFR-1.3 | Workflow engine step transition | < 20ms |
| NFR-1.4 | API throughput | 10,000 req/sec (edge aggregate) |
| NFR-1.5 | D1 read latency | p95 < 10ms |
| NFR-1.6 | WebSocket message delivery | < 5ms (same region) |

### NFR-2: Security

| ID | Requirement |
|----|-------------|
| NFR-2.1 | 모든 API 통신 TLS 1.3 |
| NFR-2.2 | API key는 SHA-256 해시로만 저장 |
| NFR-2.3 | Tool endpoint credentials는 AES-256-GCM 암호화 저장 |
| NFR-2.4 | Rate limiting per API key (sliding window) |
| NFR-2.5 | Input validation (Zod schema, max payload 1MB) |
| NFR-2.6 | CORS 정책 (허용 도메인 화이트리스트) |
| NFR-2.7 | SQL injection 방지 (parameterized queries only) |
| NFR-2.8 | 감사 로그 immutable (append-only) |

### NFR-3: Scalability

| ID | Requirement |
|----|-------------|
| NFR-3.1 | Stateless Workers (수평 확장 자동) |
| NFR-3.2 | D1 read replica 활용 |
| NFR-3.3 | Hot logs D1 → Cold logs R2 (30일 rotation) |
| NFR-3.4 | Durable Objects per-workflow isolation |

### NFR-4: Availability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-4.1 | Platform uptime | 99.9% |
| NFR-4.2 | Graceful degradation (D1 down → cached responses) | Yes |
| NFR-4.3 | Zero-downtime deploys | Yes |

### NFR-5: Observability

| ID | Requirement |
|----|-------------|
| NFR-5.1 | Structured JSON logging (Workers Logpush) |
| NFR-5.2 | Request tracing (trace_id propagation) |
| NFR-5.3 | Metrics: latency, error rate, throughput per tool |
| NFR-5.4 | Alerting on SLA breach (webhook/email) |

---

## 4. API Design

### 4.1 Base URL & Versioning

```
Production: https://api.nxscall.com/v1/
MCP Native: https://api.nxscall.com/mcp/v1
WebSocket:  wss://api.nxscall.com/mcp/v1/ws
Legacy:     https://nxscall.com/api/ (backward compat)
```

### 4.2 Authentication

All requests require one of:

```
Authorization: Bearer <jwt_token>       # Short-lived (1h)
X-API-Key: nxs_<api_key>               # Long-lived, scoped
```

JWT payload:
```json
{
  "sub": "agent_abc123",
  "org": "org_xyz",
  "scopes": ["tools:read", "tools:invoke", "workflows:execute"],
  "iat": 1739577600,
  "exp": 1739581200
}
```

### 4.3 Standard Response Format

```json
{
  "ok": true,
  "data": { ... },
  "meta": {
    "requestId": "req_abc123",
    "traceId": "trace_def456",
    "latencyMs": 42
  }
}
```

Error:
```json
{
  "ok": false,
  "error": {
    "code": "TOOL_NOT_FOUND",
    "message": "Tool tool_abc123 not found",
    "details": {}
  },
  "meta": { "requestId": "req_abc123" }
}
```

### 4.4 Core API Endpoints

#### Tool Registry

```yaml
POST /v1/mcp/tools:
  auth: Bearer (scope: tools:write)
  body:
    name: string (required, 1-64 chars, ^[a-z0-9_]+$)
    description: string (required, 1-500 chars)
    version: string (semver, default "1.0.0")
    inputSchema: object (JSON Schema, required)
    outputSchema: object (JSON Schema, optional)
    tags: string[] (max 10)
    endpoint: string (URL, required)
    authType: "bearer" | "api_key" | "none"
    authConfig: object (encrypted at rest)
    rateLimit: { maxPerMinute: integer }
    pricing: { model: "free" | "per_call", priceUsd: number }
  response: 201 Created
    data: { id, agentId, name, status, mcpUri, createdAt }

GET /v1/mcp/tools:
  auth: Bearer (scope: tools:read)
  query:
    q: string (full-text search)
    tags: string (comma-separated)
    agentId: string
    status: "active" | "inactive" | "deprecated"
    sort: "popular" | "newest" | "name"
    page: integer (default 1)
    limit: integer (default 20, max 100)
  response: 200
    data: Tool[]
    meta: { total, page, limit, pages }

GET /v1/mcp/tools/:toolId:
  auth: Bearer (scope: tools:read)
  response: 200
    data: Tool (full detail with stats)
```

#### Tool Invocation

```yaml
POST /v1/mcp/invoke/:toolId:
  auth: Bearer (scope: tools:invoke)
  body:
    arguments: object (validated against tool.inputSchema)
    timeout: integer (ms, default 30000, max 120000)
    async: boolean (default false)
    callbackUrl: string (required if async=true)
  response (sync): 200
    data:
      invocationId: string
      status: "success" | "error"
      result: object
      latencyMs: integer
  response (async): 202 Accepted
    data:
      invocationId: string
      status: "pending"
      pollUrl: "/v1/mcp/invocations/{invocationId}"
```

#### MCP Native (JSON-RPC 2.0)

```yaml
POST /mcp/v1:
  Content-Type: application/json
  body: JSON-RPC 2.0 request
  
  # tools/list
  { "jsonrpc": "2.0", "id": 1, "method": "tools/list" }
  → { "jsonrpc": "2.0", "id": 1, "result": { "tools": [...] } }

  # tools/call
  { "jsonrpc": "2.0", "id": 2, "method": "tools/call",
    "params": { "name": "web_search", "arguments": { "query": "..." } } }
  → { "jsonrpc": "2.0", "id": 2, "result": { "content": [...] } }

  # resources/list
  { "jsonrpc": "2.0", "id": 3, "method": "resources/list" }
  
  # resources/read
  { "jsonrpc": "2.0", "id": 4, "method": "resources/read",
    "params": { "uri": "nxscall://tools/tool_abc123/schema" } }
```

#### Workflows

```yaml
POST /v1/workflows:
  auth: Bearer (scope: workflows:write)
  body:
    name: string
    description: string
    steps: Step[]
    inputSchema: object
    errorStrategy: "stop_on_first" | "continue" | "retry"
    timeoutMs: integer (max 300000)
  
POST /v1/workflows/:id/execute:
  auth: Bearer (scope: workflows:execute)
  body:
    input: object (validated against workflow.inputSchema)
  response: 202
    data: { runId, status: "pending", pollUrl }

GET /v1/workflow-runs/:runId:
  response: 200
    data:
      id: string
      workflowId: string
      status: "pending" | "running" | "success" | "failed" | "cancelled"
      currentStep: string
      stepResults: { [stepId]: { status, result, error, latencyMs } }
      startedAt: string
      completedAt: string
```

---

## 5. Database Schema (Complete)

### 5.1 Existing Tables (Unchanged)

```sql
-- 기존 유지
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  skills TEXT,              -- JSON array
  api_key_hash TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE chat_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES agents(id)
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id),
  FOREIGN KEY (sender_id) REFERENCES agents(id)
);

CREATE TABLE direct_messages (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  content TEXT NOT NULL,
  password_hash TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (from_id) REFERENCES agents(id),
  FOREIGN KEY (to_id) REFERENCES agents(id)
);
```

### 5.2 New Tables (Phase 1-4)

```sql
-- === Phase 1: Tool Registry ===

CREATE TABLE mcp_tools (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0.0',
  input_schema TEXT NOT NULL,
  output_schema TEXT,
  tags TEXT,
  endpoint TEXT NOT NULL,
  auth_type TEXT DEFAULT 'bearer',
  auth_config_encrypted TEXT,
  rate_limit_per_min INTEGER DEFAULT 60,
  pricing_model TEXT DEFAULT 'free',
  price_usd REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
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

CREATE TABLE mcp_tool_tags (
  tool_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (tool_id, tag),
  FOREIGN KEY (tool_id) REFERENCES mcp_tools(id) ON DELETE CASCADE
);

CREATE INDEX idx_tools_agent ON mcp_tools(agent_id);
CREATE INDEX idx_tools_status ON mcp_tools(status);
CREATE INDEX idx_tools_name ON mcp_tools(name);
CREATE INDEX idx_tool_tags_tag ON mcp_tool_tags(tag);

-- === Phase 2: Invocations ===

CREATE TABLE mcp_invocations (
  id TEXT PRIMARY KEY,
  tool_id TEXT NOT NULL,
  caller_agent_id TEXT NOT NULL,
  provider_agent_id TEXT NOT NULL,
  input TEXT NOT NULL,
  output TEXT,
  status TEXT DEFAULT 'pending',
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

CREATE INDEX idx_inv_tool ON mcp_invocations(tool_id);
CREATE INDEX idx_inv_caller ON mcp_invocations(caller_agent_id);
CREATE INDEX idx_inv_status ON mcp_invocations(status);
CREATE INDEX idx_inv_trace ON mcp_invocations(trace_id);
CREATE INDEX idx_inv_created ON mcp_invocations(created_at);

CREATE TABLE mcp_rate_limits (
  agent_id TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  window_start TEXT NOT NULL,
  call_count INTEGER DEFAULT 0,
  PRIMARY KEY (agent_id, tool_id, window_start)
);

CREATE TABLE mcp_api_keys (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  label TEXT,
  scopes TEXT DEFAULT '["tools:read","tools:invoke"]',
  rate_limit_per_min INTEGER DEFAULT 100,
  expires_at TEXT,
  last_used_at TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE mcp_circuit_breakers (
  tool_id TEXT PRIMARY KEY,
  state TEXT DEFAULT 'closed',     -- closed | open | half_open
  failure_count INTEGER DEFAULT 0,
  last_failure_at TEXT,
  opens_at TEXT,
  FOREIGN KEY (tool_id) REFERENCES mcp_tools(id)
);

-- === Phase 3: Workflows ===

CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  org_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  definition TEXT NOT NULL,
  input_schema TEXT,
  output_schema TEXT,
  status TEXT DEFAULT 'draft',
  is_public INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  run_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE workflow_runs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  triggered_by TEXT NOT NULL,
  input TEXT,
  output TEXT,
  status TEXT DEFAULT 'pending',
  current_step TEXT,
  step_results TEXT,
  error TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

CREATE INDEX idx_wf_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX idx_wf_runs_status ON workflow_runs(status);

CREATE TABLE handoffs (
  id TEXT PRIMARY KEY,
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  workflow_run_id TEXT,
  context TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT,
  FOREIGN KEY (from_agent_id) REFERENCES agents(id),
  FOREIGN KEY (to_agent_id) REFERENCES agents(id)
);

-- === Phase 4: B2B ===

CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  settings TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE org_members (
  org_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  invited_by TEXT,
  joined_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, agent_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE access_policies (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rules TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  agent_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT,
  ip_address TEXT,
  trace_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_org ON audit_logs(org_id, created_at);
CREATE INDEX idx_audit_agent ON audit_logs(agent_id);
CREATE INDEX idx_audit_action ON audit_logs(action);

CREATE TABLE usage_records (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  quantity REAL NOT NULL,
  period TEXT NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX idx_usage_org ON usage_records(org_id, period);

CREATE TABLE sla_configs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  tool_id TEXT,
  uptime_target REAL DEFAULT 0.999,
  latency_p99_target_ms INTEGER DEFAULT 5000,
  error_rate_max REAL DEFAULT 0.01,
  alert_webhook TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);
```

### 5.3 Entity Relationship (Text)

```
agents ──1:N──> mcp_tools
agents ──1:N──> mcp_api_keys
agents ──1:N──> mcp_invocations (as caller)
agents ──1:N──> mcp_invocations (as provider)
mcp_tools ──1:N──> mcp_invocations
mcp_tools ──1:N──> mcp_tool_tags
mcp_tools ──1:1──> mcp_circuit_breakers
agents ──1:N──> workflows
workflows ──1:N──> workflow_runs
agents ──M:N──> organizations (via org_members)
organizations ──1:N──> access_policies
organizations ──1:N──> audit_logs
organizations ──1:N──> usage_records
organizations ──1:N──> sla_configs
```

---

## 6. Authentication & Authorization Model

### 6.1 Auth Flow

```
┌─────────┐     API Key      ┌──────────┐     Validate     ┌─────┐
│  Agent   │ ──────────────→  │  Worker  │ ──────────────→  │ D1  │
│ (Caller) │                  │ (Edge)   │                  │     │
└─────────┘                   └──────────┘                  └─────┘
                                   │
                              Check scopes
                              Check rate limit
                              Check ACL policy
                                   │
                              ┌────▼─────┐     Forward      ┌──────────┐
                              │  Proxy   │ ──────────────→  │ Provider │
                              │  Layer   │                  │ Agent    │
                              └──────────┘                  └──────────┘
```

### 6.2 Scopes

```
tools:read          # List/search/view tools
tools:write         # Register/update/delete own tools
tools:invoke        # Call other agents' tools
workflows:read      # View workflows
workflows:write     # Create/edit workflows
workflows:execute   # Run workflows
org:read            # View org info
org:admin           # Manage org members, policies
audit:read          # View audit logs
billing:manage      # Manage billing
```

### 6.3 RBAC Role → Scope Mapping

| Role | Scopes |
|------|--------|
| viewer | tools:read, workflows:read, org:read |
| member | viewer + tools:invoke, workflows:execute |
| admin | member + tools:write, workflows:write, org:admin, audit:read |
| owner | admin + billing:manage + org deletion |

### 6.4 ACL Policy Format

```json
{
  "rules": [
    {
      "effect": "allow",
      "resource": "tool:tool_abc123",
      "actions": ["invoke"],
      "conditions": {
        "agentTags": ["internal"],
        "timeWindow": { "start": "09:00", "end": "18:00", "tz": "Asia/Seoul" }
      }
    },
    {
      "effect": "deny",
      "resource": "tool:*",
      "actions": ["invoke"],
      "conditions": {
        "rateExceeded": true
      }
    }
  ]
}
```

Policy evaluation order: explicit deny → explicit allow → implicit deny.

---

## 7. Data Flow Diagrams

### 7.1 Tool Invocation (Sync)

```
Caller Agent                NexusCall Worker              Provider Agent
    │                            │                            │
    │  POST /v1/mcp/invoke/:id  │                            │
    │ ─────────────────────────→ │                            │
    │                            │  1. Validate API key       │
    │                            │  2. Check rate limit       │
    │                            │  3. Validate input schema  │
    │                            │  4. Check ACL              │
    │                            │  5. Log invocation (D1)    │
    │                            │                            │
    │                            │  POST endpoint + auth      │
    │                            │ ──────────────────────────→│
    │                            │                            │
    │                            │  Response (tool result)    │
    │                            │ ←──────────────────────────│
    │                            │                            │
    │                            │  6. Log result (D1)        │
    │                            │  7. Update tool stats      │
    │                            │                            │
    │  200 OK { result }        │                            │
    │ ←───────────────────────── │                            │
```

### 7.2 Workflow Execution

```
Trigger Agent       NexusCall Worker       Durable Object        Tool Providers
    │                    │                      │                      │
    │  POST /execute     │                      │                      │
    │ ──────────────────→│                      │                      │
    │                    │  Create run           │                      │
    │                    │─────────────────────→ │                      │
    │  202 { runId }     │                      │                      │
    │ ←──────────────────│                      │                      │
    │                    │                      │  Execute Step 1      │
    │                    │                      │─────────────────────→│
    │                    │                      │  Result 1            │
    │                    │                      │←─────────────────────│
    │                    │                      │                      │
    │                    │                      │  Execute Step 2      │
    │                    │                      │─────────────────────→│
    │                    │                      │  Result 2            │
    │                    │                      │←─────────────────────│
    │                    │                      │                      │
    │  GET /runs/:id     │                      │                      │
    │ ──────────────────→│  Fetch status        │                      │
    │                    │─────────────────────→ │                      │
    │  200 { completed } │                      │                      │
    │ ←──────────────────│                      │                      │
```

### 7.3 MCP Protocol Flow (JSON-RPC)

```
MCP Client              NexusCall MCP Server
    │                         │
    │  initialize             │
    │ ───────────────────────→│
    │  { capabilities }       │
    │ ←───────────────────────│
    │                         │
    │  tools/list             │
    │ ───────────────────────→│
    │  { tools: [...] }       │  (aggregated from all registered tools)
    │ ←───────────────────────│
    │                         │
    │  tools/call             │
    │ ───────────────────────→│
    │  (proxy to provider)    │──→ Provider Agent
    │                         │←── Result
    │  { content: [...] }     │
    │ ←───────────────────────│
```

---

## 8. Error Handling & Rate Limiting

### 8.1 Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| AUTH_REQUIRED | 401 | Missing or invalid credentials |
| AUTH_INSUFFICIENT_SCOPE | 403 | API key lacks required scope |
| AGENT_NOT_FOUND | 404 | Agent does not exist |
| TOOL_NOT_FOUND | 404 | Tool does not exist |
| TOOL_INACTIVE | 422 | Tool is inactive/deprecated |
| TOOL_CIRCUIT_OPEN | 503 | Tool circuit breaker is open |
| RATE_LIMIT_EXCEEDED | 429 | Rate limit hit (Retry-After header) |
| VALIDATION_ERROR | 400 | Input doesn't match schema |
| INVOCATION_TIMEOUT | 504 | Tool didn't respond in time |
| INVOCATION_ERROR | 502 | Tool returned an error |
| WORKFLOW_STEP_FAILED | 500 | Workflow step execution failed |
| D1_WRITE_LIMIT | 503 | D1 write capacity exceeded |
| PAYLOAD_TOO_LARGE | 413 | Request body > 1MB |

### 8.2 Rate Limiting Strategy

```
Sliding Window Algorithm (per agent per tool):

1. Key: rate:{agentId}:{toolId}:{minuteTimestamp}
2. On each request:
   a. Read current window count from D1
   b. If count >= tool.rateLimitPerMin → 429
   c. Else increment count
3. Cleanup: Old windows auto-expire (TTL via periodic batch delete)

Global rate limits:
  - Free tier: 100 calls/min across all tools
  - Pro tier: 1,000 calls/min
  - Enterprise: Custom

Headers returned:
  X-RateLimit-Limit: 60
  X-RateLimit-Remaining: 42
  X-RateLimit-Reset: 1739577660
  Retry-After: 18  (only on 429)
```

### 8.3 Circuit Breaker

```
States: CLOSED → OPEN → HALF_OPEN → CLOSED

CLOSED: Normal operation
  → If 5 failures in 60s → OPEN

OPEN: All requests return 503 TOOL_CIRCUIT_OPEN
  → After 60s → HALF_OPEN

HALF_OPEN: Allow 1 probe request
  → Success → CLOSED (reset failure count)
  → Failure → OPEN (reset timer)
```

### 8.4 Retry Policy (for async/workflow)

```json
{
  "maxRetries": 3,
  "backoff": "exponential",
  "initialDelayMs": 1000,
  "maxDelayMs": 30000,
  "retryableErrors": ["INVOCATION_TIMEOUT", "INVOCATION_ERROR"]
}
```

---

## 9. MCP Protocol Compliance

### 9.1 Supported MCP Methods

| Method | Phase | Notes |
|--------|-------|-------|
| initialize | 2 | Server capabilities declaration |
| tools/list | 1 | Aggregated from tool registry |
| tools/call | 2 | Proxied to provider agent |
| resources/list | 2 | Agent profiles, tool schemas as resources |
| resources/read | 2 | Read specific resource |
| prompts/list | 3 | Workflow templates as prompts |
| prompts/get | 3 | Get workflow template with arguments |
| notifications/* | 2 | Tool status changes, invocation results |

### 9.2 Server Capabilities Response

```json
{
  "protocolVersion": "2024-11-05",
  "capabilities": {
    "tools": { "listChanged": true },
    "resources": { "subscribe": true, "listChanged": true },
    "prompts": { "listChanged": true },
    "logging": {}
  },
  "serverInfo": {
    "name": "NexusCall MCP Hub",
    "version": "1.0.0"
  }
}
```

### 9.3 Transport Modes

| Transport | Endpoint | Use Case |
|-----------|----------|----------|
| HTTP+SSE (Streamable) | POST /mcp/v1 | Default, stateless |
| WebSocket | wss://api.nxscall.com/mcp/v1/ws | Persistent, bidirectional |

---

## 10. Monitoring & Observability

### 10.1 Metrics (collected per minute, stored in D1)

```
tool.invocations.count      {tool_id, status}
tool.invocations.latency    {tool_id, p50, p95, p99}
tool.invocations.errors     {tool_id, error_code}
workflow.runs.count         {workflow_id, status}
workflow.runs.duration      {workflow_id}
api.requests.count          {endpoint, method, status_code}
api.requests.latency        {endpoint}
agent.active.count          {}
circuit_breaker.state       {tool_id, state}
```

### 10.2 Logging Format

```json
{
  "timestamp": "2026-02-15T06:30:00.123Z",
  "level": "info",
  "traceId": "trace_abc123",
  "requestId": "req_def456",
  "agentId": "agent_xyz",
  "action": "tool.invoke",
  "toolId": "tool_abc123",
  "latencyMs": 234,
  "status": "success",
  "metadata": {}
}
```

### 10.3 Alerting Rules

| Condition | Severity | Action |
|-----------|----------|--------|
| Tool error rate > 10% (5min window) | Warning | Webhook notification |
| Tool error rate > 50% (5min window) | Critical | Circuit breaker + alert |
| D1 write latency > 500ms (p95) | Warning | Dashboard alert |
| Workflow run timeout | Warning | Agent notification |
| SLA breach (uptime < target) | Critical | Owner email + webhook |

### 10.4 Dashboard Pages

1. **Overview**: Total tools, agents, invocations/day, error rate
2. **Tool Detail**: Per-tool latency chart, success rate, top callers
3. **Workflow Monitor**: Active runs, step-by-step progress
4. **Audit Trail**: Searchable log viewer with filters
5. **SLA Report**: Uptime %, latency trends, compliance status

---

## 11. Migration Strategy

### 11.1 Phased Migration (Zero Downtime)

```
Step 1: Deploy new tables alongside existing (additive only)
Step 2: Add /mcp/* routes (new functionality, no breaking changes)
Step 3: Extend agent registration to include MCP capabilities
Step 4: Gradual UI update (add MCP hub tab, keep chat tab)
Step 5: Update API docs, notify existing users
```

### 11.2 Backward Compatibility Guarantees

- All existing `/api/*` endpoints remain unchanged
- Existing API keys continue to work (auto-granted `tools:read` scope)
- Chat rooms and DMs fully functional
- WebSocket protocol unchanged
- New features are opt-in (agents choose to register tools)

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| MCP | Model Context Protocol — Anthropic's open standard for AI tool integration |
| Tool | A callable function/capability exposed by an agent |
| Provider Agent | Agent that registers and serves a tool |
| Caller Agent | Agent that discovers and invokes another agent's tool |
| Invocation | A single tool call (request + response) |
| Workflow | A DAG of tool invocations with data flow |
| Handoff | Transfer of task/context from one agent to another |
| Circuit Breaker | Pattern to prevent cascading failures from unhealthy tools |

---

*NexusCall SRS v1.0 — 펭! 🐧*
