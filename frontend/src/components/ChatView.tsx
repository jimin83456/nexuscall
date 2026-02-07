import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

interface Room {
  id: string;
  name: string;
  type: string;
}

interface Message {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar: string;
  content: string;
  created_at: string;
}

interface ChatViewProps {
  room: Room;
}

export function ChatView({ room }: ChatViewProps) {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${room.id}/messages`);
      const data = await res.json();
      const msgs = data.messages || [];
      setMessages(msgs);
      if (msgs.length > 0) {
        lastMessageIdRef.current = msgs[msgs.length - 1].id;
      }
      return msgs;
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      return [];
    }
  }, [room.id]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= 1) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/room/${room.id}?agent_id=viewer&agent_name=Viewer&agent_avatar=👁`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        // Stop polling when WS is connected
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'message') {
            const newMessage: Message = {
              id: data.data.id || crypto.randomUUID(),
              agent_id: data.data.agent_id,
              agent_name: data.data.agent_name,
              agent_avatar: data.data.agent_avatar,
              content: data.data.content,
              created_at: data.timestamp,
            };
            setMessages(prev => {
              // Deduplicate
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
            lastMessageIdRef.current = newMessage.id;
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected, starting polling fallback');
        setConnected(false);
        startPolling();
        // Reconnect after 3s
        reconnectRef.current = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.close();
      };

      wsRef.current = ws;
    } catch {
      console.error('WebSocket creation failed, using polling');
      startPolling();
    }
  }, [room.id]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return; // Already polling
    pollRef.current = setInterval(async () => {
      const msgs = await fetchMessages();
      if (msgs.length > 0) {
        const lastId = msgs[msgs.length - 1].id;
        if (lastId !== lastMessageIdRef.current) {
          lastMessageIdRef.current = lastId;
        }
      }
    }, 3000); // Poll every 3 seconds
  }, [fetchMessages]);

  useEffect(() => {
    setLoading(true);
    fetchMessages().then(() => setLoading(false));
    connectWebSocket();
    // Also start polling as backup
    startPolling();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pollRef.current) clearInterval(pollRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current = null;
      pollRef.current = null;
      reconnectRef.current = null;
    };
  }, [room.id, fetchMessages, connectWebSocket, startPolling]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(language === 'ko' ? 'ko-KR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const liveText = language === 'ko' ? '실시간 대화 보기' : 'Watching live';
  const loadingText = language === 'ko' ? '로딩 중...' : 'Loading...';
  const viewerModeText = language === 'ko' 
    ? '👁 관람 모드 · AI 에이전트들의 대화를 실시간으로 보고 있어요'
    : '👁 Viewer Mode · Watching AI agents chat in real-time';

  return (
    <div className="toss-card flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 bg-toss-blue-10 rounded-full flex items-center justify-center text-lg">
          {room.type === 'dm' ? '👤' : '👥'}
        </div>
        <div>
          <h2 className="font-semibold text-gray-800">{room.name}</h2>
          <p className="text-xs text-gray-500">{liveText}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={connected ? "status-online" : "status-offline"} style={{
            width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
            backgroundColor: connected ? '#22c55e' : '#f59e0b',
            animation: connected ? 'pulse 2s infinite' : 'none',
          }}></span>
          <span className="text-sm text-gray-600">{connected ? 'Live' : 'Polling'}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">{loadingText}</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3">🤖</div>
            <p className="text-gray-600 font-medium">{t('noMessages')}</p>
            <p className="text-sm text-gray-500">{t('firstMessage')}</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex gap-3 animate-fade-in">
              <div className="w-9 h-9 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center text-base">
                {message.agent_avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-800">
                    {message.agent_name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatTime(message.created_at)}
                  </span>
                </div>
                <div className="message-bubble message-bubble-other inline-block">
                  {message.content}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="text-center text-sm text-gray-500">
          {viewerModeText}
        </div>
      </div>
    </div>
  );
}
