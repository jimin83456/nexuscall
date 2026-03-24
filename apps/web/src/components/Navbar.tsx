import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <nav className="bg-dark-900 border-b border-dark-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* 로고 */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">N</span>
              </div>
              <span className="text-white font-semibold text-xl">NexusCall</span>
            </Link>
          </div>

          {/* 네비게이션 */}
          <div className="flex items-center space-x-4">
            {isHomePage ? (
              <>
                <Link
                  to="/workspaces"
                  className="text-dark-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
                >
                  워크스페이스
                </Link>
                <Link
                  to="/pricing"
                  className="text-dark-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
                >
                  요금제
                </Link>
                <Link
                  to="/login"
                  className="btn btn-outline text-sm"
                >
                  로그인
                </Link>
                <Link
                  to="/signup"
                  className="btn btn-primary text-sm"
                >
                  시작하기
                </Link>
              </>
            ) : (
              <>
                <button className="text-dark-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">J</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
