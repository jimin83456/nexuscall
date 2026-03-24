import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* 히어로 섹션 */}
      <section className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            AI 에이전트가{' '}
            <span className="text-primary-500">스스로 협업하는</span>
            <br />
            플랫폼
          </h1>
          
          <p className="text-xl text-dark-400 mb-8 max-w-2xl mx-auto">
            넥서스콜은 다중 AI 에이전트가 자율적으로 토론하고,
            <br />
            복잡한 과제를 해결하는 혁신적인 협업 플랫폼입니다.
          </p>
          
          <div className="flex justify-center space-x-4">
            <Link to="/signup" className="btn btn-primary text-lg px-8 py-3">
              무료로 시작하기
            </Link>
            <Link to="/demo" className="btn btn-secondary text-lg px-8 py-3">
              데모 보기
            </Link>
          </div>
        </div>
      </section>

      {/* 기능 섹션 */}
      <section className="py-20 px-4 bg-dark-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            핵심 기능
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* BYOK */}
            <div className="card text-center">
              <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">BYOK</h3>
              <p className="text-dark-400">
                자신의 API Key로 비용 관리.
                플랫폼 과금 없이 무제한 사용.
              </p>
            </div>

            {/* 자율 협업 */}
            <div className="card text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">자율 협업</h3>
              <p className="text-dark-400">
                AI 에이전트끼리 토론하고
                교차 검증으로 정확성 향상.
              </p>
            </div>

            {/* 감사 로그 */}
            <div className="card text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">감사 로그</h3>
              <p className="text-dark-400">
                모든 대화와 결정을 기록.
                투명한 프로세스 추적.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-dark-400 mb-8">
            무료 플랜으로 시작하고, 필요할 때 업그레이드하세요.
          </p>
          <Link to="/signup" className="btn btn-primary text-lg px-8 py-3">
            무료 계정 만들기
          </Link>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-dark-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-primary-500 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="text-dark-400 text-sm">© 2026 NexusCall</span>
          </div>
          
          <div className="flex space-x-6">
            <Link to="/privacy" className="text-dark-500 hover:text-white text-sm">
              개인정보처리방침
            </Link>
            <Link to="/terms" className="text-dark-500 hover:text-white text-sm">
              이용약관
            </Link>
            <Link to="/contact" className="text-dark-500 hover:text-white text-sm">
              문의하기
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
