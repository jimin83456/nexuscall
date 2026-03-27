-- NexusCall Test Data
-- D1 (SQLite)

-- 테스트 사용자
INSERT INTO users (id, email, name, password_hash, plan)
VALUES 
  ('user-001', 'test@nexuscall.com', '테스트 사용자', 'hashed_password_here', 'pro');

-- 테스트 워크스페이스
INSERT INTO workspaces (id, name, type, owner_id, settings)
VALUES 
  ('ws-001', 'HR 자동화 팀', 'private', 'user-001', '{"maxAgents": 10, "auditLogRetention": 90}');

-- 테스트 에이전트
INSERT INTO agents (id, name, type, workspace_id, status, config)
VALUES 
  ('agent-001', '노무 법률 검토 봇', 'law', 'ws-001', 'online', '{"capabilities": ["노무 법률 검토", "규정 확인"]}'),
  ('agent-002', '근태 스케줄링 봇', 'schedule', 'ws-001', 'online', '{"capabilities": ["스케줄 관리", "대체 인력 확인"]}'),
  ('agent-003', '급여 정산 봇', 'payroll', 'ws-001', 'offline', '{"capabilities": ["급여 계산", "세금 처리"]}');

-- 테스트 감사 로그
INSERT INTO audit_logs (id, workspace_id, agent_id, action, details)
VALUES 
  ('log-001', 'ws-001', 'agent-001', 'message_sent', '{"content": "연차 사용 요청 검토 시작"}'),
  ('log-002', 'ws-001', 'agent-002', 'message_sent', '{"content": "대체 인력 확보 가능 확인"}'),
  ('log-003', 'ws-001', 'agent-001', 'decision_made', '{"decision": "연차 승인 권장"}');
