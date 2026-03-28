import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Env }>();

// SSE 연결 (Server-Sent Events)
app.get('/connect', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  
  // SSE 헤더 설정
  return new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        // 연결 확인 메시지
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };
        
        // 초기 연결 메시지
        sendEvent('connected', { 
          userId: user.id,
          timestamp: new Date().toISOString(),
        });
        
        // Keep-alive (30초마다)
        const keepAlive = setInterval(() => {
          sendEvent('ping', { timestamp: new Date().toISOString() });
        }, 30000);
        
        // 연결 종료 시 정리
        // Note: Cloudflare Workers에서는 연결 종료 감지가 제한적
        // 실제 프로덕션에서는 Durable Objects 권장
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Nginx 버퍼링 비활성화
      },
    }
  );
});

// 브로드캐스트 메시지 전송
app.post('/broadcast', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  const body = await c.req.json();
  const { workspace_id, type, payload } = body;
  
  // 실제로는 Durable Objects나 Pub/Sub을 사용해서 연결된 클라이언트에 브로드캐스트
  // 여기서는 KV에 이벤트를 저장하고, 클라이언트가 폴링하거나 SSE로 수신
  
  const eventId = crypto.randomUUID();
  const event = {
    id: eventId,
    type,
    workspace_id,
    user_id: user.id,
    payload,
    timestamp: new Date().toISOString(),
  };
  
  // KV에 이벤트 저장 (최근 100개만 유지, 1시간 TTL)
  const eventsKey = `events:${workspace_id}`;
  await c.env.CACHE.put(
    eventsKey,
    JSON.stringify(event),
    { expirationTtl: 3600 }
  );
  
  return c.json({
    success: true,
    data: event,
    timestamp: new Date().toISOString(),
  });
});

// 이벤트 조회 (폴링용)
app.get('/events/:workspace_id', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  const workspaceId = c.req.param('workspace_id');
  const lastEventId = c.req.query('last_event_id');
  
  // 워크스페이스 소유자 확인
  const workspace = await c.env.DB.prepare(
    'SELECT id FROM workspaces WHERE id = ? AND owner_id = ?'
  ).bind(workspaceId, user.id).first();
  
  if (!workspace) {
    return c.json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '이 워크스페이스에 접근할 권한이 없습니다.',
      },
      timestamp: new Date().toISOString(),
    }, 403);
  }
  
  // KV에서 최근 이벤트 조회
  const eventsKey = `events:${workspaceId}`;
  const eventData = await c.env.CACHE.get(eventsKey);
  
  const events = eventData ? [JSON.parse(eventData)] : [];
  
  return c.json({
    success: true,
    data: {
      events,
      has_more: false,
    },
    timestamp: new Date().toISOString(),
  });
});

export default app;
