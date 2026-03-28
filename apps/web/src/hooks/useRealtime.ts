import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

interface RealtimeEvent {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
  agentId?: string;
}

interface UseRealtimeOptions {
  workspaceId: string;
  onEvent?: (event: RealtimeEvent) => void;
  enabled?: boolean;
}

export function useRealtime({
  workspaceId,
  onEvent,
  enabled = true,
}: UseRealtimeOptions) {
  const token = useAuthStore((state) => state.token);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const messageQueueRef = useRef<RealtimeEvent[]>([]);

  // 이벤트 처리
  const handleEvent = useCallback((event: RealtimeEvent) => {
    onEvent?.(event);
  }, [onEvent]);

  // WebSocket 연결
  const connect = useCallback(() => {
    if (!token || !enabled || !workspaceId) return;

    // 기존 연결 종료
    if (wsRef.current) {
      wsRef.current.close();
    }

    // WebSocket URL 생성 (토큰을 쿼리 파라미터로 전달)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/realtime/ws/${workspaceId}?token=${encodeURIComponent(token)}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connected');
      setIsConnected(true);
      
      // 대기 중인 메시지 전송
      while (messageQueueRef.current.length > 0) {
        const event = messageQueueRef.current.shift();
        if (event) {
          ws.send(JSON.stringify(event));
        }
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as RealtimeEvent;
        
        // 이벤트 타입별 처리
        if (data.type === 'history') {
          // 히스토리 메시지들을 이벤트로 변환
          const messages = data.payload || [];
          messages.forEach((msg: any) => {
            handleEvent({
              id: msg.id,
              type: 'message',
              payload: msg,
              timestamp: new Date(msg.timestamp).toISOString(),
            });
          });
        } else if (data.type === 'pong') {
          // Ping-Pong 무시
        } else {
          handleEvent(data);
        }
      } catch (err) {
        console.error('[WebSocket] Failed to parse message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('[WebSocket] Error:', err);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
      
      // 3초 후 재연결
      reconnectTimeoutRef.current = window.setTimeout(() => {
        if (enabled) {
          connect();
        }
      }, 3000);
    };
  }, [token, enabled, workspaceId, handleEvent]);

  // 연결 시작
  useEffect(() => {
    if (enabled && token) {
      connect();
    }

    // Keep-alive ping (30초마다)
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      clearInterval(pingInterval);
    };
  }, [enabled, token, connect]);

  // 메시지 전송
  const sendMessage = useCallback((content: string, agentId?: string, agentName?: string) => {
    const event: RealtimeEvent = {
      id: crypto.randomUUID(),
      type: 'message',
      payload: { content, agentName },
      timestamp: new Date().toISOString(),
      agentId,
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    } else {
      // 연결되지 않은 경우 큐에 저장
      messageQueueRef.current.push(event);
    }
  }, []);

  // 에이전트 상태 변경
  const updateAgentStatus = useCallback((agentId: string, status: 'online' | 'offline' | 'busy' | 'error') => {
    const event: RealtimeEvent = {
      id: crypto.randomUUID(),
      type: 'agent_status',
      agentId,
      payload: { status },
      timestamp: new Date().toISOString(),
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  return {
    isConnected,
    sendMessage,
    updateAgentStatus,
  };
}
