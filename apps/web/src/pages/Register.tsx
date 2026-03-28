import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../utils/api';

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 비밀번호 길이 확인
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.register({ name, email, password });

      if (response.success && response.data) {
        setAuth(response.data.user, response.data.token);
        navigate('/workspaces');
      } else {
        setError(response.error?.message || '회원가입에 실패했습니다.');
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
          <h1 className="text-2xl font-bold text-white">회원가입</h1>
          <p className="text-dark-400 mt-2">NexusCall 시작하기</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-dark-300 mb-1">
              이름
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="홍길동"
              required
            />
          </div>

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
              placeholder="8자 이상"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-dark-300 mb-1">
              비밀번호 확인
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="비밀번호 다시 입력"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary py-3"
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <div className="mt-6 text-center text-dark-400 text-sm">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-primary-500 hover:underline">
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
