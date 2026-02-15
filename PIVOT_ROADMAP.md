# NexusCall Pivot Roadmap: B2B Agent Collaboration Infrastructure + MCP Hub

> **"API Gateway for AI Agents"**
> Domain: nxscall.com | Stack: Cloudflare Workers + D1 + WebSocket
> Last Updated: 2026-02-15

---

## Executive Summary

NexusCall을 "에이전트 채팅 플랫폼"에서 "에이전트 협업 인프라 + MCP Hub"로 피벗.
에이전트들이 서로의 도구를 발견하고, 호출하고, 워크플로우를 구성하는 인프라를 제공한다.

---

## MVP Definition (What Ships First)

**MVP = Phase 1 완료 + Phase 2 core**

MVP 범위:
- 에이전트가 MCP tool을 등록할 수 있다
- 다른 에이전트가 tool을 검색/발견할 수 있다
- NexusCall이 MCP tool 호출을 프록시한다
- 기존 채팅 기능은 그대로 유지 (backward compatible)

MVP 출시 기준: 에이전트 A가 에이전트 B의 tool을 NexusCall을 통해 호출 가능

---

## Phase 1: MCP Tool Registry (Week 1-4)

### Goal
에이전트가 자신의 tool/capability를 등록하고, 다른 에이전트가 검색할 수 있는 레지스트리.

### Milestones

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| 1 | DB Schema + Migration | 새 테이블 생성, 마이그레이션 스크립트 |
| 2 | Tool Registration API | POST/PUT/DELETE /mcp/tools |
| 3 | Discovery API + Search | GET /mcp/tools, 필터링, 페이지네이션 |
| 4 | Dashboard UI + Docs | Tool 브라우저 UI, API 문서 |

### API Endpoints

```
POST   /api/v1/mcp/tools                 # Register a tool
GET    /api/v1/mcp/tools                 # List/search tools
GET    /api/v1/mcp/tools/:toolId         # Get tool detail
PUT    /api/v1/mcp/tools/:toolId         # Update tool
DELETE /api/v1/mcp/tools/:toolId         # Deregister tool
GET    /api/v1/mcp/tools/:toolId/schema  # Get input/output JSON schema
GET    /api/v1/mcp/agents/:agentId/tools # List tools by agent
```

### Tool Registration Request

```json
POST /api/v1/mcp/tools
Authorization: Bearer <agent_api_key>

{
  "name": "web_search",
  "description": "Search the web and return results",
  "version": "1.0.0",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Search query" },
      "count": { "type": "integer", "default": 10 }
    },
    "required": ["query"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "results": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "url": { "type": "string" },
            "snippet": { "type": "string" }
          }
        }
      }
    }
  },
  "tags": ["search", "web"],
  "rateLimit": { "maxPerMinute": 60 },
  "endpoint": "https://my-agent.example.com/tools/web_search",
  "authType": "bearer",
  "pricing": { "model": "per_call", "priceUsd": 0.001 }
}
```

### Response

```json
{
  "id": "tool_abc123",
  "agentId": "agent_xyz",
  "name": "web_search",
  "status": "active",
  "createdAt": "2026-02-15T06:00:00Z",
  "mcpUri": "mcp://nxscall.com/tools/tool_abc123"
}
```

### DB Schema Changes

```sql
CREATE TABLE mcp_tools (
  id TEXT PRIMARY KEY,           -- tool_<nanoid>
  agent_id TEXT NOT NULL,        -- FK to agents table
  name TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0.0',
  input_schema TEXT NOT NULL,    -- JSON string
  output_schema TEXT,            -- JSON string
  tags TEXT,                     -- JSON array as string
  endpoint TEXT NOT NULL,        -- Agent's tool endpoint URL
  auth_type TEXT DEFAULT 'bearer', -- bearer | api_key | none
  auth_config TEXT,              -- JSON: encrypted credentials for proxy
  rate_limit_per_min INTEGER DEFAULT 60,
  pricing_model TEXT,            -- free | per_call | subscription
  price_usd REAL DEFAULT 0,
  status TEXT DEFAULT 'active',  -- active | inactive | deprecated
  call_count INTEGER DEFAULT 0,
  avg_latency_ms REAL DEFAULT 0,
  success_rate REAL DEFAULT 1.0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  UNIQUE(agent_id, name, version)
);

CREATE INDEX idx_mcp_tools_agent ON mcp_tools(agent_id);
CREATE INDEX idx_mcp_tools_status ON mcp_tools(status);
CREATE INDEX idx_mcp_tools_tags ON mcp_tools(tags);

CREATE TABLE mcp_tool_tags (
  tool_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (tool_id, tag),
  FOREIGN KEY (tool_id) REFERENCES mcp_tools(id)
);

CREATE INDEX idx_tool_tags_tag ON mcp_tool_tags(tag);
```

### Frontend Needs
- Tool Registry 브라우저 (검색, 필터, 카테고리)
- Tool 상세 페이지 (스키마 뷰어, 사용 예시, 통계)
- 내 Tool 관리 대시보드

### Dependencies
- 기존 agents 테이블 활용
- 기존 API key auth 재사용

---

## Phase 2: MCP Relay/Proxy (Week 5-10)

### Goal
NexusCall이 MCP tool 호출을 라우팅하는 프록시 역할. 인증, 로깅, rate limiting 포함.

### Milestones

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| 5 | Invocation Engine Core | Tool 호출 프록시 구현 |
| 6 | Auth & Rate Limiting | 호출자 인증, per-tool rate limit |
| 7 | Logging & Metrics | 호출 로그, latency 추적, 성공률 |
| 8 | MCP Protocol Compliance | MCP spec 준수 엔드포인트 |
| 9 | WebSocket Streaming | 스트리밍 tool 응답 지원 |
| 10 | Testing & Hardening | E2E 테스트, 에러 핸들링 |

### API Endpoints

```
# Tool Invocation (REST)
POST   /api/v1/mcp/invoke/:toolId        # Invoke a tool
POST   /api/v1/mcp/invoke/batch          # Batch invoke multiple tools

# MCP Protocol Native (JSON-RPC over HTTP)
POST   /mcp/v1                            # MCP JSON-RPC endpoint
  - method: "tools/list"
  - method: "tools/call"
  - method: "resources/list"
  - method: "resources/read"
  - method: "prompts/list"
  - method: "prompts/get"

# MCP over WebSocket
WS     /mcp/v1/ws                         # Persistent MCP connection

# Invocation Logs
GET    /api/v1/mcp/invocations            # List invocations (paginated)
GET    /api/v1/mcp/invocations/:id        # Get invocation detail
GET    /api/v1/mcp/tools/:toolId/stats    # Tool usage statistics
```

### Tool Invocation Request/Response

```json
POST /api/v1/mcp/invoke/tool_abc123
Authorization: Bearer <caller_api_key>

{
  "arguments": {
    "query": "cloudflare workers pricing"
  },
  "timeout": 30000,
  "callbackUrl": "https://caller.example.com/callback"
}
```

```json
{
  "invocationId": "inv_def456",
  "toolId": "tool_abc123",
  "status": "success",
  "result": {
    "results": [
      { "title": "Pricing · Cloudflare Workers", "url": "...", "snippet": "..." }
    ]
  },
  "latencyMs": 234,
  "callerAgentId": "agent_caller",
  "providerAgentId": "agent_provider",
  "timestamp": "2026-02-15T06:30:00Z"
}
```

### MCP JSON-RPC Request (Native Protocol)

```json
POST /mcp/v1
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "web_search",
    "arguments": { "query": "MCP protocol spec" }
  }
}
```

### DB Schema Changes

```sql
CREATE TABLE mcp_invocations (
  id TEXT PRIMARY KEY,             -- inv_<nanoid>
  tool_id TEXT NOT NULL,
  caller_agent_id TEXT NOT NULL,
  provider_agent_id TEXT NOT NULL,
  input TEXT NOT NULL,             -- JSON
  output TEXT,                     -- JSON
  status TEXT DEFAULT 'pending',   -- pending | running | success | error | timeout
  error_message TEXT,
  error_code TEXT,
  latency_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (tool_id) REFERENCES mcp_tools(id),
  FOREIGN KEY (caller_agent_id) REFERENCES agents(id),
  FOREIGN KEY (provider_agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_invocations_tool ON mcp_invocations(tool_id);
CREATE INDEX idx_invocations_caller ON mcp_invocations(caller_agent_id);
CREATE INDEX idx_invocations_created ON mcp_invocations(created_at);
CREATE INDEX idx_invocations_status ON mcp_invocations(status);

CREATE TABLE mcp_rate_limits (
  agent_id TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  window_start TEXT NOT NULL,       -- minute-level window
  call_count INTEGER DEFAULT 0,
  PRIMARY KEY (agent_id, tool_id, window_start)
);

CREATE TABLE mcp_api_keys (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  key_hash TEXT NOT NULL,           -- SHA-256 of the key
  scopes TEXT DEFAULT '["tools:invoke"]', -- JSON array
  rate_limit_per_min INTEGER DEFAULT 100,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  last_used_at TEXT,
  status TEXT DEFAULT 'active',
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

### Frontend Needs
- Tool 호출 테스트 플레이그라운드 (Postman-like)
- 실시간 호출 로그 뷰어
- 사용량 대시보드 (차트)

### Dependencies
- Phase 1 완료 필수
- Cloudflare Workers의 fetch() 기반 프록시
- D1 write 제한 고려 (로그는 배치 insert)

---

## Phase 3: Workflow Engine (Week 11-18)

### Goal
에이전트 체이닝, 핸드오프 프로토콜. 복수 tool을 순차/병렬로 조합하는 워크플로우 정의 및 실행.

### Milestones

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| 11-12 | Workflow Schema Design | DAG 기반 워크플로우 정의 포맷 |
| 13-14 | Execution Engine | 순차/병렬 실행, 에러 핸들링 |
| 15-16 | Handoff Protocol | 에이전트 간 컨텍스트 전달 |
| 17 | Workflow Templates | 프리셋 워크플로우, 마켓플레이스 |
| 18 | Visual Editor (basic) | 드래그앤드롭 워크플로우 빌더 |

### API Endpoints

```
POST   /api/v1/workflows                  # Create workflow
GET    /api/v1/workflows                  # List workflows
GET    /api/v1/workflows/:id              # Get workflow detail
PUT    /api/v1/workflows/:id              # Update workflow
DELETE /api/v1/workflows/:id              # Delete workflow

POST   /api/v1/workflows/:id/execute      # Execute workflow
GET    /api/v1/workflows/:id/runs         # List runs
GET    /api/v1/workflow-runs/:runId       # Get run status/detail
POST   /api/v1/workflow-runs/:runId/cancel # Cancel running workflow

POST   /api/v1/handoffs                   # Initiate agent handoff
GET    /api/v1/handoffs/:id               # Get handoff status
POST   /api/v1/handoffs/:id/accept        # Accept handoff
POST   /api/v1/handoffs/:id/reject        # Reject handoff
```

### Workflow Definition Format

```json
POST /api/v1/workflows
{
  "name": "research_and_summarize",
  "description": "Search, analyze, and summarize a topic",
  "steps": [
    {
      "id": "search",
      "toolId": "tool_abc123",
      "arguments": { "query": "{{input.topic}}" }
    },
    {
      "id": "analyze",
      "toolId": "tool_def456",
      "arguments": { "text": "{{steps.search.result.results}}" },
      "dependsOn": ["search"]
    },
    {
      "id": "summarize",
      "toolId": "tool_ghi789",
      "arguments": { "content": "{{steps.analyze.result.analysis}}" },
      "dependsOn": ["analyze"]
    }
  ],
  "inputSchema": {
    "type": "object",
    "properties": { "topic": { "type": "string" } },
    "required": ["topic"]
  },
  "errorStrategy": "stop_on_first",
  "timeoutMs": 120000
}
```

### DB Schema Changes

```sql
CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,         -- owner
  name TEXT NOT NULL,
  description TEXT,
  definition TEXT NOT NULL,       -- JSON (steps DAG)
  input_schema TEXT,
  status TEXT DEFAULT 'draft',    -- draft | active | archived
  is_public INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE workflow_runs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  triggered_by TEXT NOT NULL,     -- agent_id
  input TEXT,                     -- JSON
  output TEXT,                    -- JSON
  status TEXT DEFAULT 'pending',  -- pending | running | success | failed | cancelled
  current_step TEXT,
  step_results TEXT,              -- JSON: { stepId: { status, result, error } }
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

CREATE TABLE handoffs (
  id TEXT PRIMARY KEY,
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  context TEXT NOT NULL,          -- JSON: conversation context, task state
  status TEXT DEFAULT 'pending',  -- pending | accepted | rejected | completed
  workflow_run_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT,
  FOREIGN KEY (from_agent_id) REFERENCES agents(id),
  FOREIGN KEY (to_agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX idx_handoffs_to ON handoffs(to_agent_id, status);
```

### Frontend Needs
- Visual workflow builder (React Flow 또는 유사 라이브러리)
- 워크플로우 실행 모니터링 (실시간 step 진행 상태)
- Workflow 마켓플레이스 (공개 워크플로우 검색)

### Dependencies
- Phase 2 완료 (tool invocation이 동작해야 함)
- Durable Objects 검토 (장기 실행 워크플로우용)

---

## Phase 4: B2B Features (Week 19-28)

### Goal
엔터프라이즈 멀티테넌트, ACL, 감사 로그, 빌링, SLA 관리.

### Milestones

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| 19-20 | Multi-tenant (Organizations) | 조직 생성, 멤버 관리 |
| 21-22 | ACL & Permissions | RBAC, tool 접근 제어 |
| 23-24 | Audit Logging | 모든 액션 감사 로그, 검색/필터 |
| 25-26 | Billing & Usage | 사용량 추적, 스트라이프 연동 |
| 27-28 | SLA & Enterprise | SLA 대시보드, 전용 지원 |

### API Endpoints

```
# Organizations
POST   /api/v1/orgs                       # Create organization
GET    /api/v1/orgs/:orgId                # Get org detail
PUT    /api/v1/orgs/:orgId                # Update org
POST   /api/v1/orgs/:orgId/members        # Add member
DELETE /api/v1/orgs/:orgId/members/:id    # Remove member
PUT    /api/v1/orgs/:orgId/members/:id/role # Change role

# ACL
POST   /api/v1/orgs/:orgId/policies       # Create access policy
GET    /api/v1/orgs/:orgId/policies       # List policies
PUT    /api/v1/orgs/:orgId/policies/:id   # Update policy
DELETE /api/v1/orgs/:orgId/policies/:id   # Delete policy

# Audit
GET    /api/v1/orgs/:orgId/audit          # Query audit logs
GET    /api/v1/orgs/:orgId/audit/export   # Export audit logs (CSV)

# Billing
GET    /api/v1/orgs/:orgId/usage          # Current usage
GET    /api/v1/orgs/:orgId/invoices       # List invoices
POST   /api/v1/orgs/:orgId/billing/setup  # Setup Stripe
PUT    /api/v1/orgs/:orgId/plan           # Change plan

# SLA
GET    /api/v1/orgs/:orgId/sla            # SLA dashboard
GET    /api/v1/orgs/:orgId/sla/report     # SLA compliance report
```

### DB Schema Changes

```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',       -- free | pro | enterprise
  stripe_customer_id TEXT,
  settings TEXT,                  -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE org_members (
  org_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',     -- owner | admin | member | viewer
  joined_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, agent_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE access_policies (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  rules TEXT NOT NULL,            -- JSON: [{ resource, action, effect, conditions }]
  priority INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  agent_id TEXT NOT NULL,
  action TEXT NOT NULL,           -- tool:invoke, tool:register, workflow:execute, etc.
  resource_type TEXT,
  resource_id TEXT,
  details TEXT,                   -- JSON
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_org_time ON audit_logs(org_id, created_at);
CREATE INDEX idx_audit_agent ON audit_logs(agent_id, created_at);
CREATE INDEX idx_audit_action ON audit_logs(action);

CREATE TABLE usage_records (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  metric TEXT NOT NULL,           -- tool_calls | workflow_runs | data_transfer
  quantity REAL NOT NULL,
  period TEXT NOT NULL,           -- YYYY-MM
  recorded_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX idx_usage_org_period ON usage_records(org_id, period);

CREATE TABLE sla_configs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  tool_id TEXT,                   -- NULL = org-wide
  uptime_target REAL DEFAULT 0.999,
  latency_p99_ms INTEGER DEFAULT 5000,
  error_rate_max REAL DEFAULT 0.01,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);
```

### Frontend Needs
- Organization 관리 대시보드
- RBAC 설정 UI
- 감사 로그 뷰어 (검색, 필터, 내보내기)
- 빌링 대시보드 (Stripe Elements 연동)
- SLA 모니터링 대시보드

### Dependencies
- Phase 1-3 완료
- Stripe 계정 연동
- 법적 검토 (이용약관, 개인정보처리방침)

---

## Timeline Summary

```
Week  1-4   ████████░░░░░░░░░░░░░░░░░░░░  Phase 1: Tool Registry
Week  5-10  ░░░░░░░░████████████░░░░░░░░░  Phase 2: MCP Relay/Proxy
Week 11-18  ░░░░░░░░░░░░░░░░░░░░████████░  Phase 3: Workflow Engine
Week 19-28  ░░░░░░░░░░░░░░░░░░░░░░░░░░██████████  Phase 4: B2B

MVP Ship: End of Week 8 (Phase 1 + Phase 2 core)
Beta: End of Week 18
GA: End of Week 28
```

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ID format | `<type>_<nanoid(12)>` | 타입 프리픽스로 디버깅 용이 |
| JSON-RPC version | 2.0 | MCP spec 준수 |
| Auth token format | JWT (short-lived) + API key (long-lived) | 유연한 인증 |
| Rate limiting | Sliding window in D1 | Workers 환경 적합 |
| Async invocations | Durable Objects | 장기 실행 task 지원 |
| Log storage | D1 (hot) → R2 (cold, 30일+) | 비용 최적화 |
| WebSocket | Cloudflare Durable Objects | Stateful connection 관리 |
| Schema validation | Zod (server) + JSON Schema (API) | 런타임 타입 안전성 |
| Frontend | React + Tailwind (기존 유지) | 일관성 |

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| D1 write 제한 (1000 writes/sec) | 높은 트래픽에서 로깅 병목 | 배치 insert, R2 fallback |
| Workers CPU 제한 (30초) | 긴 워크플로우 타임아웃 | Durable Objects 활용 |
| MCP spec 변경 | API 호환성 깨짐 | 버전닝, adapter pattern |
| 기존 채팅 기능과 충돌 | 사용자 혼란 | 명확한 네비게이션, 점진적 UI 전환 |

---

*펭! 🐧 무펭이즘 기반 - 2026.02.15*
