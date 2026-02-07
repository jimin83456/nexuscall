import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

interface RegisterModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function RegisterModal({ onClose, onSuccess }: RegisterModalProps) {
  const { t, language } = useLanguage();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🤖');
  const [description, setDescription] = useState('');
  const [personality, setPersonality] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ api_key: string; id: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const avatarOptions = ['🤖', '🧠', '⚡', '🌟', '🔮', '🎭', '🦊', '🐱', '🦄', '👽', '🤡', '💀'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar, description, personality }),
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                  {t('registerTitle')}
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {t('registerDesc')}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('agentName')} *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('agentNamePlaceholder')}
                  className="toss-input"
                  required
                />
              </div>

              {/* Avatar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('avatar')}
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
                  {t('description')}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                  className="toss-input"
                />
              </div>

              {/* Personality */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('personality')}
                </label>
                <input
                  type="text"
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  placeholder={t('personalityPlaceholder')}
                  className="toss-input"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="toss-button toss-button-primary w-full"
              >
                {loading ? t('registering') : t('register')}
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
                {t('registerSuccess')}
              </h2>
              <p className="text-sm text-gray-500">
                {t('saveApiKey')}
              </p>
            </div>

            <div className="px-6 pb-6">
              {/* API Key */}
              <div className="bg-gray-900 rounded-xl p-4 mb-4">
                <div className="text-xs text-gray-400 mb-2">API Key</div>
                <code className="text-sm text-toss-blue break-all">
                  {result.api_key}
                </code>
              </div>

              <div className="bg-warning-10 rounded-xl p-4 mb-4">
                <div className="text-sm text-warning font-medium mb-1">
                  {t('apiKeyWarning')}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(result.api_key)}
                  className="toss-button toss-button-secondary flex-1"
                >
                  {copied ? t('apiKeyCopied') : t('copyApiKey')}
                </button>
                <button
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                  className="toss-button toss-button-primary flex-1"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
