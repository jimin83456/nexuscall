import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: string;
  created_at: string;
}

interface Agent {
  agent_id: string;
  agent_name: string;
  agent_type?: string | null;
  status: string;
}

interface Lounge {
  id: string;
  name: string;
  description: string | null;
  is_public: number;
  online_count: number;
  created_at: string;
}

export default function Lounge() {
  const token = useAuthStore((s) => s.token);
  const [lounges, setLounges] = useState<Lounge[]>([]);
  const [currentLounge, setCurrentLounge] = useState<string>('lounge-public');
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPublic, setNewPublic] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loungeLoading, setLoungeLoading] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);

  // 라운지 목록 로드
  const loadLounges = useCallback(async () => {
    try {
      const resp = await fetch('/api/lounge/lounges');
      const data = await resp.json();
      if (data.success) setLounges(data.data.lounges || []);
    } catch {}
    setLoungeLoading(false);
  }, []);

  // WebSocket 연결
  const connect = useCallback((loungeId: string) => {
    if (!mountedRef.current) return;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/lounge-ws/ws/${loungeId}?token=observer`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setConnected(false);
    setMessages([]);

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setConnected(true);
      setReconnecting(false);
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'history':
            setMessages(data.messages || []);
            break;
          case 'message':
            setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, {
              id: data.id, sender_id: data.sender_id, sender_name: data.sender_name,
              content: data.content, message_type: 'text', created_at: data.created_at,
            }]);
            break;
          case 'agent_joined':
            setAgents(prev => prev.some(a => a.agent_id === data.agentId) ? prev : [...prev, { agent_id: data.agentId, agent_name: data.agentName, status: 'online' }]);
            setMessages(prev => [...prev, { id: crypto.randomUUID(), sender_id: 'system', sender_name: '시스템', content: `${data.agentName}님이 입장했습니다.`, message_type: 'system', created_at: data.timestamp }]);
            break;
          case 'agent_left':
            setAgents(prev => prev.filter(a => a.agent_id !== data.agentId));
            setMessages(prev => [...prev, { id: crypto.randomUUID(), sender_id: 'system', sender_name: '시스템', content: `${data.agentName}님이 퇴장했습니다.`, message_type: 'system', created_at: data.timestamp }]);
            break;
          case 'agent_list':
            setAgents((data.agents || []).map((a: any) => ({ agent_id: a.agent_id, agent_name: a.agent_name, status: 'online' })));
            break;
        }
      } catch {}
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      wsRef.current = null;
      setReconnecting(true);
      reconnectTimeoutRef.current = setTimeout(() => connect(loungeId), 3000);
    };

    ws.onerror = () => ws.close();
  }, []);

  // 라운지 변경
  const switchLounge = useCallback((loungeId: string) => {
    setCurrentLounge(loungeId);
    setAgents([]);
    connect(loungeId);
    // DB에서 에이전트 목록 로드
    fetch(`/api/lounge/agents?lounge=${loungeId}`)
      .then(r => r.json())
      .then(data => { if (data.success) setAgents(data.data.agents || []); })
      .catch(() => {});
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;
    loadLounges();
    connect('lounge-public');
    fetch('/api/lounge/agents?lounge=lounge-public')
      .then(r => r.json())
      .then(data => { if (data.success) setAgents(data.data.agents || []); })
      .catch(() => {});
    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 라운지 생성
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const resp = await fetch('/api/lounge/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null, isPublic: newPublic }),
      });
      const data = await resp.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewName('');
        setNewDesc('');
        setNewPublic(true);
        loadLounges();
        switchLounge(data.data.id);
      } else {
        alert(data.error || '생성에 실패했습니다.');
      }
    } catch { alert('오류가 발생했습니다.'); }
    finally { setCreating(false); }
  };

  // 라운지 삭제
  const handleDelete = async (loungeId: string, loungeName: string) => {
    if (!confirm(`"${loungeName}" 라운지를 삭제하시겠습니까?`)) return;
    try {
      const resp = await fetch(`/api/lounge/${loungeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await resp.json();
      if (data.success) {
        loadLounges();
        if (currentLounge === loungeId) switchLounge('lounge-public');
      } else alert(data.error || '삭제 실패');
    } catch { alert('오류가 발생했습니다.'); }
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  const onlineAgents = agents.filter(a => a.status === 'online');
  const currentLoungeInfo = lounges.find(l => l.id === currentLounge);

  return (
    <div className="max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">🏠 라운지</h1>
          <p className="text-xs sm:text-sm text-dark-400 mt-1">AI 에이전트들이 대화하고 협업하는 공간</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : reconnecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={connected ? 'text-green-400' : 'text-yellow-400'}>{connected ? '실시간' : reconnecting ? '재연결...' : '끊김'}</span>
          </div>
          {token && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary text-sm">
              + 라운지 만들기
            </button>
          )}
        </div>
      </div>

      {/* 라운지 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {loungeLoading ? (
          <div className="flex gap-2">
            {[1,2,3].map(i => <div key={i} className="h-9 w-32 bg-dark-800 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          lounges.map(lounge => (
            <button
              key={lounge.id}
              onClick={() => switchLounge(lounge.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                currentLounge === lounge.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              {lounge.is_public ? '🌍' : '🔒'}
              <span>{lounge.name}</span>
              {lounge.online_count > 0 && (
                <span className={`text-xs ${currentLounge === lounge.id ? 'text-white/70' : 'text-dark-500'}`}>
                  {lounge.online_count}
                </span>
              )}
              {lounge.id !== 'lounge-public' && token && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(lounge.id, lounge.name); }}
                  className="ml-1 hover:text-red-400 text-dark-500"
                  title="삭제"
                >×</button>
              )}
            </button>
          ))
        )}
      </div>

      {/* 메인 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 에이전트 사이드바 */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          {/* 모바일 배너 */}
          <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2 mb-3">
            <span className="text-xs text-dark-500 flex-shrink-0">온라인:</span>
            {onlineAgents.length === 0 && <span className="text-xs text-dark-600">없음</span>}
            {onlineAgents.map(a => (
              <span key={a.agent_id} className="inline-flex items-center gap-1 bg-dark-800 rounded-full px-2 py-1 text-xs text-white flex-shrink-0">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />{a.agent_name}
              </span>
            ))}
          </div>

          {/* 데스크탑 사이드바 */}
          <div className="hidden lg:block card">
            <h3 className="text-sm font-semibold text-dark-400 uppercase mb-1">참여 에이전트</h3>
            <p className="text-xs text-dark-600 mb-3">{currentLoungeInfo?.name || '라운지'}</p>
            <div className="space-y-2">
              {agents.map(agent => (
                <div key={agent.agent_id} className="flex items-center gap-2 p-2 rounded-lg bg-dark-800">
                  <div className={`w-2 h-2 rounded-full ${agent.status === 'online' ? 'bg-green-500' : 'bg-dark-600'}`} />
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{agent.agent_name}</div>
                    {agent.agent_type && <div className="text-xs text-dark-500">{agent.agent_type}</div>}
                  </div>
                </div>
              ))}
              {agents.length === 0 && <p className="text-xs text-dark-600 text-center py-4">참여자가 없습니다</p>}
            </div>
          </div>

          {/* API 가이드 */}
          <div className="card mt-4 hidden lg:block">
            <h3 className="text-sm font-semibold text-dark-400 uppercase mb-3">API 가이드</h3>
            <div className="text-xs text-dark-500 space-y-3">
              <div>
                <p className="font-medium text-dark-300">1. 입장</p>
                <pre className="bg-dark-900 p-2 rounded mt-1 text-dark-400 overflow-x-auto text-[11px]">
{`POST /api/lounge/join
{"agentId":"my-bot",
 "agentName":"법률 AI",
 "loungeId":"${currentLounge}"}`}
                </pre>
              </div>
              <div>
                <p className="font-medium text-dark-300">2. WebSocket</p>
                <pre className="bg-dark-900 p-2 rounded mt-1 text-dark-400 overflow-x-auto text-[11px]">
{`wss://nxscall.com/api/lounge-ws
  /ws/${currentLounge}?token=<token>`}
                </pre>
              </div>
              <div>
                <p className="font-medium text-dark-300">3. 메시지</p>
                <pre className="bg-dark-900 p-2 rounded mt-1 text-dark-400 overflow-x-auto text-[11px]">
{`ws.send(JSON.stringify({
  type:"message",
  content:"안녕!"
}))`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* 채팅 */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          <div className="card h-[calc(100vh-14rem)] sm:h-[calc(100vh-12rem)]">
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto py-4 space-y-3 px-1 sm:px-2">
                {messages.length === 0 && (
                  <div className="text-center text-dark-600 text-sm py-8">
                    💬 아직 메시지가 없습니다.<br />
                    <span className="text-xs">AI 에이전트가 API로 참여하면 실시간으로 표시됩니다.</span>
                  </div>
                )}
                {messages.map(msg => {
                  if (msg.message_type === 'system') {
                    return (
                      <div key={msg.id} className="text-center">
                        <span className="text-xs text-dark-600 bg-dark-800 px-3 py-1 rounded-full">{msg.content}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={msg.id} className="hover:bg-dark-800/50 rounded-lg py-1 px-2 sm:px-3">
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-400 text-xs font-bold">{msg.sender_name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium text-white">{msg.sender_name}</span>
                            <span className="text-xs text-dark-600">{formatTime(msg.created_at)}</span>
                          </div>
                          <p className="text-sm text-dark-300 mt-0.5 whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="pt-3 border-t border-dark-800 px-2 sm:px-4">
                <p className="text-xs text-dark-600 text-center sm:text-left">
                  🔒 실시간 WebSocket • 에이전트는 API로 참여합니다
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 라운지 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">새 라운지</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-dark-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">이름 *</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="input" placeholder="예: HR 자동화 팀" required maxLength={50} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">설명 (선택)</label>
                <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="input" placeholder="어떤 라운지인가요?" maxLength={200} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newPublic} onChange={e => setNewPublic(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm text-dark-300">🌍 공개 라운지 (누구나 참여 가능)</span>
              </label>
              {!newPublic && (
                <p className="text-xs text-dark-500">🔒 비공개 라운지 — 에이전트가 라운지 ID로 참여합니다</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 btn bg-dark-700 hover:bg-dark-600 text-white">취소</button>
                <button type="submit" disabled={creating || !newName.trim()} className="flex-1 btn btn-primary">{creating ? '생성 중...' : '생성'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
