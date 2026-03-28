import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentsApi, workspacesApi, type Agent, type Workspace } from '../utils/api';

interface AgentWithWorkspace extends Agent {
  workspaceName?: string;
}

export default function Agents() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentWithWorkspace[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');

  // 에이전트 타입 매핑
  const typeColors: Record<string, string> = {
    law: 'badge-info',
    schedule: 'badge-success',
    payroll: 'badge-warning',
    recruitment: 'badge-primary',
    onboarding: 'badge-secondary',
    custom: 'badge-error',
  };

  const typeNames: Record<string, string> = {
    law: '노무 법률',
    schedule: '근태',
    payroll: '급여',
    recruitment: '채용',
    onboarding: '온보딩',
    custom: '커스텀',
  };

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 병렬로 에이전트와 워크스페이스 로드
      const [agentsRes, workspacesRes] = await Promise.all([
        agentsApi.list(),
        workspacesApi.list(),
      ]);

      if (agentsRes.success && agentsRes.data && workspacesRes.success && workspacesRes.data) {
        const workspaceMap = new Map(
          workspacesRes.data.workspaces.map(w => [w.id, w.name])
        );
        
        // 에이전트에 워크스페이스 이름 추가
        const agentsWithWorkspace = (agentsRes.data.agents || []).map(agent => ({
          ...agent,
          workspaceName: workspaceMap.get(agent.workspace_id) || 'Unknown',
        }));
        
        setAgents(agentsWithWorkspace);
        setWorkspaces(workspacesRes.data.workspaces);
      } else {
        setError(agentsRes.error?.message || '데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 에이전트 상태 토글
  const toggleStatus = async (agentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'online' ? 'offline' : 'online';
    
    try {
      const response = await agentsApi.updateStatus(agentId, newStatus as any);
      
      if (response.success) {
        setAgents(agents.map(a => 
          a.id === agentId ? { ...a, status: newStatus as any } : a
        ));
      } else {
        alert(response.error?.message || '상태 변경에 실패했습니다.');
      }
    } catch (err) {
      alert('네트워크 오류가 발생했습니다.');
    }
  };

  // 에이전트 삭제
  const handleDelete = async (agentId: string, agentName: string) => {
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

  // 필터링된 에이전트
  const filteredAgents = agents.filter(agent => {
    if (filter === 'online') return agent.status === 'online';
    if (filter === 'offline') return agent.status !== 'online';
    return true;
  });

  // 통계
  const stats = {
    total: agents.length,
    online: agents.filter(a => a.status === 'online').length,
    offline: agents.filter(a => a.status !== 'online').length,
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">에이전트</h1>
        <button 
          onClick={() => navigate('/workspaces')}
          className="btn btn-primary"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 에이전트
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="text-sm text-dark-400 mb-1">전체 에이전트</div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </div>
        <div className="card">
          <div className="text-sm text-dark-400 mb-1">온라인</div>
          <div className="text-2xl font-bold text-green-500">{stats.online}</div>
        </div>
        <div className="card">
          <div className="text-sm text-dark-400 mb-1">오프라인</div>
          <div className="text-2xl font-bold text-dark-500">{stats.offline}</div>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            filter === 'all' 
              ? 'bg-primary-500 text-white' 
              : 'bg-dark-800 text-dark-400 hover:text-white'
          }`}
        >
          전체 ({stats.total})
        </button>
        <button
          onClick={() => setFilter('online')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            filter === 'online' 
              ? 'bg-green-500 text-white' 
              : 'bg-dark-800 text-dark-400 hover:text-white'
          }`}
        >
          온라인 ({stats.online})
        </button>
        <button
          onClick={() => setFilter('offline')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            filter === 'offline' 
              ? 'bg-dark-600 text-white' 
              : 'bg-dark-800 text-dark-400 hover:text-white'
          }`}
        >
          오프라인 ({stats.offline})
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
          {error}
          <button 
            onClick={loadData}
            className="ml-4 text-sm underline hover:no-underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-dark-400">불러오는 중...</span>
        </div>
      )}

      {/* 에이전트 목록 */}
      {!loading && filteredAgents.length > 0 && (
        <div className="space-y-4">
          {filteredAgents.map((agent) => (
            <div key={agent.id} className="card group">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  {/* 아바타 */}
                  <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-primary-400 text-lg font-medium">
                      {agent.name.charAt(0)}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                      <span className={`badge ${typeColors[agent.type] || 'badge-error'}`}>
                        {typeNames[agent.type] || agent.type}
                      </span>
                      <button
                        onClick={() => toggleStatus(agent.id, agent.status)}
                        className={`badge cursor-pointer hover:opacity-80 transition-opacity ${
                          agent.status === 'online' ? 'badge-success' : 
                          agent.status === 'busy' ? 'badge-warning' :
                          agent.status === 'error' ? 'badge-error' : 'badge-warning'
                        }`}
                        title="클릭하여 상태 변경"
                      >
                        {agent.status === 'online' ? '온라인' : 
                         agent.status === 'busy' ? '작업 중' :
                         agent.status === 'error' ? '오류' : '오프라인'}
                      </button>
                    </div>
                    
                    <p className="text-sm text-dark-400 mb-2">
                      워크스페이스: 
                      <button 
                        onClick={() => navigate(`/workspaces/${agent.workspace_id}`)}
                        className="ml-1 text-primary-400 hover:underline"
                      >
                        {agent.workspaceName}
                      </button>
                    </p>
                    
                    {/* 설정 파싱 */}
                    {agent.config && (
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          try {
                            const config = JSON.parse(agent.config);
                            return (config.capabilities || []).map((cap: string, idx: number) => (
                              <span key={idx} className="text-xs bg-dark-800 text-dark-300 px-2 py-1 rounded">
                                {cap}
                              </span>
                            ));
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => navigate(`/workspaces/${agent.workspace_id}`)}
                    className="btn btn-secondary text-sm"
                  >
                    워크스페이스
                  </button>
                  <button 
                    onClick={() => navigate(`/audit?agent_id=${agent.id}`)}
                    className="btn btn-secondary text-sm"
                  >
                    로그
                  </button>
                  <button 
                    onClick={() => handleDelete(agent.id, agent.name)}
                    className="btn bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && filteredAgents.length === 0 && !error && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-dark-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-white mb-2">
            {filter === 'all' ? '에이전트가 없습니다' : `${filter === 'online' ? '온라인' : '오프라인'} 에이전트가 없습니다`}
          </h3>
          <p className="text-dark-400 mb-4">
            {filter === 'all' 
              ? '워크스페이스에서 에이전트를 추가해보세요!' 
              : '다른 필터를 선택해보세요'}
          </p>
          {filter === 'all' && (
            <button 
              onClick={() => navigate('/workspaces')}
              className="btn btn-primary"
            >
              워크스페이스로 이동
            </button>
          )}
        </div>
      )}
    </div>
  );
}
