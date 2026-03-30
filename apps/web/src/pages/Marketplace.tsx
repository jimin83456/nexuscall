import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface Agent {
  agent_id: string;
  name: string;
  description: string | null;
  category: string;
  capabilities: string | null;
  pricing_type: string;
  price_monthly: number;
  avatar_url: string | null;
  rating: number;
  review_count: number;
  install_count: number;
  website: string | null;
  created_at: string;
}

interface Review {
  rating: number;
  comment: string | null;
  created_at: string;
  user_name: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export default function Marketplace() {
  const token = useAuthStore((s) => s.token);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('rating');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // 상세 모달
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  // 등록 모달
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', description: '', category: 'general', capabilities: '', pricingType: 'free', priceMonthly: 0, website: '' });
  const [submitting, setSubmitting] = useState(false);

  // 리뷰 모달
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (search) params.set('search', search);
    params.set('sort', sort);
    params.set('limit', '50');

    try {
      const resp = await fetch(`/api/marketplace/agents?${params}`);
      const data = await resp.json();
      if (data.success) {
        setAgents(data.data.agents);
        setTotal(data.data.total);
      }
    } catch {}
    setLoading(false);
  }, [selectedCategory, search, sort]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  useEffect(() => {
    fetch('/api/marketplace/categories').then(r => r.json()).then(d => {
      if (d.success) setCategories(d.data.categories);
    }).catch(() => {});
  }, []);

  // 에이전트 상세
  const openDetail = async (agentId: string) => {
    try {
      const resp = await fetch(`/api/marketplace/agents/${agentId}`);
      const data = await resp.json();
      if (data.success) {
        setSelectedAgent(data.data.agent);
        setReviews(data.data.reviews || []);
      }
    } catch {}
  };

  // 에이전트 설치
  const handleInstall = async (agentId: string) => {
    if (!token) { alert('로그인이 필요합니다.'); return; }
    try {
      const resp = await fetch(`/api/marketplace/agents/${agentId}/install`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await resp.json();
      if (data.success) { alert('에이전트가 설치되었습니다!'); fetchAgents(); }
    } catch {}
  };

  // 등록
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.name.trim()) return;
    setSubmitting(true);
    try {
      const resp = await fetch('/api/marketplace/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: regForm.name.trim(),
          description: regForm.description.trim() || null,
          category: regForm.category,
          capabilities: regForm.capabilities.split(',').map(s => s.trim()).filter(Boolean),
          pricingType: regForm.pricingType,
          priceMonthly: regForm.pricingType === 'paid' ? regForm.priceMonthly : 0,
          website: regForm.website.trim() || null,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        setShowRegister(false);
        setRegForm({ name: '', description: '', category: 'general', capabilities: '', pricingType: 'free', priceMonthly: 0, website: '' });
        fetchAgents();
      } else alert(data.error || '등록 실패');
    } catch { alert('오류가 발생했습니다.'); }
    setSubmitting(false);
  };

  // 리뷰 등록
  const handleReview = async () => {
    if (!selectedAgent) return;
    try {
      const resp = await fetch(`/api/marketplace/agents/${selectedAgent.agent_id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment.trim() || null }),
      });
      const data = await resp.json();
      if (data.success) {
        setShowReview(false);
        openDetail(selectedAgent.agent_id);
        fetchAgents();
      } else alert(data.error || '리뷰 실패');
    } catch {}
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < Math.round(rating) ? 'text-yellow-400' : 'text-dark-700'}>★</span>
    ));
  };

  const catName = (cat: string) => categories.find(c => c.id === cat)?.name || cat;

  return (
    <div className="max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">🏪 에이전트 스킬 마켓</h1>
          <p className="text-xs sm:text-sm text-dark-400 mt-1">{total}개의 에이전트가 등록되어 있습니다</p>
        </div>
        {token && (
          <button onClick={() => setShowRegister(true)} className="btn btn-primary text-sm self-start sm:self-auto">
            + 에이전트 등록
          </button>
        )}
      </div>

      {/* 검색 & 필터 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="에이전트 검색..." className="input pl-10"
          />
          <svg className="w-4 h-4 text-dark-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} className="input w-full sm:w-40">
          <option value="rating">⭐ 평점순</option>
          <option value="popular">🔥 인기순</option>
          <option value="newest">🕐 최신순</option>
          <option value="reviews">💬 리뷰순</option>
        </select>
      </div>

      {/* 카테고리 */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              selectedCategory === cat.id
                ? 'bg-primary-500 text-white'
                : 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
            <span className={`text-xs ${selectedCategory === cat.id ? 'text-white/70' : 'text-dark-600'}`}>
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* 에이전트 카드 목록 */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="h-6 bg-dark-800 rounded w-2/3 mb-3" />
              <div className="h-4 bg-dark-800 rounded w-full mb-2" />
              <div className="h-4 bg-dark-800 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🤖</div>
          <p className="text-dark-400 text-lg">아직 등록된 에이전트가 없습니다</p>
          <p className="text-dark-600 text-sm mt-1">첫 번째 에이전트를 등록해보세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <div
              key={agent.agent_id}
              className="card hover:border-primary-500/30 transition-colors cursor-pointer group"
              onClick={() => openDetail(agent.agent_id)}
            >
              {/* 카테고리 + 가격 */}
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs bg-dark-800 text-dark-400 px-2 py-0.5 rounded-full">{catName(agent.category)}</span>
                <span className={`text-xs font-medium ${agent.pricing_type === 'free' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {agent.pricing_type === 'free' ? '무료' : `₩${agent.price_monthly?.toLocaleString()}/월`}
                </span>
              </div>

              {/* 이름 */}
              <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-primary-400 transition-colors">
                {agent.name}
              </h3>

              {/* 설명 */}
              <p className="text-sm text-dark-400 mb-3 line-clamp-2">{agent.description || '설명이 없습니다'}</p>

              {/* 역량 태그 */}
              {agent.capabilities && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {JSON.parse(agent.capabilities).slice(0, 3).map((cap: string, i: number) => (
                    <span key={i} className="text-xs bg-primary-500/10 text-primary-400 px-1.5 py-0.5 rounded">{cap}</span>
                  ))}
                  {JSON.parse(agent.capabilities).length > 3 && (
                    <span className="text-xs text-dark-600">+{JSON.parse(agent.capabilities).length - 3}</span>
                  )}
                </div>
              )}

              {/* 평점 & 설치 */}
              <div className="flex items-center justify-between pt-3 border-t border-dark-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{renderStars(agent.rating)}</span>
                  <span className="text-xs text-dark-500">{agent.rating > 0 ? agent.rating.toFixed(1) : '신규'}</span>
                  <span className="text-xs text-dark-600">({agent.review_count})</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-dark-500">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {agent.install_count}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 상세 모달 */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAgent(null)}>
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs bg-dark-800 text-dark-400 px-2 py-0.5 rounded-full">{catName(selectedAgent.category)}</span>
                <h2 className="text-xl font-bold text-white mt-2">{selectedAgent.name}</h2>
              </div>
              <button onClick={() => setSelectedAgent(null)} className="text-dark-400 hover:text-white text-xl">✕</button>
            </div>

            <p className="text-dark-300 mb-4">{selectedAgent.description || '설명이 없습니다'}</p>

            {/* 역량 */}
            {selectedAgent.capabilities && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-dark-400 mb-2">역량</h3>
                <div className="flex flex-wrap gap-1.5">
                  {JSON.parse(selectedAgent.capabilities).map((cap: string, i: number) => (
                    <span key={i} className="text-xs bg-primary-500/10 text-primary-400 px-2 py-1 rounded">{cap}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 가격 */}
            <div className="mb-4 p-3 bg-dark-800 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-dark-400">요금</span>
                <span className={`text-lg font-bold ${selectedAgent.pricing_type === 'free' ? 'text-green-400' : 'text-white'}`}>
                  {selectedAgent.pricing_type === 'free' ? '무료' : `₩${selectedAgent.price_monthly?.toLocaleString()}/월`}
                </span>
              </div>
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-2 bg-dark-800 rounded-lg">
                <div className="text-lg font-bold text-white">{selectedAgent.rating > 0 ? selectedAgent.rating.toFixed(1) : '-'}</div>
                <div className="text-xs text-dark-500">평점</div>
              </div>
              <div className="text-center p-2 bg-dark-800 rounded-lg">
                <div className="text-lg font-bold text-white">{selectedAgent.review_count}</div>
                <div className="text-xs text-dark-500">리뷰</div>
              </div>
              <div className="text-center p-2 bg-dark-800 rounded-lg">
                <div className="text-lg font-bold text-white">{selectedAgent.install_count}</div>
                <div className="text-xs text-dark-500">설치</div>
              </div>
            </div>

            {/* 리뷰 목록 */}
            {reviews.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-dark-400 mb-2">리뷰 ({reviews.length})</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {reviews.map((r, i) => (
                    <div key={i} className="p-2 bg-dark-800 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white">{r.user_name || '익명'}</span>
                        <span className="text-xs text-dark-600">{new Date(r.created_at).toLocaleDateString('ko-KR')}</span>
                      </div>
                      <div className="text-sm mt-1">{renderStars(r.rating)}</div>
                      {r.comment && <p className="text-xs text-dark-400 mt-1">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 웹사이트 */}
            {selectedAgent.website && (
              <a href={selectedAgent.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-400 hover:underline block mb-4">
                🌐 웹사이트 방문
              </a>
            )}

            {/* 버튼 */}
            <div className="flex gap-3">
              <button onClick={() => handleInstall(selectedAgent.agent_id)} className="flex-1 btn btn-primary">
                ⬇️ 설치하기
              </button>
              {token && (
                <button onClick={() => setShowReview(true)} className="btn bg-dark-700 hover:bg-dark-600 text-white">
                  ⭐ 리뷰
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 리뷰 모달 */}
      {showReview && selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="card w-full max-w-sm">
            <h2 className="text-lg font-bold text-white mb-4">{selectedAgent.name} 리뷰</h2>
            <div className="flex justify-center gap-1 mb-4">
              {[1,2,3,4,5].map(i => (
                <button key={i} onClick={() => setReviewRating(i)} className="text-2xl transition-colors">
                  <span className={i <= reviewRating ? 'text-yellow-400' : 'text-dark-700'}>★</span>
                </button>
              ))}
            </div>
            <textarea
              value={reviewComment} onChange={e => setReviewComment(e.target.value)}
              placeholder="리뷰를 작성해주세요 (선택)" maxLength={300}
              className="input h-20 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowReview(false)} className="flex-1 btn bg-dark-700 hover:bg-dark-600 text-white">취소</button>
              <button onClick={handleReview} className="flex-1 btn btn-primary">등록</button>
            </div>
          </div>
        </div>
      )}

      {/* 등록 모달 */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">에이전트 등록</h2>
              <button onClick={() => setShowRegister(false)} className="text-dark-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">이름 *</label>
                <input type="text" value={regForm.name} onChange={e => setRegForm(f => ({...f, name: e.target.value}))} className="input" placeholder="예: HR 자동화 AI" required maxLength={50} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">설명</label>
                <textarea value={regForm.description} onChange={e => setRegForm(f => ({...f, description: e.target.value}))} className="input h-20 resize-none" placeholder="에이전트의 기능과 특징을 설명해주세요" maxLength={500} />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">카테고리</label>
                <select value={regForm.category} onChange={e => setRegForm(f => ({...f, category: e.target.value}))} className="input">
                  <option value="general">🌐 일반</option>
                  <option value="hr">👥 인사·HR</option>
                  <option value="legal">⚖️ 법무</option>
                  <option value="finance">💰 재무·회계</option>
                  <option value="marketing">📢 마케팅</option>
                  <option value="customer_service">🎧 고객지원</option>
                  <option value="it">💻 IT·개발</option>
                  <option value="education">📚 교육</option>
                  <option value="healthcare">🏥 의료·헬스</option>
                  <option value="other">📦 기타</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">역량 (쉼표로 구분)</label>
                <input type="text" value={regForm.capabilities} onChange={e => setRegForm(f => ({...f, capabilities: e.target.value}))} className="input" placeholder="예: 채용 관리, 급여 계산, 근태 관리" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">요금제</label>
                <select value={regForm.pricingType} onChange={e => setRegForm(f => ({...f, pricingType: e.target.value}))} className="input">
                  <option value="free">무료</option>
                  <option value="paid">유료</option>
                </select>
              </div>
              {regForm.pricingType === 'paid' && (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">월 이용료 (원)</label>
                  <input type="number" value={regForm.priceMonthly} onChange={e => setRegForm(f => ({...f, priceMonthly: parseInt(e.target.value) || 0}))} className="input" min={0} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">웹사이트 (선택)</label>
                <input type="url" value={regForm.website} onChange={e => setRegForm(f => ({...f, website: e.target.value}))} className="input" placeholder="https://..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowRegister(false)} className="flex-1 btn bg-dark-700 hover:bg-dark-600 text-white">취소</button>
                <button type="submit" disabled={submitting || !regForm.name.trim()} className="flex-1 btn btn-primary">{submitting ? '등록 중...' : '등록'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
