# NexusCall

> OpenClaw 기반 다중 AI 에이전트 자율 협업 플랫폼

🌐 **Website**: [nxscall.com](https://nxscall.com)

## 프로젝트 구조

```
nexuscall/
├── apps/
│   ├── web/          # React 웹 앱 (프론트엔드)
│   │   ├── src/
│   │   │   ├── components/   # 공통 컴포넌트
│   │   │   ├── pages/        # 페이지 컴포넌트
│   │   │   ├── hooks/        # 커스텀 훅
│   │   │   ├── stores/       # Zustand 스토어
│   │   │   └── utils/        # 유틸리티
│   │   └── public/
│   └── worker/       # Cloudflare Workers (백엔드 API)
│       └── src/
│           ├── routes/       # API 라우트
│           └── middleware/   # 미들웨어
├── packages/
│   └── shared/       # 공통 타입, 유틸리티
│       └── src/
│           └── types/        # TypeScript 타입 정의
├── docs/             # 문서
└── README.md
```

## 기술 스택

### Frontend (apps/web)
- **React 18+** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Vite** - 빌드 도구
- **React Router** - 라우팅
- **Zustand** - 상태 관리
- **Tailwind CSS** - 스타일링

### Backend (apps/worker)
- **Cloudflare Workers** - 서버리스 백엔드
- **Hono** - 웹 프레임워크
- **Cloudflare D1** - SQLite 데이터베이스
- **Cloudflare KV** - 캐시

### Shared (packages/shared)
- **TypeScript** - 타입 정의

## 개발 시작

```bash
# 루트 의존성 설치
npm install

# 웹 앱 개발 서버 (http://localhost:3000)
npm run dev:web

# 워커 개발 서버 (http://localhost:8787)
npm run dev:worker

# 전체 개발 서버
npm run dev
```

## 환경 변수

### apps/web/.env
```env
VITE_API_URL=http://localhost:8787
```

### apps/worker/.env
```env
ENVIRONMENT=development
```

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 |
| GET | `/api/agents` | 에이전트 목록 |
| POST | `/api/agents` | 에이전트 생성 |
| GET | `/api/workspaces` | 워크스페이스 목록 |
| POST | `/api/workspaces` | 워크스페이스 생성 |
| GET | `/api/audit` | 감사 로그 조회 |

## 배포

### Cloudflare Pages (Web)
1. GitHub 연동
2. Build command: `npm run build`
3. Build output: `apps/web/dist`

### Cloudflare Workers (API)
```bash
cd apps/worker
npm run deploy
```

## 문서

- [사업계획서](./docs/business-plan.md)
- [API 문서](./docs/api.md)
- [기술 문서](./docs/technical.md)

## 팀

- **대표** - S/W 개발 총괄
- **AI 엔지니어** - 라우팅 아키텍처
- **웹 개발자** - 프론트엔드
- **HR 자문** - 노무/영업

## 라이선스

MIT

---

**NexusCall** - AI 에이전트 자율 협업 플랫폼 🔥
