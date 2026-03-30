import { Hono } from 'hono';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// 6자리 인증번호 생성
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 인증번호 HTML 템플릿
function buildEmailHtml(code: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid #2a2a4a;">
    <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">NexusCall</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">AI 에이전트 자율 협업 플랫폼</p>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;color:#fff;font-size:18px;">이메일 인증</h2>
      <p style="margin:0 0 24px;color:#8888aa;font-size:14px;line-height:1.6;">아래 인증번호를 입력해주세요.<br>5분 이내에 입력하셔야 합니다.</p>
      <div style="background:#0f0f1a;border-radius:12px;padding:20px;text-align:center;border:1px dashed #f97316;">
        <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#f97316;font-family:monospace;">${code}</span>
      </div>
      <p style="margin:24px 0 0;color:#555577;font-size:12px;text-align:center;">
        본인이 요청하지 않은 경우 이 이메일을 무시해주세요.<br>
        NexusCall 팀
      </p>
    </div>
  </div>
</body>
</html>`;
}

// 인증번호 발송
app.post('/send-code', async (c) => {
  const body = await c.req.json();
  const { email, purpose } = body;

  if (!email) {
    return c.json({ success: false, error: { code: 'BAD_REQUEST', message: '이메일이 필요합니다.' } }, 400);
  }

  // 이메일 형식 검증
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ success: false, error: { code: 'INVALID_EMAIL', message: '올바른 이메일 형식이 아닙니다.' } }, 400);
  }

  // Rate limiting (이메일당 1분)
  const recent = await c.env.DB.prepare(
    'SELECT id FROM email_verification WHERE email = ? AND created_at > datetime("now", "-1 minute")'
  ).bind(email).first();

  if (recent) {
    return c.json({ success: false, error: { code: 'RATE_LIMITED', message: '1분 후에 다시 요청해주세요.' } }, 429);
  }

  // 회원가입 시 이미 가입된 이메일인지 확인
  if (purpose === 'register') {
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();
    if (existing) {
      return c.json({ success: false, error: { code: 'EMAIL_EXISTS', message: '이미 등록된 이메일입니다.' } }, 400);
    }
  }

  // 코드 생성
  const code = generateCode();
  const id = crypto.randomUUID();

  // DB 저장 (5분 만료)
  await c.env.DB.prepare(
    'INSERT INTO email_verification (id, email, code, purpose, expires_at) VALUES (?, ?, ?, ?, datetime("now", "+5 minutes"))'
  ).bind(id, email, code, purpose || 'register').run();

  // 이메일 발송 (Resend)
  const resendApiKey = c.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    // 개발 환경: 코드를 응답으로 반환
    console.log(`[DEV] Verification code for ${email}: ${code}`);
    return c.json({
      success: true,
      data: {
        message: '인증번호가 발송되었습니다.',
        expiresIn: 300,
        // 개발용: 실제 배포에서는 아래 줄 제거
        _devCode: code,
      },
    });
  }

  // 프로덕션: Resend로 발송
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NexusCall <noreply@nxscall.com>',
        to: email,
        subject: '[NexusCall] 이메일 인증번호',
        html: buildEmailHtml(code),
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Resend error:', err);
      return c.json({ success: false, error: { code: 'EMAIL_FAILED', message: '이메일 발송에 실패했습니다.' } }, 500);
    }
  } catch (err) {
    console.error('Email send error:', err);
    return c.json({ success: false, error: { code: 'EMAIL_FAILED', message: '이메일 발송에 실패했습니다.' } }, 500);
  }

  return c.json({
    success: true,
    data: { message: '인증번호가 발송되었습니다.', expiresIn: 300 },
  });
});

// 인증번호 확인
app.post('/verify-code', async (c) => {
  const body = await c.req.json();
  const { email, code, purpose } = body;

  if (!email || !code) {
    return c.json({ success: false, error: { code: 'BAD_REQUEST', message: '이메일과 인증번호가 필요합니다.' } }, 400);
  }

  if (!/^\d{6}$/.test(code)) {
    return c.json({ success: false, error: { code: 'INVALID_CODE', message: '인증번호는 6자리 숫자입니다.' } }, 400);
  }

  // DB에서 코드 확인
  const record = await c.env.DB.prepare(
    'SELECT id, verified, expires_at FROM email_verification WHERE email = ? AND code = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(email, code, purpose || 'register').first() as any;

  if (!record) {
    return c.json({ success: false, error: { code: 'INVALID_CODE', message: '인증번호가 올바르지 않습니다.' } }, 400);
  }

  if (record.verified) {
    return c.json({ success: false, error: { code: 'ALREADY_VERIFIED', message: '이미 인증된 코드입니다.' } }, 400);
  }

  // 만료 확인
  if (new Date(record.expires_at) < new Date()) {
    return c.json({ success: false, error: { code: 'CODE_EXPIRED', message: '인증번호가 만료되었습니다. 다시 요청해주세요.' } }, 400);
  }

  // 인증 완료
  await c.env.DB.prepare(
    'UPDATE email_verification SET verified = 1 WHERE id = ?'
  ).bind(record.id).run();

  return c.json({
    success: true,
    data: { message: '이메일 인증이 완료되었습니다.' },
  });
});

// 인증 상태 확인 (회원가입 폼에서 폴링)
app.get('/check/:email', async (c) => {
  const email = c.req.param('email');
  const purpose = c.req.query('purpose') || 'register';

  const record = await c.env.DB.prepare(
    'SELECT verified FROM email_verification WHERE email = ? AND purpose = ? AND expires_at > datetime("now") ORDER BY created_at DESC LIMIT 1'
  ).bind(email, purpose).first() as any;

  return c.json({
    success: true,
    data: {
      verified: !!record?.verified,
    },
  });
});

export default app;
