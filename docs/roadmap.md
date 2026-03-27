# NexusCall 개발 로드맵

> 협약기간: 8개월 (2026년 6월 ~ 2027년 1월 예상)

---

## 🎯 목표

### 산출물
- 웹 기반 워크스페이스 (1식)
- AI 에이전트 연동용 표준 라우팅 API (1식)

### 협약기간 내 목표
| 구분 | 목표 수치 |
|------|-----------|
| MVP 완성 | 1식 |
| 파일럿 테스트 기업 | 3사 |
| 테스트 사용자 | 30명 |
| 스킬 마켓 베타 | 5개 |

---

## 📅 Phase 1: 기반 구축 (1~2개월)

### Week 1-2: 프로젝트 세팅
- [x] Monorepo 구조 생성
- [x] Cloudflare Workers + D1 + KV 설정
- [x] React 웹앱 기본 세팅
- [x] GitHub Actions CI/CD 구축
- [x] Cloudflare 배포 자동화

### Week 3-4: 코어 아키텍처 설계
- [ ] 통신 프로토콜 설계
- [ ] 라우팅 API 1차 구현
- [ ] D1 데이터베이스 스키마 설계
- [ ] API 문서 작성

### Week 5-8: API 개발
- [ ] 에이전트 CRUD API
- [ ] 워크스페이스 CRUD API
- [ ] 감사 로그 API
- [ ] 인증/인가 시스템 (JWT)

---

## 📅 Phase 2: UI 개발 (3~4개월)

### Week 9-12: 웹앱 UI 구현
- [ ] 랜딩 페이지 고도화
- [ ] 워크스페이스 UI
- [ ] 에이전트 관리 UI
- [ ] 감사 로그 대시보드
- [ ] 사용자 설정 페이지

### Week 13-16: 실시간 통신
- [ ] WebSocket 서버 구현
- [ ] 에이전트 간 메시징 시스템
- [ ] 실시간 상태 업데이트
- [ ] 관전 모드 (Audit Log) UI

---

## 📅 Phase 3: MVP 실증 (5~6개월)

### Week 17-20: MVP 개발 완료
- [ ] 핵심 기능 통합 테스트
- [ ] 에러 핸들링 강화
- [ ] 성능 최적화
- [ ] 보안 점검

### Week 21-24: 파일럿 테스트
- [ ] F&B 매장 파일럿 테스트
- [ ] 중소기업 2사 파일럿 테스트
- [ ] 피드백 수집 및 분석
- [ ] 버그 수정 및 개선

---

## 📅 Phase 4: 베타 오픈 (7~8개월)

### Week 25-28: 안정화
- [ ] 파일럿 피드백 반영
- [ ] UI/UX 개선
- [ ] 문서화 완료
- [ ] 클로즈드 베타 진행

### Week 29-32: 스킬 마켓 기획
- [ ] 스킬 마켓 기본 구조 설계
- [ ] 스킬 업로드 API
- [ ] 스킬 검색/필터링
- [ ] 결제 시스템 연동 (토스페이먼츠)

---

## 🏗️ 기술 스택

### Frontend
| 기술 | 용도 |
|------|------|
| React 18 | UI 라이브러리 |
| TypeScript | 타입 안전성 |
| Vite | 빌드 도구 |
| React Router | 라우팅 |
| Zustand | 상태 관리 |
| Tailwind CSS | 스타일링 |
| React Query | 서버 상태 |

### Backend
| 기술 | 용도 |
|------|------|
| Cloudflare Workers | 서버리스 API |
| Hono | 웹 프레임워크 |
| D1 (SQLite) | 데이터베이스 |
| KV | 캐시 |
| WebSocket | 실시간 통신 |

### DevOps
| 기술 | 용도 |
|------|------|
| GitHub Actions | CI/CD |
| Cloudflare | 호스팅 |
| nxscall.com | 도메인 |

---

## 🗄️ 데이터베이스 스키마

### users
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### workspaces
```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'private',
  owner_id TEXT NOT NULL,
  settings TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

### agents
```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  config TEXT, -- JSON
  status TEXT DEFAULT 'offline',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
```

### audit_logs
```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

---

## 🎯 마일스톤

| 날짜 | 마일스톤 | 산출물 |
|------|----------|--------|
| M+2개월 | 코어 API 완료 | 라우팅 API v1 |
| M+4개월 | 웹앱 UI 완료 | 워크스페이스 UI |
| M+6개월 | MVP 완료 | 통합 테스트 완료 |
| M+8개월 | 베타 오픈 | 클로즈드 베타 |

---

## 📊 진척도 추적

- GitHub Projects: https://github.com/jimin83456/nexuscall/projects
- 이슈 관리: GitHub Issues
- 문서: /docs

---

## 🔄 업데이트

이 로드맵은 매주 업데이트됩니다.

**최종 수정:** 2026-03-27
