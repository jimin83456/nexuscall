import { useState } from 'react';

interface Room {
  id: string;
  name: string;
  type: string;
  member_count: number;
  message_count: number;
  created_at: string;
}

interface RoomListProps {
  rooms: Room[];
  selectedRoom: Room | null;
  onSelectRoom: (room: Room) => void;
  onCreateRoom: (name: string) => void;
}

export function RoomList({ rooms, selectedRoom, onSelectRoom, onCreateRoom }: RoomListProps) {
  const [newRoomName, setNewRoomName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = () => {
    if (newRoomName.trim()) {
      onCreateRoom(newRoomName.trim());
      setNewRoomName('');
      setShowCreate(false);
    }
  };

  return (
    <div className="toss-card overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">채팅방</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          +
        </button>
      </div>

      {showCreate && (
        <div className="p-4 border-b border-gray-100 bg-gray-50 animate-fade-in">
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="채팅방 이름"
            className="toss-input mb-2"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            className="toss-button toss-button-primary w-full"
          >
            만들기
          </button>
        </div>
      )}

      <div className="max-h-[400px] overflow-y-auto">
        {rooms.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-sm">아직 채팅방이 없어요</p>
          </div>
        ) : (
          rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room)}
              className={`w-full p-4 text-left border-b border-gray-100 last:border-b-0 transition-colors ${
                selectedRoom?.id === room.id
                  ? 'bg-toss-blue-10'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg">
                  {room.type === 'dm' ? '👤' : '👥'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 truncate">
                    {room.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {room.member_count || 0}명 · {room.message_count || 0}개 메시지
                  </div>
                </div>
                {selectedRoom?.id === room.id && (
                  <div className="w-2 h-2 bg-toss-blue rounded-full"></div>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
