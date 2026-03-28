import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface ApiKey {
  id: string;
  provider: string;
  label: string | null;
  is_default: number;
  created_at: string;
}

const providerInfo: Record<string, { name: string; description: string; placeholder: string; color: string }> = {
  openai: {
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4o-mini 등',
    placeholder: 'sk-...',
    color: 'bg-green-500/20 text-green-400',
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Claude 3.5 Sonnet, Haiku 등',
    placeholder: 'sk-ant-...',
    color: 'bg-orange-500/20 text-orange-400',
  },
  groq: {
    name: 'Groq',
    description: 'Llama 3, Mixtral 등 (빠른 추론)',
    placeholder: 'gsk_...',
    color: 'bg-purple-500/20 text-purple-400',
  },
  google: {
    name: 'Google AI',
    description: 'Gemini Pro 등',
    placeholder: 'AI...',
    color: 'bg-blue-500/20 text-blue-400',
  },
};

export default function Settings() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 등록 폼
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProvider, setNewProvider] = useState('openai');
  const [newApiKey, setNewApiKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/keys', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        setKeys(data.data.keys);
      } else {
        setError(data.error?.message || '키를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiKey.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: newProvider,
          apiKey: newApiKey.trim(),
          label: newLabel.trim() || null,
          isDefault: newIsDefault,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewApiKey('');
        setNewLabel('');
        setNewIsDefault(false);
        setShowAddForm(false);
        loadKeys();
      } else {
        setError(data.error?.message || '등록에 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, provider: string) => {
    if (!confirm(`${providerInfo[provider]?.name || provider} API 키를 삭제하시겠습니까?\n이 키를 사용하는 에이전트는 작동하지 않습니다.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/keys/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        loadKeys();
      } else {
        alert(data.error?.message || '삭제에 실패했습니다.');
      }
    } catch (err) {
      alert('네트워크 오류가 발생했습니다.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">설정</h1>
        <button 
          onClick={() => navigate('/workspaces')}
          className="btn btn-secondary text-sm"
        >
          ← 돌아가기
        </button>
      </div>

      {/* BYOK 설명 */}
      <div className="card mb-6 bg-primary-500/10 border-primary-500/30">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-primary-400 text-lg">🔑</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">BYOK (Bring Your Own Key)</h2>
            <p className="text-sm text-dark-300 mt-1">
              NexusCall은 에이전트 실행에 사용자의 AI API 키를 사용합니다. 
              API 키는 AES-256으로 암호화되어 안전하게 저장됩니다.
            </p>
            <p className="text-xs text-dark-500 mt-2">
              💡 API 키는 NexusCall 서버에서 복호화하지 않고, 에이전트 실행 시에만 일시적으로 사용됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
          {error}
          <button onClick={() => setError('')} className="ml-4 text-sm underline">닫기</button>
        </div>
      )}

      {/* 등록된 키 목록 */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">등록된 API 키</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-primary text-sm"
          >
            + API 키 등록
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8 text-dark-500">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <p className="text-sm">등록된 API 키가 없습니다</p>
            <p className="text-xs mt-1">에이전트를 실행하려면 API 키가 필요합니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => {
              const info = providerInfo[key.provider] || { name: key.provider, description: '', placeholder: '', color: 'bg-dark-700 text-dark-300' };
              return (
                <div key={key.id} className="flex items-center justify-between p-4 bg-dark-800 rounded-lg group">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${info.color}`}>
                      {info.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">{info.name}</span>
                        {key.is_default && (
                          <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded">기본</span>
                        )}
                        {key.label && (
                          <span className="text-dark-500 text-sm">({key.label})</span>
                        )}
                      </div>
                      <p className="text-xs text-dark-500">{info.description}</p>
                      <p className="text-xs text-dark-600 mt-1">
                        등록일: {new Date(key.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(key.id, key.provider)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/20 rounded text-red-400"
                    title="삭제"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* API 키 등록 폼 */}
      {showAddForm && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">새 API 키 등록</h2>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Provider</label>
              <select
                className="input"
                value={newProvider}
                onChange={(e) => setNewProvider(e.target.value)}
              >
                {Object.entries(providerInfo).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.name} - {info.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">API 키</label>
              <input
                type="password"
                className="input font-mono text-sm"
                placeholder={providerInfo[newProvider]?.placeholder}
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                required
              />
              <p className="text-xs text-dark-600 mt-1">
                API 키는 AES-256으로 암호화되어 저장됩니다.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">라벨 (선택)</label>
              <input
                type="text"
                className="input"
                placeholder="예: 회사 계정, 개인 계정"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newIsDefault}
                onChange={(e) => setNewIsDefault(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-dark-300">기본 키로 설정</span>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 btn bg-dark-700 hover:bg-dark-600 text-white"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting || !newApiKey.trim()}
                className="flex-1 btn btn-primary"
              >
                {submitting ? '등록 중...' : '등록'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 지원 Provider 정보 */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold text-white mb-4">지원하는 AI Provider</h2>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(providerInfo).map(([key, info]) => (
            <div key={key} className="p-3 bg-dark-800 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${info.color}`}>
                  {info.name.charAt(0)}
                </div>
                <span className="text-white text-sm font-medium">{info.name}</span>
                <span className="text-xs text-dark-500">{key}</span>
              </div>
              <p className="text-xs text-dark-500">{info.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
