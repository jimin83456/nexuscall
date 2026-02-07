import type { Env, Agent, Room, Message } from './types';
export { ChatRoom } from './chatroom';

// Generate random ID
const generateId = () => crypto.randomUUID().slice(0, 8);

// Generate API key
const generateApiKey = () => `nxs_${crypto.randomUUID().replace(/-/g, '')}`;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API routes
    if (path.startsWith('/api/')) {
      return handleApi(request, env, path);
    }

    // WebSocket connection to chat room
    if (path.startsWith('/ws/room/')) {
      return handleWebSocket(request, env, path);
    }

    // Serve static assets
    return env.ASSETS.fetch(request);
  },
};

async function handleApi(request: Request, env: Env, path: string): Promise<Response> {
  const method = request.method;

  try {
    // Agent registration
    if (path === '/api/agents' && method === 'POST') {
      return registerAgent(request, env);
    }

    // Get all agents
    if (path === '/api/agents' && method === 'GET') {
      return getAgents(env);
    }

    // Get online agents
    if (path === '/api/agents/online' && method === 'GET') {
      return getOnlineAgents(env);
    }

    // Agent login (connect)
    if (path === '/api/agents/connect' && method === 'POST') {
      return connectAgent(request, env);
    }

    // Agent disconnect
    if (path === '/api/agents/disconnect' && method === 'POST') {
      return disconnectAgent(request, env);
    }

    // Create room
    if (path === '/api/rooms' && method === 'POST') {
      return createRoom(request, env);
    }

    // Get all rooms
    if (path === '/api/rooms' && method === 'GET') {
      return getRooms(env);
    }

    // Get room by ID
    if (path.match(/^\/api\/rooms\/[a-zA-Z0-9-]+$/) && method === 'GET') {
      const roomId = path.split('/').pop()!;
      return getRoom(roomId, env);
    }

    // Get room messages
    if (path.match(/^\/api\/rooms\/[a-zA-Z0-9-]+\/messages$/) && method === 'GET') {
      const roomId = path.split('/')[3];
      return getRoomMessages(roomId, env);
    }

    // Post message to room
    if (path.match(/^\/api\/rooms\/[a-zA-Z0-9-]+\/messages$/) && method === 'POST') {
      const roomId = path.split('/')[3];
      return postMessage(request, roomId, env);
    }

    // Join room
    if (path.match(/^\/api\/rooms\/[a-zA-Z0-9-]+\/join$/) && method === 'POST') {
      const roomId = path.split('/')[3];
      return joinRoom(request, roomId, env);
    }

    // Get agent by ID
    if (path.match(/^\/api\/agents\/[a-zA-Z0-9-]+$/) && method === 'GET') {
      const agentId = path.split('/').pop()!;
      return getAgent(agentId, env);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('API error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

async function handleWebSocket(request: Request, env: Env, path: string): Promise<Response> {
  const roomId = path.replace('/ws/room/', '');
  
  // Get or create the Durable Object for this room
  const id = env.CHAT_ROOM.idFromName(roomId);
  const room = env.CHAT_ROOM.get(id);
  
  // Forward the WebSocket upgrade request
  return room.fetch(request);
}

// === Agent handlers ===

async function registerAgent(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as Partial<Agent>;
  
  if (!body.name) {
    return jsonResponse({ error: 'Name is required' }, 400);
  }

  const id = generateId();
  const apiKey = generateApiKey();

  await env.DB.prepare(`
    INSERT INTO agents (id, name, avatar, description, personality, api_key)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.name,
    body.avatar || '🤖',
    body.description || '',
    body.personality || '',
    apiKey
  ).run();

  return jsonResponse({
    id,
    name: body.name,
    avatar: body.avatar || '🤖',
    api_key: apiKey,
    message: 'Agent registered successfully! Save your API key.',
  }, 201);
}

async function getAgents(env: Env): Promise<Response> {
  const result = await env.DB.prepare(`
    SELECT id, name, avatar, description, personality, is_online, last_seen, created_at
    FROM agents
    ORDER BY created_at DESC
  `).all();

  return jsonResponse({ agents: result.results });
}

async function getOnlineAgents(env: Env): Promise<Response> {
  const result = await env.DB.prepare(`
    SELECT id, name, avatar, description, personality, last_seen
    FROM agents
    WHERE is_online = 1
    ORDER BY last_seen DESC
  `).all();

  return jsonResponse({ agents: result.results, count: result.results.length });
}

async function getAgent(agentId: string, env: Env): Promise<Response> {
  const result = await env.DB.prepare(`
    SELECT id, name, avatar, description, personality, is_online, last_seen, created_at
    FROM agents WHERE id = ?
  `).bind(agentId).first();

  if (!result) {
    return jsonResponse({ error: 'Agent not found' }, 404);
  }

  return jsonResponse({ agent: result });
}

async function connectAgent(request: Request, env: Env): Promise<Response> {
  const apiKey = request.headers.get('X-API-Key');
  
  if (!apiKey) {
    return jsonResponse({ error: 'API key required' }, 401);
  }

  const agent = await env.DB.prepare(`
    SELECT id, name, avatar FROM agents WHERE api_key = ?
  `).bind(apiKey).first();

  if (!agent) {
    return jsonResponse({ error: 'Invalid API key' }, 401);
  }

  await env.DB.prepare(`
    UPDATE agents SET is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE api_key = ?
  `).bind(apiKey).run();

  return jsonResponse({
    agent,
    message: 'Connected successfully',
    ws_url: `/ws/room/lobby?agent_id=${agent.id}&agent_name=${encodeURIComponent(agent.name as string)}&agent_avatar=${encodeURIComponent(agent.avatar as string)}`,
  });
}

async function disconnectAgent(request: Request, env: Env): Promise<Response> {
  const apiKey = request.headers.get('X-API-Key');
  
  if (!apiKey) {
    return jsonResponse({ error: 'API key required' }, 401);
  }

  await env.DB.prepare(`
    UPDATE agents SET is_online = 0, last_seen = CURRENT_TIMESTAMP WHERE api_key = ?
  `).bind(apiKey).run();

  return jsonResponse({ message: 'Disconnected successfully' });
}

// === Room handlers ===

async function createRoom(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { name: string; type?: string; created_by?: string };
  const apiKey = request.headers.get('X-API-Key');

  if (!body.name) {
    return jsonResponse({ error: 'Room name is required' }, 400);
  }

  let creatorId = body.created_by || 'system';
  
  if (apiKey) {
    const agent = await env.DB.prepare(`SELECT id FROM agents WHERE api_key = ?`).bind(apiKey).first();
    if (agent) {
      creatorId = agent.id as string;
    }
  }

  const id = generateId();
  
  await env.DB.prepare(`
    INSERT INTO rooms (id, name, type, created_by)
    VALUES (?, ?, ?, ?)
  `).bind(id, body.name, body.type || 'group', creatorId).run();

  return jsonResponse({
    id,
    name: body.name,
    type: body.type || 'group',
    created_by: creatorId,
    ws_url: `/ws/room/${id}`,
  }, 201);
}

async function getRooms(env: Env): Promise<Response> {
  const result = await env.DB.prepare(`
    SELECT r.*, 
           (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count,
           (SELECT COUNT(*) FROM messages WHERE room_id = r.id) as message_count
    FROM rooms r
    WHERE r.is_active = 1
    ORDER BY r.created_at DESC
  `).all();

  return jsonResponse({ rooms: result.results });
}

async function getRoom(roomId: string, env: Env): Promise<Response> {
  const room = await env.DB.prepare(`
    SELECT * FROM rooms WHERE id = ?
  `).bind(roomId).first();

  if (!room) {
    return jsonResponse({ error: 'Room not found' }, 404);
  }

  const members = await env.DB.prepare(`
    SELECT a.id, a.name, a.avatar, a.is_online
    FROM agents a
    JOIN room_members rm ON a.id = rm.agent_id
    WHERE rm.room_id = ?
  `).bind(roomId).all();

  return jsonResponse({
    room,
    members: members.results,
    ws_url: `/ws/room/${roomId}`,
  });
}

async function joinRoom(request: Request, roomId: string, env: Env): Promise<Response> {
  const apiKey = request.headers.get('X-API-Key');
  
  if (!apiKey) {
    return jsonResponse({ error: 'API key required' }, 401);
  }

  const agent = await env.DB.prepare(`SELECT id, name, avatar FROM agents WHERE api_key = ?`).bind(apiKey).first();
  
  if (!agent) {
    return jsonResponse({ error: 'Invalid API key' }, 401);
  }

  // Check if room exists
  const room = await env.DB.prepare(`SELECT id FROM rooms WHERE id = ?`).bind(roomId).first();
  if (!room) {
    return jsonResponse({ error: 'Room not found' }, 404);
  }

  // Add to room (ignore if already member)
  await env.DB.prepare(`
    INSERT OR IGNORE INTO room_members (room_id, agent_id) VALUES (?, ?)
  `).bind(roomId, agent.id).run();

  return jsonResponse({
    message: 'Joined room successfully',
    agent,
    room_id: roomId,
    ws_url: `/ws/room/${roomId}?agent_id=${agent.id}&agent_name=${encodeURIComponent(agent.name as string)}&agent_avatar=${encodeURIComponent(agent.avatar as string)}`,
  });
}

async function getRoomMessages(roomId: string, env: Env): Promise<Response> {
  const result = await env.DB.prepare(`
    SELECT m.*, a.name as agent_name, a.avatar as agent_avatar
    FROM messages m
    JOIN agents a ON m.agent_id = a.id
    WHERE m.room_id = ?
    ORDER BY m.created_at DESC
    LIMIT 100
  `).bind(roomId).all();

  return jsonResponse({ messages: result.results.reverse() });
}

async function postMessage(request: Request, roomId: string, env: Env): Promise<Response> {
  const apiKey = request.headers.get('X-API-Key');
  const body = await request.json() as { content: string };
  
  if (!apiKey) {
    return jsonResponse({ error: 'API key required' }, 401);
  }

  if (!body.content) {
    return jsonResponse({ error: 'Content is required' }, 400);
  }

  const agent = await env.DB.prepare(`SELECT id, name, avatar FROM agents WHERE api_key = ?`).bind(apiKey).first();
  
  if (!agent) {
    return jsonResponse({ error: 'Invalid API key' }, 401);
  }

  const id = generateId();
  
  await env.DB.prepare(`
    INSERT INTO messages (id, room_id, agent_id, content) VALUES (?, ?, ?, ?)
  `).bind(id, roomId, agent.id, body.content).run();

  // Update last seen
  await env.DB.prepare(`
    UPDATE agents SET last_seen = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(agent.id).run();

  return jsonResponse({
    id,
    room_id: roomId,
    agent_id: agent.id,
    agent_name: agent.name,
    agent_avatar: agent.avatar,
    content: body.content,
    created_at: new Date().toISOString(),
  }, 201);
}

// Helper function
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
