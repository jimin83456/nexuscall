import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../utils/api';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login({ email, password });

      if (response.success && response.data) {
        setAuth(response.data.user, response.data.token);
        navigate('/workspaces');
      } else {
        setError(response.error?.message || '로그인에 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">N</span>
          </div>
          <h1 className="text-2xl font-bold text-white">로그인</h1>
          <p className="text-dark-400 mt-2">NexusCall에 오신 것을 환영합니다</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-dark-300 mb-1">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="example@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-dark-300 mb-1">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary py-3"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-6 text-center text-dark-400 text-sm">
          계정이 없으신가요?{' '}
          <Link to="/register" className="text-primary-500 hover:underline">
            회원가입
          </Link>
        </div>
      </div>
    </div>
  );
}
