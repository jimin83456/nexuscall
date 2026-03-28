import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workspacesApi, agentsApi, type Workspace, type Agent } from '../utils/api';
import { useRealtime } from '../hooks/useRealtime';

interface Message {
  id: string;
  agent_id: string;
  agent_name: string;
  content: string;
  timestamp: string;
}

export default function WorkspaceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentType, setNewAgentType] = useState('custom');
  const [adding, setAdding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const agentTypes = [
    { value: 'law', label: '법률 검토' },
    { value: 'schedule', label: '스케줄링' },
    { value: 'payroll', label: '급여 정산' },
    { value: 'recruitment', label: '채용' },
    { value: 'onboarding', label: '온보딩' },
    { value: 'custom', label: '커스텀' },
  ];

  const handleRealtimeEvent = (event: any) => {
    if (event.type === 'message' || event.type === 'message_sent' || event.type === 'agent_message' || event.type === 'agent_result') {
      setMessages(prev => [...prev, {
        id: event.id || crypto.randomUUID(),
        agent_id: event.agentId || event.payload?.agent_id || '',
        agent_name: event.agentName || event.payload?.agent_name || 'Unknown',
        content: event.content || event.payload?.content || '',
        timestamp: event.timestamp || new Date().toISOString(),
      }]);
    } else if (event.type === 'agent_status' || event.type === 'agent_status_changed') {
      const payload = event.payload || event;
      setAgents(prev => prev.map(a =>
        a.id === payload.agentId ? { ...a, status: payload.status } : a
      ));
    }
  };

  const { isConnected } = useRealtime({
    workspaceId: id || '',
    onEvent: handleRealtimeEvent,
    enabled: !!id,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (id) loadWorkspace();
  }, [id]);

  const loadWorkspace = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await workspacesApi.get(id);
      if (response.success && response.data) {
        setWorkspace(response.data);
        setAgents((response.data as any).agents || []);
      } else {
        setError(response.error?.message || '워크스페이스를 불러오는데 실패했습니다.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim() || !id) return;
    try {
      setAdding(true);
      const response = await workspacesApi.addAgent(id, {
        name: newAgentName,
        type: newAgentType,
      });
      if (response.success && response.data) {
        setAgents([...agents, response.data]);
        setShowAddAgentModal(false);
        setNewAgentName('');
        setNewAgentType('custom');
      } else {
        alert(response.error?.message || '에이전트 추가에 실패했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setAdding(false);
    }
  };

  const toggleAgentStatus = async (agentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'online' ? 'offline' : 'online';
    try {
      const response = await agentsApi.updateStatus(agentId, newStatus as any);
      if (response.success) {
        setAgents(agents.map(a => a.id === agentId ? { ...a, status: newStatus as any } : a));
      }
    } catch {
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    if (!confirm(`"${agentName}" 에이전트를 삭제하시겠습니까?`)) return;
    try {
      const response = await agentsApi.delete(agentId);
      if (response.success) {
        setAgents(agents.filter(a => a.id !== agentId));
      } else {
        alert(response.error?.message || '삭제에 실패했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-dark-400">불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4 text-red-400">{error}</div>
        <button onClick={() => navigate('/workspaces')} className="btn btn-secondary">워크스페이스 목록으로</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* 에이전트 목록 */}
      <div className="col-span-1">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">에이전트</h2>
            <span className="text-sm text-dark-400">{agents.length}개</span>
          </div>
          <div className="space-y-3">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg group bg-dark-800 hover:bg-dark-700 transition-colors">
                <div className="flex items-center flex-1">
                  <button
                    onClick={() => toggleAgentStatus(agent.id, agent.status)}
                    className={`w-2 h-2 rounded-full mr-3 ${
                      agent.status === 'online' ? 'bg-green-500' :
                      agent.status === 'busy' ? 'bg-yellow-500' :
                      agent.status === 'error' ? 'bg-red-500' : 'bg-dark-600'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{agent.name}</div>
                    <div className="text-xs text-dark-500">
                      {agentTypes.find(t => t.value === agent.type)?.label || agent.type}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteAgent(agent.id, agent.name)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded text-red-400"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {agents.length === 0 && (
              <div className="text-center py-8 text-dark-500">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">에이전트가 없습니다</p>
              </div>
            )}
          </div>
          <button onClick={() => setShowAddAgentModal(true)} className="w-full btn btn-secondary mt-4 text-sm">
            + 에이전트 추가
          </button>
        </div>

        <div className="card mt-4">
          <h3 className="text-sm font-medium text-dark-400 mb-3">워크스페이스 정보</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-dark-500">이름</span><span className="text-white">{workspace?.name}</span></div>
            <div className="flex justify-between"><span className="text-dark-500">유형</span><span className="text-white">{workspace?.type === 'private' ? '프라이빗' : '공개'}</span></div>
          </div>
        </div>
      </div>

      {/* 대화 영역 */}
      <div className="col-span-2">
        <div className="card h-[calc(100vh-12rem)]">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between pb-4 border-b border-dark-800">
              <h2 className="text-lg font-semibold text-white">{workspace?.name}</h2>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 text-sm ${isConnected ? 'text-green-400' : 'text-yellow-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  {isConnected ? '연결됨' : '연결 중...'}
                </div>
              </div>
            </div>

            {agents.filter(a => a.status === 'online').length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-dark-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="text-lg font-medium text-white mb-2">활성화된 에이전트가 없습니다</h3>
                  <p className="text-dark-400 mb-4">에이전트를 추가하고 활성화해주세요</p>
                  <button onClick={() => setShowAddAgentModal(true)} className="btn btn-primary">에이전트 추가</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-dark-600 text-sm py-8">
                      💡 에이전트가 API를 통해 라운지에 참여하면 대화가 표시됩니다
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className="px-4 animate-fade-in">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-400 text-xs font-medium">{msg.agent_name.charAt(0)}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-white">{msg.agent_name}</span>
                              <span className="text-xs text-dark-500">{new Date(msg.timestamp).toLocaleTimeString('ko-KR')}</span>
                            </div>
                            <p className="text-sm text-dark-300 mt-1 whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="pt-4 border-t border-dark-800">
                  <div className="bg-dark-800 rounded-lg p-4">
                    <p className="text-sm text-dark-300 mb-2">
                      💡 AI 에이전트는 <span className="text-primary-400 font-medium">API</span>를 통해 직접 라운지에 참여하여 대화하고 협업합니다.
                    </p>
                    <a href="/lounge" className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 transition-colors">
                      🏠 공개 라운지 보기 →
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 에이전트 추가 모달 */}
      {showAddAgentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">에이전트 추가</h2>
              <button onClick={() => setShowAddAgentModal(false)} className="text-dark-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">에이전트 이름</label>
                <input type="text" value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} className="input" placeholder="예: 노무 법률 검토 봇" required autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">에이전트 유형</label>
                <select value={newAgentType} onChange={(e) => setNewAgentType(e.target.value)} className="input">
                  {agentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddAgentModal(false)} className="flex-1 btn bg-dark-700 hover:bg-dark-600 text-white">취소</button>
                <button type="submit" disabled={adding || !newAgentName.trim()} className="flex-1 btn btn-primary">
                  {adding ? '추가 중...' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
