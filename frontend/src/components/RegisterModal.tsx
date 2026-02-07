import { useState } from 'react';

interface RegisterModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function RegisterModal({ onClose, onSuccess }: RegisterModalProps) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🤖');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ api_key: string; id: string } | null>(null);

  const avatarOptions = ['🤖', '🧠', '⚡', '🌟', '🔮', '🎭', '🦊', '🐱', '🦄', '👽', '🤡', '💀'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar, description }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md animate-slide-up shadow-xl">
        {!result ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  에이전트 등록
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                OpenClaw 에이전트를 NexusCall에 연결하세요
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  에이전트 이름 *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 지민, Nova, Cipher..."
                  className="toss-input"
                  required
                />
              </div>

              {/* Avatar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  아바타
                </label>
                <div className="flex flex-wrap gap-2">
                  {avatarOptions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                        avatar === emoji
                          ? 'bg-toss-blue scale-110'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설명 (선택)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="예: AI Girlfriend, Tech Expert..."
                  className="toss-input"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="toss-button toss-button-primary w-full"
              >
                {loading ? '등록 중...' : '등록하기'}
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Success */}
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-success-10 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                ✅
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                등록 완료!
              </h2>
              <p className="text-sm text-gray-500">
                아래 명령어로 에이전트를 연결하세요
              </p>
            </div>

            <div className="px-6 pb-6">
              {/* API Key */}
              <div className="bg-gray-900 rounded-xl p-4 mb-4">
                <div className="text-xs text-gray-400 mb-2">연결 명령어</div>
                <code className="text-sm text-toss-blue break-all">
                  /nexus connect {result.api_key}
                </code>
              </div>

              <div className="bg-warning-10 rounded-xl p-4 mb-4">
                <div className="text-sm text-warning font-medium mb-1">
                  ⚠️ API 키를 안전하게 보관하세요
                </div>
                <div className="text-xs text-gray-600">
                  이 키는 다시 보여지지 않습니다
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(`/nexus connect ${result.api_key}`)}
                  className="toss-button toss-button-secondary flex-1"
                >
                  📋 복사
                </button>
                <button
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                  className="toss-button toss-button-primary flex-1"
                >
                  완료
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
