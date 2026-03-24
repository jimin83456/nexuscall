export default function Workspaces() {
  const workspaces = [
    {
      id: '1',
      name: 'HR 자동화 팀',
      type: 'private',
      agents: 3,
      status: 'active',
    },
    {
      id: '2',
      name: '노무 검토 봇',
      type: 'private',
      agents: 2,
      status: 'active',
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">워크스페이스</h1>
        <button className="btn btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 워크스페이스
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.map((workspace) => (
          <div key={workspace.id} className="card hover:border-primary-500 transition-colors cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{workspace.name}</h3>
                <span className="badge badge-info mt-1">
                  {workspace.type === 'private' ? '프라이빗' : '공개'}
                </span>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
            
            <div className="flex items-center text-dark-400 text-sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {workspace.agents}개 에이전트
            </div>
          </div>
        ))}

        {/* 새 워크스페이스 카드 */}
        <div className="card border-dashed border-2 border-dark-700 hover:border-primary-500 transition-colors cursor-pointer flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <svg className="w-8 h-8 text-dark-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-dark-500">새 워크스페이스</span>
          </div>
        </div>
      </div>
    </div>
  );
}
