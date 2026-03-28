import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { auditApi, workspacesApi, agentsApi, type AuditLog, type Workspace, type Agent } from '../utils/api';

interface LogWithNames extends AuditLog {
  workspaceName?: string;
  agentName?: string;
}

export default function AuditLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<LogWithNames[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // 필터 상태
  const [workspaceId, setWorkspaceId] = useState(searchParams.get('workspace_id') || '');
  const [agentId, setAgentId] = useState(searchParams.get('agent_id') || '');
  const [actionFilter, setActionFilter] = useState(searchParams.get('action') || '');

  // 액션 이름 매핑
  const actionNames: Record<string, string> = {
    message_sent: '메시지 전송',
    decision_made: '결정 도출',
    agent_joined: '에이전트 참여',
    agent_left: '에이전트 퇴장',
    workspace_created: '워크스페이스 생성',
    agent_created: '에이전트 생성',
    agent_deleted: '에이전트 삭제',
    status_changed: '상태 변경',
  };

  // 데이터 로드
  useEffect(() => {
    loadInitialData();
  }, []);

  // 로그 로드 (필터 변경 시)
  useEffect(() => {
    loadLogs();
  }, [workspaceId, agentId, actionFilter, offset]);

  const loadInitialData = async () => {
    try {
      const [workspacesRes, agentsRes] = await Promise.all([
        workspacesApi.list(),
        agentsApi.list(),
      ]);

      if (workspacesRes.success && workspacesRes.data) {
        setWorkspaces(workspacesRes.data.workspaces);
      }
      if (agentsRes.success && agentsRes.data) {
        setAgents(agentsRes.data.agents);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      
      const params: any = { limit, offset };
      if (workspaceId) params.workspace_id = workspaceId;
      if (agentId) params.agent_id = agentId;
      if (actionFilter) params.action = actionFilter;

      const response = await auditApi.list(params);

      if (response.success && response.data) {
        // 이름 매핑
        const workspaceMap = new Map(workspaces.map(w => [w.id, w.name]));
        const agentMap = new Map(agents.map(a => [a.id, a.name]));

        const logsWithNames = response.data.logs.map(log => ({
          ...log,
          workspaceName: workspaceMap.get(log.workspace_id) || 'Unknown',
          agentName: agentMap.get(log.agent_id) || 'Unknown',
        }));

        setLogs(logsWithNames);
        setTotal(response.data.total);
      } else {
        setError(response.error?.message || '로그를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 필터 변경 핸들러
  const handleFilterChange = (type: string, value: string) => {
    setOffset(0); // 페이지 리셋
    
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(type, value);
    } else {
      params.delete(type);
    }
    setSearchParams(params);

    switch (type) {
      case 'workspace_id':
        setWorkspaceId(value);
        break;
      case 'agent_id':
        setAgentId(value);
        break;
      case 'action':
        setActionFilter(value);
        break;
    }
  };

  // 내보내기 (CSV)
  const handleExport = () => {
    const headers = ['시간', '워크스페이스', '에이전트', '액션', '상세'];
    const rows = logs.map(log => [
      log.created_at,
      log.workspaceName,
      log.agentName,
      actionNames[log.action] || log.action,
      log.details,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // 페이지네이션
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">감사 로그</h1>
        <button onClick={handleExport} className="btn btn-secondary" disabled={logs.length === 0}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          내보내기
        </button>
      </div>

      {/* 필터 */}
      <div className="card mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-dark-400 mb-1">워크스페이스</label>
            <select 
              className="input"
              value={workspaceId}
              onChange={(e) => handleFilterChange('workspace_id', e.target.value)}
            >
              <option value="">전체</option>
              {workspaces.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-dark-400 mb-1">에이전트</label>
            <select 
              className="input"
              value={agentId}
              onChange={(e) => handleFilterChange('agent_id', e.target.value)}
            >
              <option value="">전체</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-dark-400 mb-1">액션</label>
            <select 
              className="input"
              value={actionFilter}
              onChange={(e) => handleFilterChange('action', e.target.value)}
            >
              <option value="">전체</option>
              {Object.entries(actionNames).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={() => {
                setWorkspaceId('');
                setAgentId('');
                setActionFilter('');
                setOffset(0);
                setSearchParams({});
              }}
              className="btn btn-secondary w-full"
            >
              초기화
            </button>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
          {error}
          <button 
            onClick={loadLogs}
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

      {/* 로그 테이블 */}
      {!loading && logs.length > 0 && (
        <>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-dark-400">시간</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-dark-400">에이전트</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-dark-400">액션</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-dark-400">워크스페이스</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-dark-400">상세</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-dark-800 hover:bg-dark-800/50 transition-colors">
                    <td className="py-3 px-4 text-sm text-dark-300 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('ko-KR')}
                    </td>
                    <td className="py-3 px-4 text-sm text-white">{log.agentName}</td>
                    <td className="py-3 px-4">
                      <span className="badge badge-info">
                        {actionNames[log.action] || log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-dark-300">{log.workspaceName}</td>
                    <td className="py-3 px-4 text-sm text-dark-400 max-w-xs truncate">
                      {(() => {
                        try {
                          const details = JSON.parse(log.details);
                          return details.decision || details.content || JSON.stringify(details);
                        } catch {
                          return log.details;
                        }
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-dark-400">
                총 {total}개 중 {offset + 1}-{Math.min(offset + limit, total)}개
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="btn btn-secondary text-sm disabled:opacity-50"
                >
                  이전
                </button>
                <span className="flex items-center px-3 text-sm text-dark-400">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="btn btn-secondary text-sm disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 빈 상태 */}
      {!loading && logs.length === 0 && !error && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-dark-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-white mb-2">감사 로그가 없습니다</h3>
          <p className="text-dark-400">
            {workspaceId || agentId || actionFilter 
              ? '필터 조건을 변경해보세요' 
              : '에이전트가 작업을 시작하면 로그가 기록됩니다'}
          </p>
        </div>
      )}
    </div>
  );
}
