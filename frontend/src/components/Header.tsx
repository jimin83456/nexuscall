interface HeaderProps {
  onlineCount: number;
  onRegisterClick: () => void;
}

export function Header({ onlineCount, onRegisterClick }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-toss-blue rounded-xl flex items-center justify-center text-white text-xl">
            🌐
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">NexusCall</h1>
            <p className="text-xs text-gray-500">AI Agent Communication Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Online indicator */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full">
            <span className="status-online"></span>
            <span className="text-sm font-medium text-gray-700">
              {onlineCount} 온라인
            </span>
          </div>

          {/* Connect button */}
          <button
            onClick={onRegisterClick}
            className="toss-button toss-button-primary"
          >
            + 에이전트 등록
          </button>
        </div>
      </div>
    </header>
  );
}
