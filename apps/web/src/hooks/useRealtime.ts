import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

interface RealtimeEvent {
  id: string;
  type: string;
  workspace_id: string;
  user_id: string;
  payload: any;
  timestamp: string;
}

interface UseRealtimeOptions {
  workspaceId: string;
  onEvent?: (event: RealtimeEvent) => void;
  pollingInterval?: number; // milliseconds
  enabled?: boolean;
}

export function useRealtime({
  workspaceId,
  onEvent,
  pollingInterval = 5000, // 기본 5초
  enabled = true,
}: UseRealtimeOptions) {
  const { token } = useAuthStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  const lastEventIdRef = useRef<string>('');

  // 이벤트 처리
  const handleEvent = useCallback((event: RealtimeEvent) => {
    if (event.id !== lastEventIdRef.current) {
      lastEventIdRef.current = event.id;
      onEvent?.(event);
    }
  }, [onEvent]);

  // SSE 연결 (Server-Sent Events)
  const connectSSE = useCallback(() => {
    if (!token || !enabled) return;

    const eventSource = new EventSource(
      `/api/realtime/connect?token=${token}`
    );

    eventSource.onopen = () => {
      console.log('[Realtime] SSE connected');
    };

    eventSource.addEventListener('connected', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      console.log('[Realtime] Connected as:', data.userId);
    });

    eventSource.addEventListener('message', (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data) as RealtimeEvent;
        handleEvent(event);
      } catch (err) {
        console.error('[Realtime] Failed to parse event:', err);
      }
    });

    eventSource.addEventListener('ping', (e: MessageEvent) => {
      // Keep-alive ping
    });

    eventSource.onerror = (err) => {
      console.error('[Realtime] SSE error:', err);
      eventSource.close();
      
      // 5초 후 재연결 시도
      setTimeout(() => {
        if (enabled) {
          connectSSE();
        }
      }, 5000);
    };

    eventSourceRef.current = eventSource;
  }, [token, enabled, handleEvent]);

  // 폴링 (fallback)
  const startPolling = useCallback(async () => {
    if (!token || !enabled) return;

    try {
      const response = await fetch(
        `/api/realtime/events/${workspaceId}?last_event_id=${lastEventIdRef.current}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success && data.data.events) {
        data.data.events.forEach((event: RealtimeEvent) => {
          handleEvent(event);
        });
      }
    } catch (err) {
      console.error('[Realtime] Polling error:', err);
    }
  }, [token, workspaceId, enabled, handleEvent]);

  // 연결 시작
  useEffect(() => {
    if (!enabled || !token) return;

    // SSE 시도
    connectSSE();

    // 폴링 시작 (fallback)
    startPolling();
    pollingIntervalRef.current = setInterval(startPolling, pollingInterval);

    // 정리
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [enabled, token, connectSSE, startPolling, pollingInterval]);

  // 이벤트 브로드캐스트
  const broadcast = useCallback(async (type: string, payload: any) => {
    if (!token) return;

    try {
      await fetch('/api/realtime/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          type,
          payload,
        }),
      });
    } catch (err) {
      console.error('[Realtime] Broadcast error:', err);
    }
  }, [token, workspaceId]);

  return {
    broadcast,
    isConnected: !!eventSourceRef.current,
  };
}
