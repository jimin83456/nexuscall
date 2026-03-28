import { Hono } from 'hono';
import type { Env } from '../index';
import { verifyJWT } from '../utils/auth';
import { executeCollaboration, type AgentTask } from '../ai/engine';
import { getUserApiKey } from './api-keys';

const app = new Hono<{ Bindings: Env }>();

// 에이전트 작업 생성 및 실행
app.post('/execute', async (c) => {
  const token = c.req.query('token') || c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return c.json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '토큰이 필요합니다.' },
      timestamp: new Date().toISOString(),
    }, 401);
  }

  try {
    const result = await verifyJWT(token, c.env);
    
    if (!result.valid || !result.payload) {
      return c.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' },
        timestamp: new Date().toISOString(),
      }, 401);
    }

    const userId = result.payload.id as string;
    const body = await c.req.json();
    const { workspaceId, agentId, input } = body;

    // 워크스페이스 확인
    const workspace = await c.env.DB.prepare(
      'SELECT id, name FROM workspaces WHERE id = ? AND owner_id = ?'
    ).bind(workspaceId, userId).first();

    if (!workspace) {
      return c.json({
        success: false,
        error: { code: 'FORBIDDEN', message: '이 워크스페이스에 접근할 권한이 없습니다.' },
        timestamp: new Date().toISOString(),
      }, 403);
    }

    // 에이전트 확인
    const agent = await c.env.DB.prepare(
      'SELECT * FROM agents WHERE id = ? AND workspace_id = ?'
    ).bind(agentId, workspaceId).first() as any;

    if (!agent) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: '에이전트를 찾을 수 없습니다.' },
        timestamp: new Date().toISOString(),
      }, 404);
    }

    // BYOK: 사용자의 API 키 조회
    const masterSecret = c.env.ENCRYPTION_SECRET || c.env.JWT_SECRET || 'default-secret-change-me';
    
    // 사용자가 설정한 provider 확인 (기본: openai)
    const provider = (c.env as any).AI_PROVIDER || 'openai';
    const userApiKey = await getUserApiKey(c.env.DB, userId, provider, masterSecret);

    if (!userApiKey) {
      return c.json({
        success: false,
        error: {
          code: 'API_KEY_NOT_FOUND',
          message: `${provider.toUpperCase()} API 키가 등록되지 않았습니다. 설정에서 API 키를 등록해주세요.`,
        },
        timestamp: new Date().toISOString(),
      }, 400);
    }

    // 같은 워크스페이스의 다른 에이전트들 조회
    const { results: otherAgents } = await c.env.DB.prepare(
      'SELECT id, name, type FROM agents WHERE workspace_id = ? AND id != ? AND status = ?'
    ).bind(workspaceId, agentId, 'online').all() as any;

    // 작업 생성
    const task: AgentTask = {
      id: crypto.randomUUID(),
      workspaceId,
      userId,
      agentId: agent.id,
      agentType: agent.type,
      agentName: agent.name,
      input,
      status: 'running',
      createdAt: new Date(),
    };

    // Durable Object에 브로드캐스트
    const broadcastMessage = async (message: any) => {
      try {
        const roomId = c.env.WORKSPACE_ROOM.idFromName(workspaceId);
        const room = c.env.WORKSPACE_ROOM.get(roomId);
        await room.fetch(new Request('https://internal/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        }));
      } catch (err) {
        console.error('Broadcast error:', err);
      }
    };

    // 에이전트 상태 busy로 변경
    await c.env.DB.prepare(
      'UPDATE agents SET status = ? WHERE id = ?'
    ).bind('busy', agentId).run();

    await broadcastMessage({
      type: 'agent_status',
      payload: { agentId, status: 'busy', timestamp: new Date().toISOString() },
    });

    // 비동기로 작업 실행
    (async () => {
      try {
        const aiResult = await executeCollaboration(task, {
          provider: provider as any,
          apiKey: userApiKey,
          model: (c.env as any).AI_MODEL || undefined,
          otherAgents: otherAgents || [],
          workspaceName: workspace.name as string,
          broadcastMessage,
        });

        // 감사 로그 저장
        await c.env.DB.prepare(
          'INSERT INTO audit_logs (id, workspace_id, agent_id, action, details) VALUES (?, ?, ?, ?, ?)'
        ).bind(
          crypto.randomUUID(),
          workspaceId,
          agentId,
          'decision_made',
          JSON.stringify({ input, result: aiResult })
        ).run();

        // 결과 브로드캐스트
        await broadcastMessage({
          type: 'agent_result',
          agentId,
          agentName: agent.name,
          content: aiResult,
          timestamp: new Date().toISOString(),
        });

      } catch (err) {
        console.error('Task execution error:', err);
        await broadcastMessage({
          type: 'agent_error',
          agentId,
          agentName: agent.name,
          error: String(err),
          timestamp: new Date().toISOString(),
        });
      } finally {
        await c.env.DB.prepare(
          'UPDATE agents SET status = ? WHERE id = ?'
        ).bind('online', agentId).run();

        await broadcastMessage({
          type: 'agent_status',
          payload: { agentId, status: 'online', timestamp: new Date().toISOString() },
        });
      }
    })();

    return c.json({
      success: true,
      data: {
        taskId: task.id,
        status: 'running',
        provider,
        message: '작업이 시작되었습니다. WebSocket으로 결과를 수신하세요.',
      },
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: String(err) },
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

export default app;
