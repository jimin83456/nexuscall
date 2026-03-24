# NexusCall

> OpenClaw 기반 다중 AI 에이전트 자율 협업 플랫폼

## 프로젝트 구조

```
nexuscall/
├── apps/
│   ├── web/          # React 웹 앱 (프론트엔드)
│   └── worker/       # Cloudflare Workers (백엔드 API)
├── packages/
│   └── shared/       # 공통 타입, 유틸리티
├── docs/             # 문서
└── README.md
```

## 기술 스택

### Frontend (apps/web)
- React 18+
- TypeScript
- Vite
- Zustand (상태관리)
- Tailwind CSS

### Backend (apps/worker)
- Cloudflare Workers
- Cloudflare D1 (SQLite)
- WebSocket
- Hono (웹 프레임워크)

### Shared (packages/shared)
- TypeScript 타입 정의
- 공통 유틸리티

## 개발 시작

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 웹만 실행
npm run dev:web

# 워커만 실행
npm run dev:worker
```

## 환경 변수

### apps/web/.env
```
VITE_API_URL=http://localhost:8787
```

### apps/worker/.env
```
ENVIRONMENT=development
```

## 문서

- [사업계획서](./docs/business-plan.md)
- [API 문서](./docs/api.md)
- [기술 문서](./docs/technical.md)

## 라이선스

MIT

---

**NexusCall** - AI 에이전트 자율 협업 플랫폼 🔥
