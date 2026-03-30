import { Hono } from 'hono';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// JWT에서 userId 추출
function getUserId(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const parts = authHeader.substring(7).split('.');
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.id;
  } catch { return null; }
}

// ==========================================
// GET /api/marketplace/agents - 마켓 목록
// ==========================================
app.get('/agents', async (c) => {
  const category = c.req.query('category');
  const search = c.req.query('search');
  const sort = c.req.query('sort') || 'rating';
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
  const offset = (page - 1) * limit;

  let where = 'WHERE is_active = 1';
  const params: any[] = [];

  if (category && category !== 'all') {
    where += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    where += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  let orderBy = 'rating DESC';
  if (sort === 'newest') orderBy = 'created_at DESC';
  else if (sort === 'popular') orderBy = 'install_count DESC';
  else if (sort === 'reviews') orderBy = 'review_count DESC';

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM agent_profiles ${where}`
  ).bind(...params).first() as any;

  const agents = await c.env.DB.prepare(
    `SELECT agent_id, name, description, category, capabilities, pricing_type, price_monthly,
            avatar_url, rating, review_count, install_count, website, created_at
     FROM agent_profiles ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  return c.json({
    success: true,
    data: {
      agents: agents.results || [],
      total: countResult?.total || 0,
      page,
      totalPages: Math.ceil((countResult?.total || 0) / limit),
    },
  });
});

// ==========================================
// GET /api/marketplace/agents/:agentId - 상세
// ==========================================
app.get('/agents/:agentId', async (c) => {
  const agentId = c.req.param('agentId');

  const agent = await c.env.DB.prepare(
    'SELECT * FROM agent_profiles WHERE agent_id = ? AND is_active = 1'
  ).bind(agentId).first() as any;

  if (!agent) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: '에이전트를 찾을 수 없습니다.' } }, 404);
  }

  // 리뷰 목록
  const reviews = await c.env.DB.prepare(
    `SELECT ar.rating, ar.comment, ar.created_at, u.name as user_name
     FROM agent_reviews ar
     LEFT JOIN users u ON ar.user_id = u.id
     WHERE ar.agent_id = ? ORDER BY ar.created_at DESC LIMIT 20`
  ).bind(agentId).all();

  return c.json({
    success: true,
    data: {
      agent,
      reviews: reviews.results || [],
    },
  });
});

// ==========================================
// POST /api/marketplace/agents - 에이전트 등록
// ==========================================
app.post('/agents', async (c) => {
  const userId = getUserId(c.req.header('Authorization'));
  if (!userId) return c.json({ error: '인증이 필요합니다.' }, 401);

  const body = await c.req.json();
  const { name, description, category, capabilities, pricingType, priceMonthly, website, avatarUrl } = body;

  if (!name?.trim()) return c.json({ error: '에이전트 이름은 필수입니다.' }, 400);
  if (name.trim().length > 50) return c.json({ error: '이름은 50자 이하로 입력해주세요.' }, 400);
  if (description?.length > 500) return c.json({ error: '설명은 500자 이하로 입력해주세요.' }, 400);

  const validCategories = ['general','hr','legal','finance','marketing','customer_service','it','education','healthcare','other'];
  if (category && !validCategories.includes(category)) {
    return c.json({ error: '올바른 카테고리를 선택해주세요.' }, 400);
  }

  const agentId = `agent-${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;
  const caps = capabilities ? JSON.stringify(capabilities) : null;

  await c.env.DB.prepare(
    `INSERT INTO agent_profiles (agent_id, user_id, name, description, category, capabilities, pricing_type, price_monthly, website, avatar_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))`
  ).bind(agentId, userId, name.trim(), description?.trim() || null, category || 'general', caps, pricingType || 'free', priceMonthly || 0, website || null, avatarUrl || null).run();

  return c.json({
    success: true,
    data: { agentId, name: name.trim() },
    message: '에이전트가 마켓에 등록되었습니다!',
  });
});

// ==========================================
// PUT /api/marketplace/agents/:agentId - 수정
// ==========================================
app.put('/agents/:agentId', async (c) => {
  const userId = getUserId(c.req.header('Authorization'));
  if (!userId) return c.json({ error: '인증이 필요합니다.' }, 401);

  const agentId = c.req.param('agentId');
  const agent = await c.env.DB.prepare('SELECT user_id FROM agent_profiles WHERE agent_id = ?').bind(agentId).first() as any;
  if (!agent) return c.json({ error: '에이전트를 찾을 수 없습니다.' }, 404);
  if (agent.user_id !== userId) return c.json({ error: '수정 권한이 없습니다.' }, 403);

  const body = await c.req.json();
  const updates: string[] = [];
  const params: any[] = [];

  if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name.trim()); }
  if (body.description !== undefined) { updates.push('description = ?'); params.push(body.description.trim()); }
  if (body.category !== undefined) { updates.push('category = ?'); params.push(body.category); }
  if (body.capabilities !== undefined) { updates.push('capabilities = ?'); params.push(JSON.stringify(body.capabilities)); }
  if (body.pricingType !== undefined) { updates.push('pricing_type = ?'); params.push(body.pricingType); }
  if (body.priceMonthly !== undefined) { updates.push('price_monthly = ?'); params.push(body.priceMonthly); }
  if (body.website !== undefined) { updates.push('website = ?'); params.push(body.website); }
  if (body.avatarUrl !== undefined) { updates.push('avatar_url = ?'); params.push(body.avatarUrl); }

  if (updates.length === 0) return c.json({ error: '수정할 항목이 없습니다.' }, 400);

  updates.push('updated_at = datetime("now")');
  params.push(agentId);

  await c.env.DB.prepare(`UPDATE agent_profiles SET ${updates.join(', ')} WHERE agent_id = ?`).bind(...params).run();

  return c.json({ success: true, message: '에이전트 정보가 수정되었습니다.' });
});

// ==========================================
// DELETE /api/marketplace/agents/:agentId - 삭제
// ==========================================
app.delete('/agents/:agentId', async (c) => {
  const userId = getUserId(c.req.header('Authorization'));
  if (!userId) return c.json({ error: '인증이 필요합니다.' }, 401);

  const agentId = c.req.param('agentId');
  const agent = await c.env.DB.prepare('SELECT user_id FROM agent_profiles WHERE agent_id = ?').bind(agentId).first() as any;
  if (!agent) return c.json({ error: '에이전트를 찾을 수 없습니다.' }, 404);
  if (agent.user_id !== userId) return c.json({ error: '삭제 권한이 없습니다.' }, 403);

  await c.env.DB.prepare('UPDATE agent_profiles SET is_active = 0 WHERE agent_id = ?').bind(agentId).run();
  return c.json({ success: true, message: '에이전트가 삭제되었습니다.' });
});

// ==========================================
// POST /api/marketplace/agents/:agentId/install - 설치
// ==========================================
app.post('/agents/:agentId/install', async (c) => {
  const userId = getUserId(c.req.header('Authorization'));
  if (!userId) return c.json({ error: '인증이 필요합니다.' }, 401);

  const agentId = c.req.param('agentId');
  const agent = await c.env.DB.prepare('SELECT agent_id FROM agent_profiles WHERE agent_id = ? AND is_active = 1').bind(agentId).first();
  if (!agent) return c.json({ error: '에이전트를 찾을 수 없습니다.' }, 404);

  await c.env.DB.prepare('UPDATE agent_profiles SET install_count = install_count + 1 WHERE agent_id = ?').bind(agentId).run();

  return c.json({ success: true, message: '에이전트가 설치되었습니다!' });
});

// ==========================================
// POST /api/marketplace/agents/:agentId/review - 리뷰
// ==========================================
app.post('/agents/:agentId/review', async (c) => {
  const userId = getUserId(c.req.header('Authorization'));
  if (!userId) return c.json({ error: '인증이 필요합니다.' }, 401);

  const agentId = c.req.param('agentId');
  const agent = await c.env.DB.prepare('SELECT agent_id FROM agent_profiles WHERE agent_id = ? AND is_active = 1').bind(agentId).first();
  if (!agent) return c.json({ error: '에이전트를 찾을 수 없습니다.' }, 404);

  const body = await c.req.json();
  const { rating, comment } = body;

  if (!rating || rating < 1 || rating > 5) return c.json({ error: '평점은 1~5 사이입니다.' }, 400);
  if (comment?.length > 300) return c.json({ error: '리뷰는 300자 이하로 입력해주세요.' }, 400);

  const id = crypto.randomUUID();

  // UPSERT (기존 리뷰가 있으면 업데이트)
  const existing = await c.env.DB.prepare(
    'SELECT id FROM agent_reviews WHERE agent_id = ? AND user_id = ?'
  ).bind(agentId, userId).first();

  if (existing) {
    await c.env.DB.prepare(
      'UPDATE agent_reviews SET rating = ?, comment = ?, created_at = datetime("now") WHERE agent_id = ? AND user_id = ?'
    ).bind(rating, comment || null, agentId, userId).run();
  } else {
    await c.env.DB.prepare(
      'INSERT INTO agent_reviews (id, agent_id, user_id, rating, comment) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, agentId, userId, rating, comment || null).run();
  }

  // 평균 평점 재계산
  const avgResult = await c.env.DB.prepare(
    'SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM agent_reviews WHERE agent_id = ?'
  ).bind(agentId).first() as any;

  await c.env.DB.prepare(
    'UPDATE agent_profiles SET rating = ?, review_count = ?, updated_at = datetime("now") WHERE agent_id = ?'
  ).bind(Math.round((avgResult?.avg_rating || 0) * 10) / 10, avgResult?.cnt || 0, agentId).run();

  return c.json({ success: true, message: existing ? '리뷰가 수정되었습니다.' : '리뷰가 등록되었습니다!' });
});

// ==========================================
// GET /api/marketplace/categories - 카테고리 목록
// ==========================================
app.get('/categories', async (c) => {
  const categories = [
    { id: 'all', name: '전체', icon: '🌐' },
    { id: 'hr', name: '인사·HR', icon: '👥' },
    { id: 'legal', name: '법무', icon: '⚖️' },
    { id: 'finance', name: '재무·회계', icon: '💰' },
    { id: 'marketing', name: '마케팅', icon: '📢' },
    { id: 'customer_service', name: '고객지원', icon: '🎧' },
    { id: 'it', name: 'IT·개발', icon: '💻' },
    { id: 'education', name: '교육', icon: '📚' },
    { id: 'healthcare', name: '의료·헬스', icon: '🏥' },
    { id: 'other', name: '기타', icon: '📦' },
  ];

  // 각 카테고리별 에이전트 수
  const counts = await c.env.DB.prepare(
    'SELECT category, COUNT(*) as cnt FROM agent_profiles WHERE is_active = 1 GROUP BY category'
  ).all();

  const countMap: Record<string, number> = {};
  (counts.results || []).forEach((r: any) => { countMap[r.category] = r.cnt; });

  const result = categories.map(cat => ({
    ...cat,
    count: cat.id === 'all'
      ? Object.values(countMap).reduce((a, b) => a + b, 0)
      : countMap[cat.id] || 0,
  }));

  return c.json({ success: true, data: { categories: result } });
});

// ==========================================
// GET /api/marketplace/my-agents - 내 에이전트
// ==========================================
app.get('/my-agents', async (c) => {
  const userId = getUserId(c.req.header('Authorization'));
  if (!userId) return c.json({ error: '인증이 필요합니다.' }, 401);

  const agents = await c.env.DB.prepare(
    'SELECT agent_id, name, description, category, rating, review_count, install_count, pricing_type, is_active FROM agent_profiles WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all();

  return c.json({ success: true, data: { agents: agents.results || [] } });
});

export default app;
