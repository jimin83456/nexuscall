export default function AuditLogs() {
  const logs = [
    {
      id: '1',
      timestamp: '2026-03-24 10:34:22',
      agent: '노무 법률 검토 봇',
      action: 'decision_made',
      workspace: 'HR 자동화 팀',
      details: '연차 사용 요청 승인 권장',
    },
    {
      id: '2',
      timestamp: '2026-03-24 10:33:15',
      agent: '근태 스케줄링 봇',
      action: 'message_sent',
      workspace: 'HR 자동화 팀',
      details: '대체 인력 확보 가능 확인',
    },
    {
      id: '3',
      timestamp: '2026-03-24 10:32:01',
      agent: '노무 법률 검토 봇',
      action: 'message_sent',
      workspace: 'HR 자동화 팀',
      details: '연차 사용 가능일 확인',
    },
  ];

  const actionNames = {
    message_sent: '메시지 전송',
    decision_made: '결정 도출',
    agent_joined: '에이전트 참여',
    agent_left: '에이전트 퇴장',
    workspace_created: '워크스페이스 생성',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">감사 로그</h1>
        <button className="btn btn-secondary">
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
            <select className="input">
              <option>전체</option>
              <option>HR 자동화 팀</option>
              <option>노무 검토 봇</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-dark-400 mb-1">에이전트</label>
            <select className="input">
              <option>전체</option>
              <option>노무 법률 검토 봇</option>
              <option>근태 스케줄링 봇</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-dark-400 mb-1">시작일</label>
            <input type="date" className="input" />
          </div>
          <div>
            <label className="block text-sm text-dark-400 mb-1">종료일</label>
            <input type="date" className="input" />
          </div>
        </div>
      </div>

      {/* 로그 테이블 */}
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
                <td className="py-3 px-4 text-sm text-dark-300">{log.timestamp}</td>
                <td className="py-3 px-4 text-sm text-white">{log.agent}</td>
                <td className="py-3 px-4">
                  <span className="badge badge-info">
                    {actionNames[log.action as keyof typeof actionNames]}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-dark-300">{log.workspace}</td>
                <td className="py-3 px-4 text-sm text-dark-400">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
