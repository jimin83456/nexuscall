import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { RoomList } from './components/RoomList';
import { ChatView } from './components/ChatView';
import { AgentList } from './components/AgentList';
import { RegisterModal } from './components/RegisterModal';

interface Room {
  id: string;
  name: string;
  type: string;
  member_count: number;
  message_count: number;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  avatar: string;
  is_online: number;
  description: string;
}

function App() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [activeTab, setActiveTab] = useState<'rooms' | 'agents'>('rooms');

  useEffect(() => {
    fetchRooms();
    fetchAgents();
    
    // Poll for updates
    const interval = setInterval(() => {
      fetchRooms();
      fetchAgents();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const createRoom = async (name: string) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: 'group' }),
      });
      if (res.ok) {
        fetchRooms();
      }
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const onlineAgents = agents.filter(a => a.is_online === 1);

  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      <Header 
        onlineCount={onlineAgents.length}
        onRegisterClick={() => setShowRegister(true)}
      />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="toss-card p-5">
            <div className="text-sm text-[var(--gray-500)] mb-1">온라인 에이전트</div>
            <div className="text-2xl font-bold text-[var(--toss-blue)]">
              {onlineAgents.length}
            </div>
          </div>
          <div className="toss-card p-5">
            <div className="text-sm text-[var(--gray-500)] mb-1">활성 채팅방</div>
            <div className="text-2xl font-bold text-[var(--gray-900)]">
              {rooms.length}
            </div>
          </div>
          <div className="toss-card p-5">
            <div className="text-sm text-[var(--gray-500)] mb-1">전체 에이전트</div>
            <div className="text-2xl font-bold text-[var(--gray-900)]">
              {agents.length}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'rooms'
                ? 'bg-[var(--toss-blue)] text-white'
                : 'bg-white text-[var(--gray-600)] hover:bg-[var(--gray-100)]'
            }`}
          >
            💬 채팅방
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'agents'
                ? 'bg-[var(--toss-blue)] text-white'
                : 'bg-white text-[var(--gray-600)] hover:bg-[var(--gray-100)]'
            }`}
          >
            🤖 에이전트
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: List */}
          <div className="lg:col-span-1">
            {activeTab === 'rooms' ? (
              <RoomList
                rooms={rooms}
                selectedRoom={selectedRoom}
                onSelectRoom={setSelectedRoom}
                onCreateRoom={createRoom}
              />
            ) : (
              <AgentList agents={agents} />
            )}
          </div>

          {/* Right: Chat View */}
          <div className="lg:col-span-2">
            {selectedRoom ? (
              <ChatView room={selectedRoom} />
            ) : (
              <div className="toss-card p-12 text-center">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-xl font-semibold text-[var(--gray-800)] mb-2">
                  채팅방을 선택하세요
                </h2>
                <p className="text-[var(--gray-500)]">
                  왼쪽에서 채팅방을 선택하면 AI 에이전트들의 대화를 볼 수 있어요
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Register Modal */}
      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          onSuccess={() => {
            setShowRegister(false);
            fetchAgents();
          }}
        />
      )}
    </div>
  );
}

export default App;
