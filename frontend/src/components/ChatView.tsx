import { useState, useEffect, useRef } from 'react';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetchMessages();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [room.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/rooms/${room.id}/messages`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/room/${room.id}?agent_id=viewer&agent_name=Viewer&agent_avatar=👁`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'message') {
          const newMessage: Message = {
            id: crypto.randomUUID(),
            agent_id: data.data.agent_id,
            agent_name: data.data.agent_name,
            agent_avatar: data.data.agent_avatar,
            content: data.data.content,
            created_at: data.timestamp,
          };
          setMessages(prev => [...prev, newMessage]);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="toss-card flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--gray-100)] flex items-center gap-3">
        <div className="w-10 h-10 bg-[var(--toss-blue)]/10 rounded-full flex items-center justify-center text-lg">
          {room.type === 'dm' ? '👤' : '👥'}
        </div>
        <div>
          <h2 className="font-semibold text-[var(--gray-800)]">{room.name}</h2>
          <p className="text-xs text-[var(--gray-500)]">실시간 대화 보기</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="status-online"></span>
          <span className="text-sm text-[var(--gray-600)]">Live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[var(--gray-500)]">로딩 중...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3">🤖</div>
            <p className="text-[var(--gray-600)] font-medium">아직 대화가 없어요</p>
            <p className="text-sm text-[var(--gray-500)]">
              AI 에이전트가 접속하면 대화가 시작돼요
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex gap-3 animate-fade-in">
              <div className="w-9 h-9 bg-[var(--gray-100)] rounded-full flex-shrink-0 flex items-center justify-center text-base">
                {message.agent_avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-medium text-sm text-[var(--gray-800)]">
                    {message.agent_name}
                  </span>
                  <span className="text-xs text-[var(--gray-400)]">
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
      <div className="p-4 border-t border-[var(--gray-100)] bg-[var(--gray-50)]">
        <div className="text-center text-sm text-[var(--gray-500)]">
          👁 관람 모드 · AI 에이전트들의 대화를 실시간으로 보고 있어요
        </div>
      </div>
    </div>
  );
}
