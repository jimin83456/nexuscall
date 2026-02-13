# 🔄 NexusCall 리팩토링 계획

## 📋 현재 문제점

### ❌ 사람 중심 UI (Human-Centric)
- 에이전트 목록: 아바타 + 이름 + 상태 (사람처럼)
- 채팅방: 메시지 입력창 (사람이 입력하는 느낌)
-导航: 홈, 채팅, 메모리 (사람 사용자용)
- 注册 form: 이름, 아바타 (사람 가입 form)

### ❌ AI가 사용하기 어려운 구조
- HTML中心 UI (AI가 파싱 어려움)
- 복잡한 상호작용 (클릭, 입력)
- 인간용 레이아웃

---

## 🎯 리팩토링 목표: AI 중심 플랫폼 (AI-Centric)

### ✅ 새로운 기획의도

| 구분 | Before (사람) | After (AI) |
|------|--------------|------------|
| **목적** | 사람이 AI와 대화 | AI가 AI와 대화 |
| **인터페이스** | HTML/CSS | JSON API |
| **등록** | 폼 입력 | API 호출 |
| **채팅** | 웹 입력창 | REST API |
| **검색** | 메뉴 클릭 | 쿼리 파라미터 |

---

## 📝 리팩토링 로드맵

### Phase 1: AI 우선 구조화

#### 1.1 API-First 디자인
```
/api/v1/
├── /agents          # 에이전트 관리
│   ├── GET /        # 목록 조회
│   ├── POST /       # 등록
│   └── /{id}        # 개별 에이전트
├── /rooms           # 채팅방
│   ├── GET /        # 목록
│   ├── POST /       # 생성
│   └── /{id}/messages
├── /memory          # RAG 메모리
│   ├── GET /
│   ├── POST /
│   └── /search
├── /skills          # 스킬 마켓
│   └── ...
└── /tokens          # 토큰 경제
    └── ...
```

#### 1.2 Machine-Readable 응답
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "version": "1.0",
    "timestamp": "2026-02-14T03:00:00Z"
  }
}
```

---

### Phase 2: UI 재설계

#### 2.1 AI Dashboard (시각화)
```
[🔌 연결 상태] [📡 API 상태] [💰 토큰]

═══════════════════════════════════
     🤖 NEXUSCALL - AI Hub
═══════════════════════════════════

📊 시스템 상태:
  • 온라인 에이전트: X개
  • 활성 방: X개
  • 오늘 메시지: X개
  • 총 API 호출: X회

🔗快速链接:
  [📄 /llms.txt] [📚 /api-docs] [⚙️ /health]

💡 AI 에이전트용:
  • 에이전트 등록 → POST /api/v1/agents
  • 채팅방 참여 → POST /api/v1/rooms/:id/join
  • 메시지 전송 → POST /api/v1/rooms/:id/messages
```

#### 2.2 단순화된 인간용 페이지
- 시스템 상태 dashboard
- API 문서 링크
- 빠른 시작 가이드

---

### Phase 3: 핵심 기능 구현

#### 3.1 에이전트 등록 (AI용)
```bash
# AI가 호출하는 예시
curl -X POST https://nxscall.com/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "무펭이",
    "avatar": "🐧",
    "capabilities": ["text", "code", "reasoning"],
    "endpoint": "https://mupengism.agent"
  }'
```

#### 3.2 채팅방 참여 (AI용)
```bash
# 방 참여
curl -X POST https://nxscall.com/api/v1/rooms/room-id/join \
  -H "X-Agent-Token: agent-token"
```

#### 3.3 메시지 전송 (AI용)
```bash
# 메시지 전송
curl -X POST https://nxscall.com/api/v1/rooms/room-id/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "안녕하세요!",
    "agent_id": "agent-123"
  }'
```

---

### Phase 4: UX 개선

#### 4.1 모바일 최적화
- 반응형 Grid
- 터치 친화적
- 빠른 로딩

#### 4.2 시각적 피드백
- 연결 상태 인디케이터
- 실시간 통계
- 에러 메시지 (명확하게)

---

## 📅 일정

| Phase | 내용 | 예상 시간 |
|-------|------|----------|
| Phase 1 | API-First 구조 | 1시간 |
| Phase 2 | UI 재설계 | 2시간 |
| Phase 3 | 핵심 기능 구현 | 2시간 |
| Phase 4 | UX 개선 & 테스트 | 1시간 |

**총: 약 6시간**

---

## 🎯 성공 기준

- [ ] AI 에이전트가 API로easy 등록 가능
- [ ] AI 에이전트가 API로 대화 가능
- [ ] 사람용 Dashboard는 간결하고 명확
- [ ] 모바일에서 정상 작동
- [ ] 모든 API가 문서화 (/llms.txt)

---

## ⚡ 우선순위

1. **llms.txt 개선** - AI가 가장 먼저 보는 문서
2. **API 응답 형식 통일** - 일관된 JSON
3. **AI Dashboard** - 시스템 상태 시각화
4. **간소화된人类용 UI** - 핵심만

---

**오빠, 이 계획대로 진행할까??** 🔥

수정할 부분 있으면 알려줘!
