import { useParams } from 'react-router-dom';

export default function WorkspaceDetail() {
  const { id } = useParams();

  const agents = [
    {
      id: '1',
      name: '노무 법률 검토 봇',
      type: 'law',
      status: 'online',
      lastActive: '2분 전',
    },
    {
      id: '2',
      name: '근태 스케줄링 봇',
      type: 'schedule',
      status: 'online',
      lastActive: '5분 전',
    },
    {
      id: '3',
      name: '급여 정산 봇',
      type: 'payroll',
      status: 'offline',
      lastActive: '1시간 전',
    },
  ];

  const messages = [
    {
      id: '1',
      agent: '노무 법률 검토 봇',
      content: '요청하신 연차 사용 요청을 검토했습니다. 연차 사용 가능일이 12일 남아있어 승인 가능합니다.',
      timestamp: '10:32',
    },
    {
      id: '2',
      agent: '근태 스케줄링 봇',
      content: '해당 기간(3월 25일~27일) 대체 인력 확보가 가능합니다. 스케줄 충돌 없음.',
      timestamp: '10:33',
    },
    {
      id: '3',
      agent: '노무 법률 검토 봇',
      content: '모든 조건이 충족되었습니다. 최종 승인 권장합니다.',
      timestamp: '10:34',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* 에이전트 목록 */}
      <div className="col-span-1">
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">에이전트</h2>
          
          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-3 bg-dark-800 rounded-lg"
              >
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-3 ${
                    agent.status === 'online' ? 'bg-green-500' : 'bg-dark-600'
                  }`} />
                  <div>
                    <div className="text-sm font-medium text-white">{agent.name}</div>
                    <div className="text-xs text-dark-500">{agent.lastActive}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full btn btn-secondary mt-4 text-sm">
            + 에이전트 추가
          </button>
        </div>
      </div>

      {/* 대화 영역 */}
      <div className="col-span-2">
        <div className="card h-[calc(100vh-12rem)]">
          <div className="flex flex-col h-full">
            {/* 헤더 */}
            <div className="flex items-center justify-between pb-4 border-b border-dark-800">
              <h2 className="text-lg font-semibold text-white">HR 자동화 팀</h2>
              <div className="flex space-x-2">
                <button className="btn btn-secondary text-sm">감사 로그</button>
                <button className="btn btn-secondary text-sm">설정</button>
              </div>
            </div>

            {/* 메시지 */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="animate-fade-in">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-400 text-xs font-medium">
                        {message.agent.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-white">
                          {message.agent}
                        </span>
                        <span className="text-xs text-dark-500">{message.timestamp}</span>
                      </div>
                      <p className="text-sm text-dark-300 mt-1">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 입력 */}
            <div className="pt-4 border-t border-dark-800">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="메시지를 입력하세요..."
                  className="input flex-1"
                />
                <button className="btn btn-primary">전송</button>
              </div>
              <p className="text-xs text-dark-600 mt-2">
                💡 관전 모드: 에이전트 간 자율 협업 중입니다. 결과만 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
