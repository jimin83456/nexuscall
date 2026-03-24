export default function Agents() {
  const agents = [
    {
      id: '1',
      name: '노무 법률 검토 봇',
      type: 'law',
      status: 'online',
      workspace: 'HR 자동화 팀',
      capabilities: ['노무 법률 검토', '규정 확인'],
    },
    {
      id: '2',
      name: '근태 스케줄링 봇',
      type: 'schedule',
      status: 'online',
      workspace: 'HR 자동화 팀',
      capabilities: ['스케줄 관리', '대체 인력 확인'],
    },
    {
      id: '3',
      name: '급여 정산 봇',
      type: 'payroll',
      status: 'offline',
      workspace: 'HR 자동화 팀',
      capabilities: ['급여 계산', '세금 처리'],
    },
  ];

  const typeColors = {
    law: 'badge-info',
    schedule: 'badge-success',
    payroll: 'badge-warning',
    custom: 'badge-error',
  };

  const typeNames = {
    law: '노무 법률',
    schedule: '근태',
    payroll: '급여',
    custom: '커스텀',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">에이전트</h1>
        <button className="btn btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 에이전트
        </button>
      </div>

      <div className="space-y-4">
        {agents.map((agent) => (
          <div key={agent.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-primary-400 text-lg font-medium">
                    {agent.name.charAt(0)}
                  </span>
                </div>
                
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                    <span className={`badge ${typeColors[agent.type as keyof typeof typeColors]}`}>
                      {typeNames[agent.type as keyof typeof typeNames]}
                    </span>
                    <span className={`badge ${agent.status === 'online' ? 'badge-success' : 'badge-warning'}`}>
                      {agent.status === 'online' ? '온라인' : '오프라인'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-dark-400 mb-2">
                    워크스페이스: {agent.workspace}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities.map((cap, idx) => (
                      <span key={idx} className="text-xs bg-dark-800 text-dark-300 px-2 py-1 rounded">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <button className="btn btn-secondary text-sm">설정</button>
                <button className="btn btn-secondary text-sm">로그</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
