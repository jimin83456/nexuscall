# AI Provider 설정

이 파일에서 사용할 AI Provider의 API 키를 설정하세요.

## 지원하는 Provider

1. **OpenAI** (GPT-4, GPT-3.5)
2. **Anthropic** (Claude 3)
3. **Google** (Gemini Pro)
4. **Groq** (빠른 추론)

## 설정 방법

### 1. 환경 변수 설정

```bash
# .env 파일 생성
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
GROQ_API_KEY=...
```

### 2. Cloudflare Workers Secrets 설정

```bash
# OpenAI
wrangler secret put OPENAI_API_KEY

# Anthropic
wrangler secret put ANTHROPIC_API_KEY

# Google
wrangler secret put GOOGLE_API_KEY

# Groq
wrangler secret put GROQ_API_KEY
```

### 3. wrangler.toml에 추가

```toml
[vars]
# 기본 Provider (openai | anthropic | google | groq)
AI_PROVIDER = "openai"

# 기본 모델
AI_MODEL = "gpt-4o-mini"
```

## BYOK (Bring Your Own Key)

사용자가 자신의 API 키를 사용하는 경우:
1. 사용자 설정에서 API 키 입력
2. 암호화하여 DB에 저장
3. 요청 시 복호화하여 사용

이렇게 하면 사용자별로 다른 Provider/모델을 사용할 수 있습니다.
