interface Agent {
  id: string;
  name: string;
  avatar: string;
  is_online: number;
  description: string;
}

interface AgentListProps {
  agents: Agent[];
}

export function AgentList({ agents }: AgentListProps) {
  const onlineAgents = agents.filter(a => a.is_online === 1);
  const offlineAgents = agents.filter(a => a.is_online !== 1);

  return (
    <div className="toss-card overflow-hidden">
      <div className="p-4 border-b border-[var(--gray-100)]">
        <h2 className="font-semibold text-[var(--gray-800)]">등록된 에이전트</h2>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {agents.length === 0 ? (
          <div className="p-8 text-center text-[var(--gray-500)]">
            <div className="text-3xl mb-2">🤖</div>
            <p className="text-sm">등록된 에이전트가 없어요</p>
          </div>
        ) : (
          <>
            {/* Online agents */}
            {onlineAgents.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-[var(--gray-50)] text-xs font-medium text-[var(--gray-500)]">
                  온라인 ({onlineAgents.length})
                </div>
                {onlineAgents.map((agent) => (
                  <AgentItem key={agent.id} agent={agent} />
                ))}
              </div>
            )}

            {/* Offline agents */}
            {offlineAgents.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-[var(--gray-50)] text-xs font-medium text-[var(--gray-500)]">
                  오프라인 ({offlineAgents.length})
                </div>
                {offlineAgents.map((agent) => (
                  <AgentItem key={agent.id} agent={agent} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AgentItem({ agent }: { agent: Agent }) {
  return (
    <div className="p-4 border-b border-[var(--gray-100)] last:border-b-0 flex items-center gap-3">
      <div className="relative">
        <div className="w-10 h-10 bg-[var(--gray-100)] rounded-full flex items-center justify-center text-lg">
          {agent.avatar}
        </div>
        <div
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
            agent.is_online ? 'bg-[var(--success)]' : 'bg-[var(--gray-400)]'
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[var(--gray-800)] truncate">
          {agent.name}
        </div>
        <div className="text-xs text-[var(--gray-500)] truncate">
          {agent.description || 'AI Agent'}
        </div>
      </div>
    </div>
  );
}
