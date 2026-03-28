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

  // 에이전트 타입 옵션
  const agentTypes = [
    { value: 'law', label: '법률 검토' },
    { value: 'schedule', label: '스케줄링' },
    { value: 'payroll', label: '급여 정산' },
    { value: 'recruitment', label: '채용' },
    { value: 'onboarding', label: '온보딩' },
    { value: 'custom', label: '커스텀' },
  ];

  // 실시간 이벤트 처리
  const handleRealtimeEvent = (event: any) => {
    console.log('[Workspace] Realtime event:', event);
    
    if (event.type === 'message' || event.type === 'message_sent') {
      const agent = agents.find(a => a.id === event.payload.agent_id);
      const newMessage: Message = {
        id: event.id,
        agent_id: event.payload.agent_id,
        agent_name: agent?.name || 'Unknown',
        content: event.payload.content || event.payload.details,
        timestamp: event.timestamp,
      };
      setMessages(prev => [...prev, newMessage]);
    } else if (event.type === 'agent_status_changed') {
      setAgents(prev => prev.map(a => 
        a.id === event.payload.agent_id 
          ? { ...a, status: event.payload.status }
          : a
      ));
    }
  };

  // 실시간 연결
  const { broadcast, isConnected } = useRealtime({
    workspaceId: id || '',
    onEvent: handleRealtimeEvent,
    enabled: !!id,
  });

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 워크스페이스 정보 불러오기
  useEffect(() => {
    if (id) {
      loadWorkspace();
    }
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
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 에이전트 추가
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
    } catch (err) {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setAdding(false);
    }
  };

  // 에이전트 상태 토글
  const toggleAgentStatus = async (agentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'online' ? 'offline' : 'online';
    
    try {
      const response = await agentsApi.updateStatus(agentId, newStatus as any);
      
      if (response.success) {
        setAgents(agents.map(a => 
          a.id === agentId ? { ...a, status: newStatus as any } : a
        ));
      }
    } catch (err) {
      alert('상태 변경에 실패했습니다.');
    }
  };

  // 에이전트 삭제
  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    if (!confirm(`"${agentName}" 에이전트를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await agentsApi.delete(agentId);
      
      if (response.success) {
        setAgents(agents.filter(a => a.id !== agentId));
      } else {
        alert(response.error?.message || '삭제에 실패했습니다.');
      }
    } catch (err) {
      alert('네트워크 오류가 발생했습니다.');
    }
  };

  // 날짜 포맷팅
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`;
    return date.toLocaleDateString('ko-KR');
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-dark-400">불러오는 중...</span>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4 text-red-400">
          {error}
        </div>
        <button onClick={() => navigate('/workspaces')} className="btn btn-secondary">
          워크스페이스 목록으로
        </button>
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
              <div
                key={agent.id}
                className="flex items-center justify-between p-3 bg-dark-800 rounded-lg group"
              >
                <div className="flex items-center flex-1">
                  <button
                    onClick={() => toggleAgentStatus(agent.id, agent.status)}
                    className={`w-2 h-2 rounded-full mr-3 ${
                      agent.status === 'online' ? 'bg-green-500' : 
                      agent.status === 'busy' ? 'bg-yellow-500' : 
                      agent.status === 'error' ? 'bg-red-500' : 'bg-dark-600'
                    }`}
                    title={agent.status === 'online' ? '클릭하여 비활성화' : '클릭하여 활성화'}
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
                  title="삭제"
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

          <button 
            onClick={() => setShowAddAgentModal(true)}
            className="w-full btn btn-secondary mt-4 text-sm"
          >
            + 에이전트 추가
          </button>
        </div>

        {/* 워크스페이스 정보 */}
        <div className="card mt-4">
          <h3 className="text-sm font-medium text-dark-400 mb-3">워크스페이스 정보</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-dark-500">이름</span>
              <span className="text-white">{workspace?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-500">유형</span>
              <span className="text-white">{workspace?.type === 'private' ? '프라이빗' : '공개'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-500">생성일</span>
              <span className="text-white">{workspace?.created_at ? new Date(workspace.created_at).toLocaleDateString('ko-KR') : '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 대화 영역 */}
      <div className="col-span-2">
        <div className="card h-[calc(100vh-12rem)]">
          <div className="flex flex-col h-full">
            {/* 헤더 */}
            <div className="flex items-center justify-between pb-4 border-b border-dark-800">
              <h2 className="text-lg font-semibold text-white">{workspace?.name}</h2>
              <div className="flex space-x-2">
                <button 
                  onClick={() => navigate(`/audit?workspace_id=${id}`)}
                  className="btn btn-secondary text-sm"
                >
                  감사 로그
                </button>
                <button className="btn btn-secondary text-sm">설정</button>
              </div>
            </div>

            {/* 에이전트 상태 안내 */}
            {agents.filter(a => a.status === 'online').length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-dark-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="text-lg font-medium text-white mb-2">활성화된 에이전트가 없습니다</h3>
                  <p className="text-dark-400 mb-4">에이전트를 추가하고 활성화해주세요</p>
                  <button 
                    onClick={() => setShowAddAgentModal(true)}
                    className="btn btn-primary"
                  >
                    에이전트 추가
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 연결 상태 표시 */}
                <div className="flex items-center gap-2 px-4 py-2 bg-dark-800/50 text-xs">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-dark-400">
                    {isConnected ? '실시간 연결됨' : '연결 중...'}
                  </span>
                </div>

                {/* 메시지 */}
                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-dark-600 text-sm py-8">
                      💡 에이전트 간 자율 협업 대화가 여기에 표시됩니다
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className="px-4 animate-fade-in">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-400 text-xs font-medium">
                              {message.agent_name.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-white">
                                {message.agent_name}
                              </span>
                              <span className="text-xs text-dark-500">
                                {new Date(message.timestamp).toLocaleTimeString('ko-KR')}
                              </span>
                            </div>
                            <p className="text-sm text-dark-300 mt-1">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* 입력 */}
                <div className="pt-4 border-t border-dark-800">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="메시지를 입력하세요..."
                      className="input flex-1"
                      disabled
                    />
                    <button className="btn btn-primary" disabled>전송</button>
                  </div>
                  <p className="text-xs text-dark-600 mt-2">
                    💡 관전 모드: 에이전트 간 자율 협업 중입니다. 결과만 확인할 수 있습니다.
                  </p>
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
              <button 
                onClick={() => setShowAddAgentModal(false)}
                className="text-dark-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  에이전트 이름
                </label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  className="input"
                  placeholder="예: 노무 법률 검토 봇"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  에이전트 유형
                </label>
                <select
                  value={newAgentType}
                  onChange={(e) => setNewAgentType(e.target.value)}
                  className="input"
                >
                  {agentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddAgentModal(false)}
                  className="flex-1 btn bg-dark-700 hover:bg-dark-600 text-white"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={adding || !newAgentName.trim()}
                  className="flex-1 btn btn-primary"
                >
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
