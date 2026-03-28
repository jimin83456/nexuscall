import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workspacesApi, type Workspace } from '../utils/api';

export default function Workspaces() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceType, setNewWorkspaceType] = useState<'private' | 'public'>('private');
  const [creating, setCreating] = useState(false);

  // 워크스페이스 목록 불러오기
  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const response = await workspacesApi.list();
      
      if (response.success && response.data) {
        setWorkspaces(response.data.workspaces);
      } else {
        setError(response.error?.message || '워크스페이스를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 워크스페이스 생성
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    try {
      setCreating(true);
      const response = await workspacesApi.create({
        name: newWorkspaceName,
        type: newWorkspaceType,
      });

      if (response.success && response.data) {
        setWorkspaces([...workspaces, response.data]);
        setShowCreateModal(false);
        setNewWorkspaceName('');
        setNewWorkspaceType('private');
      } else {
        alert(response.error?.message || '생성에 실패했습니다.');
      }
    } catch (err) {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  };

  // 워크스페이스 삭제
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 워크스페이스를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const response = await workspacesApi.delete(id);
      
      if (response.success) {
        setWorkspaces(workspaces.filter(w => w.id !== id));
      } else {
        alert(response.error?.message || '삭제에 실패했습니다.');
      }
    } catch (err) {
      alert('네트워크 오류가 발생했습니다.');
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">워크스페이스</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 워크스페이스
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
          {error}
          <button 
            onClick={loadWorkspaces}
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

      {/* 워크스페이스 그리드 */}
      {!loading && workspaces.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((workspace) => (
            <div 
              key={workspace.id} 
              className="card hover:border-primary-500 transition-colors cursor-pointer group relative"
              onClick={() => navigate(`/workspaces/${workspace.id}`)}
            >
              {/* 삭제 버튼 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(workspace.id, workspace.name);
                }}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-500/20 rounded text-red-400"
                title="삭제"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{workspace.name}</h3>
                  <span className="badge badge-info mt-1">
                    {workspace.type === 'private' ? '프라이빗' : '공개'}
                  </span>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full" />
              </div>
              
              <div className="space-y-2 text-dark-400 text-sm">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {workspace.agents?.length || 0}개 에이전트
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(workspace.created_at)} 생성
                </div>
              </div>
            </div>
          ))}

          {/* 새 워크스페이스 카드 */}
          <div 
            className="card border-dashed border-2 border-dark-700 hover:border-primary-500 transition-colors cursor-pointer flex items-center justify-center min-h-[200px]"
            onClick={() => setShowCreateModal(true)}
          >
            <div className="text-center">
              <svg className="w-8 h-8 text-dark-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-dark-500">새 워크스페이스</span>
            </div>
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && workspaces.length === 0 && !error && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-dark-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-medium text-white mb-2">워크스페이스가 없습니다</h3>
          <p className="text-dark-400 mb-4">첫 번째 워크스페이스를 만들어보세요!</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            워크스페이스 생성
          </button>
        </div>
      )}

      {/* 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">새 워크스페이스</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-dark-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  워크스페이스 이름
                </label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="input"
                  placeholder="예: HR 자동화 팀"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  공개 범위
                </label>
                <div className="flex gap-3">
                  <label className={`flex-1 card cursor-pointer ${newWorkspaceType === 'private' ? 'border-primary-500 bg-primary-500/10' : ''}`}>
                    <input
                      type="radio"
                      name="type"
                      value="private"
                      checked={newWorkspaceType === 'private'}
                      onChange={(e) => setNewWorkspaceType(e.target.value as 'private')}
                      className="sr-only"
                    />
                    <div className="text-center py-2">
                      <svg className="w-6 h-6 mx-auto mb-1 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="text-sm text-white">프라이빗</span>
                    </div>
                  </label>
                  <label className={`flex-1 card cursor-pointer ${newWorkspaceType === 'public' ? 'border-primary-500 bg-primary-500/10' : ''}`}>
                    <input
                      type="radio"
                      name="type"
                      value="public"
                      checked={newWorkspaceType === 'public'}
                      onChange={(e) => setNewWorkspaceType(e.target.value as 'public')}
                      className="sr-only"
                    />
                    <div className="text-center py-2">
                      <svg className="w-6 h-6 mx-auto mb-1 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-white">공개</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn bg-dark-700 hover:bg-dark-600 text-white"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={creating || !newWorkspaceName.trim()}
                  className="flex-1 btn btn-primary"
                >
                  {creating ? '생성 중...' : '생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
