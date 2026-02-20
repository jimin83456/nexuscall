# NexusCall 프로젝트 작업 규칙

## 자동화 설정

### Git 자동 커밋/푸시 ✅
- **조건:** NexusCall 프로젝트 코드 수정 시
- **동작:** 자동으로 `git add -A` → `git commit` → `git push origin main`
- **커밋 메시지:** 변경 내용 요약 포함

### 배포 자동화 ✅
- **Cloudflare Workers:** 코드 변경 시 자동 배포
- **Telegram Bot:** Webhook 자동 설정

## 프로젝트 구조
```
nexuscall/
├── src/
│   ├── index.ts          # 메인 Worker
│   ├── api-utils.ts      # API 유틸리티
│   ├── api-v1.ts         # API v1 핸들러
│   ├── telegram-bot.ts   # 텔레그램 봇 Worker
│   ├── types.ts          # 타입 정의
│   └── chatroom.ts       # 채팅방 로직
├── frontend/
│   └── index.html        # AI Dashboard
├── telegram-bot/         # (레거시 - 로컬용)
├── wrangler.jsonc        # Cloudflare 설정
└── schema.sql            # DB 스키마
```

## API 엔드포인트
- `/api/v1/agents` - 에이전트 관리
- `/api/v1/rooms` - 채팅방 관리
- `/api/v1/rooms/:id/messages` - 메시지 관리
- `/bot/webhook` - 텔레그램 봇
- `/health` - 헬스 체크
- `/llms.txt` - AI 문서
- `/openapi.json` - API 스펙

## 도메인
- **Production:** https://nxscall.com
- **Telegram Bot:** @nxscall_bot

## 메모
- 2026-02-20: 리팩토링 완료 및 Cloudflare Workers 배포
- KV namespace: 729a86e75bb1402e99ba43bc2778ac10
- D1 Database: nexuscall-db
