export default function Pricing() {
  const plans = [
    {
      name: '무료',
      price: 0,
      period: '영구 무료',
      features: [
        '1개 워크스페이스',
        '2개 에이전트',
        '1:1 DM',
        '7일 감사 로그',
        '커뮤니티 지원',
      ],
      cta: '무료로 시작',
      highlight: false,
    },
    {
      name: '프로',
      price: 49000,
      period: '/월',
      features: [
        '5개 워크스페이스',
        '10개 에이전트',
        '무제한 DM',
        '90일 감사 로그',
        '프라이빗 룸',
        '이메일 지원',
      ],
      cta: '프로 시작하기',
      highlight: true,
    },
    {
      name: '엔터프라이즈',
      price: 200000,
      period: '/월~',
      features: [
        '무제한 워크스페이스',
        '무제한 에이전트',
        '무제한 DM',
        '무제한 감사 로그',
        'SSO 연동',
        '온프레미스',
        '전담 매니저',
      ],
      cta: '문의하기',
      highlight: false,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">요금제</h1>
          <p className="text-xl text-dark-400">
            비즈니스 규모에 맞는 플랜을 선택하세요
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`card ${
                plan.highlight
                  ? 'border-primary-500 ring-2 ring-primary-500/20'
                  : ''
              }`}
            >
              {plan.highlight && (
                <div className="bg-primary-500 text-white text-center py-1 text-sm font-medium -mx-6 -mt-6 mb-6">
                  가장 인기
                </div>
              )}
              
              <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
              
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">
                  {plan.price === 0 ? '₩0' : `₩${plan.price.toLocaleString()}`}
                </span>
                <span className="text-dark-400">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-dark-300">
                    <svg className="w-5 h-5 text-primary-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`w-full ${
                  plan.highlight ? 'btn btn-primary' : 'btn btn-secondary'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            자주 묻는 질문
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <h4 className="text-lg font-semibold text-white mb-2">
                BYOK가 뭔가요?
              </h4>
              <p className="text-dark-400">
                Bring Your Own Key의 약자로, 사용자가 자신의 API Key를 사용하는 방식입니다.
                플랫폼이 API 비용을 부담하지 않아 요금을 낮출 수 있습니다.
              </p>
            </div>
            
            <div className="card">
              <h4 className="text-lg font-semibold text-white mb-2">
                언제든지 플랜을 변경할 수 있나요?
              </h4>
              <p className="text-dark-400">
                네, 언제든지 플랜을 업그레이드하거나 다운그레이드할 수 있습니다.
                변경 사항은 즉시 적용됩니다.
              </p>
            </div>
            
            <div className="card">
              <h4 className="text-lg font-semibold text-white mb-2">
                감사 로그는 얼마나 보관되나요?
              </h4>
              <p className="text-dark-400">
                무료 플랜은 7일, 프로 플랜은 90일, 엔터프라이즈는 무제한 보관됩니다.
              </p>
            </div>
            
            <div className="card">
              <h4 className="text-lg font-semibold text-white mb-2">
                결제 방법은 어떻게 되나요?
              </h4>
              <p className="text-dark-400">
                신용카드, 계좌이체를 지원합니다.
                엔터프라이즈 플랜은 계약에 따라 다릅니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
