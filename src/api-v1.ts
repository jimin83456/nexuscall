// ============================================
// API v1 Handlers - AI-First Platform
// ============================================

import type { D1Database } from '@cloudflare/workers-types';
import type { Agent, Room, Message } from './types';
import { successResponse, errorResponse, jsonResponse, ApiErrors, StatusCodes } from './api-utils';

// ============================================
// Agents API
// ============================================

export async function listAgents(db: D1Database, params: URLSearchParams): Promise<Response> {
  try {
    const limit = parseInt(params.get('limit') || '20');
    const offset = parseInt(params.get('offset') || '0');
    const onlineOnly = params.get('online') === 'true';

    let query = 'SELECT * FROM agents';
    if (onlineOnly) {
      query += ' WHERE is_online = 1';
    }
    query += ' ORDER BY last_seen DESC LIMIT ? OFFSET ?';

    const { results } = await db.prepare(query).bind(limit, offset).all<Agent>();
    
    const { results: countResult } = await db
      .prepare('SELECT COUNT(*) as total FROM agents' + (onlineOnly ? ' WHERE is_online = 1' : ''))
      .all<{ total: number }>();
    
    const total = countResult[0]?.total || 0;

    return jsonResponse(successResponse(results, {
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        hasMore: offset + results.length < total,
      },
    }));
  } catch (error) {
    console.error('listAgents error:', error);
    return jsonResponse(
      errorResponse(ApiErrors.INTERNAL_ERROR, 'Failed to fetch agents', error),
      StatusCodes[ApiErrors.INTERNAL_ERROR]
    );
  }
}

export async function createAgent(db: D1Database, body: unknown): Promise<Response> {
  try {
    const agent = body as Partial<Agent>;
    
    if (!agent.name) {
      return jsonResponse(
        errorResponse(ApiErrors.INVALID_REQUEST, 'name is required'),
        StatusCodes[ApiErrors.INVALID_REQUEST]
      );
    }

    const id = crypto.randomUUID();
    const apiKey = `nxc_${crypto.randomUUID().replace(/-/g, '')}`;
    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO agents (id, name, avatar, description, personality, api_key, created_at, is_online)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
      )
      .bind(
        id,
        agent.name,
        agent.avatar || '🤖',
        agent.description || '',
        agent.personality || '',
        apiKey,
        now
      )
      .run();

    const newAgent = await db
      .prepare('SELECT * FROM agents WHERE id = ?')
      .bind(id)
      .first<Agent>();

    return jsonResponse(successResponse(newAgent), 201);
  } catch (error) {
    console.error('createAgent error:', error);
    return jsonResponse(
      errorResponse(ApiErrors.INTERNAL_ERROR, 'Failed to create agent', error),
      StatusCodes[ApiErrors.INTERNAL_ERROR]
    );
  }
}

export async function getAgent(db: D1Database, id: string): Promise<Response> {
  try {
    const agent = await db
      .prepare('SELECT * FROM agents WHERE id = ?')
      .bind(id)
      .first<Agent>();

    if (!agent) {
      return jsonResponse(
        errorResponse(ApiErrors.NOT_FOUND, `Agent with id ${id} not found`),
        StatusCodes[ApiErrors.NOT_FOUND]
      );
    }

    return jsonResponse(successResponse(agent));
  } catch (error) {
    console.error('getAgent error:', error);
    return jsonResponse(
      errorResponse(ApiErrors.INTERNAL_ERROR, 'Failed to fetch agent', error),
      StatusCodes[ApiErrors.INTERNAL_ERROR]
    );
  }
}

// ============================================
// Rooms API
// ============================================

export async function listRooms(db: D1Database, params: URLSearchParams): Promise<Response> {
  try {
    const limit = parseInt(params.get('limit') || '20');
    const offset = parseInt(params.get('offset') || '0');
    const activeOnly = params.get('active') !== 'false';

    let query = 'SELECT * FROM rooms';
    if (activeOnly) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const { results } = await db.prepare(query).bind(limit, offset).all<Room>();
    
    const { results: countResult } = await db
      .prepare('SELECT COUNT(*) as total FROM rooms' + (activeOnly ? ' WHERE is_active = 1' : ''))
      .all<{ total: number }>();
    
    const total = countResult[0]?.total || 0;

    return jsonResponse(successResponse(results, {
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        hasMore: offset + results.length < total,
      },
    }));
  } catch (error) {
    console.error('listRooms error:', error);
    return jsonResponse(
      errorResponse(ApiErrors.INTERNAL_ERROR, 'Failed to fetch rooms', error),
      StatusCodes[ApiErrors.INTERNAL_ERROR]
    );
  }
}

export async function createRoom(db: D1Database, body: unknown): Promise<Response> {
  try {
    const room = body as Partial<Room>;
    
    if (!room.name) {
      return jsonResponse(
        errorResponse(ApiErrors.INVALID_REQUEST, 'name is required'),
        StatusCodes[ApiErrors.INVALID_REQUEST]
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO rooms (id, name, type, created_at, created_by, is_active, is_dm, password)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .bind(
        id,
        room.name,
        room.type || 'group',
        now,
        room.created_by || 'system',
        room.is_dm || 0,
        room.password || null
      )
      .run();

    const newRoom = await db
      .prepare('SELECT * FROM rooms WHERE id = ?')
      .bind(id)
      .first<Room>();

    return jsonResponse(successResponse(newRoom), 201);
  } catch (error) {
    console.error('createRoom error:', error);
    return jsonResponse(
      errorResponse(ApiErrors.INTERNAL_ERROR, 'Failed to create room', error),
      StatusCodes[ApiErrors.INTERNAL_ERROR]
    );
  }
}

export async function getRoom(db: D1Database, id: string): Promise<Response> {
  try {
    const room = await db
      .prepare('SELECT * FROM rooms WHERE id = ?')
      .bind(id)
      .first<Room>();

    if (!room) {
      return jsonResponse(
        errorResponse(ApiErrors.NOT_FOUND, `Room with id ${id} not found`),
        StatusCodes[ApiErrors.NOT_FOUND]
      );
    }

    return jsonResponse(successResponse(room));
  } catch (error) {
    console.error('getRoom error:', error);
    return jsonResponse(
      errorResponse(ApiErrors.INTERNAL_ERROR, 'Failed to fetch room', error),
      StatusCodes[ApiErrors.INTERNAL_ERROR]
    );
  }
}

// ============================================
// Messages API
// ============================================

export async function listMessages(db: D1Database, roomId: string, params: URLSearchParams): Promise<Response> {
  try {
    const limit = parseInt(params.get('limit') || '50');
    const offset = parseInt(params.get('offset') || '0');
    const before = params.get('before');
    const after = params.get('after');

    let query = 'SELECT m.*, a.name as agent_name, a.avatar as agent_avatar FROM messages m LEFT JOIN agents a ON m.agent_id = a.id WHERE m.room_id = ?';
    const bindings: (string | number)[] = [roomId];

    if (before) {
      query += ' AND m.created_at < ?';
      bindings.push(before);
    }
    if (after) {
      query += ' AND m.created_at > ?';
      bindings.push(after);
    }
    
    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);

    const { results } = await db.prepare(query).bind(...bindings).all<Message & { agent_name: string; agent_avatar: string }>();

    return jsonResponse(successResponse(results.reverse(), {
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total: results.length,
        hasMore: results.length === limit,
      },
    }));
  } catch (error) {
    console.error('listMessages error:', error);
    return jsonResponse(
      errorResponse(ApiErrors.INTERNAL_ERROR, 'Failed to fetch messages', error),
      StatusCodes[ApiErrors.INTERNAL_ERROR]
    );
  }
}

export async function createMessage(
  db: D1Database, 
  roomId: string, 
  body: unknown,
  durableObjectStub?: { fetch: (req: Request) => Promise<Response> }
): Promise<Response> {
  try {
    const message = body as Partial<Message>;
    
    if (!message.content) {
      return jsonResponse(
        errorResponse(ApiErrors.INVALID_REQUEST, 'content is required'),
        StatusCodes[ApiErrors.INVALID_REQUEST]
      );
    }
    if (!message.agent_id) {
      return jsonResponse(
        errorResponse(ApiErrors.INVALID_REQUEST, 'agent_id is required'),
        StatusCodes[ApiErrors.INVALID_REQUEST]
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO messages (id, room_id, agent_id, content, created_at, is_dm)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(id, roomId, message.agent_id, message.content, now, message.is_dm || 0)
      .run();

    // Broadcast via Durable Object if available
    if (durableObjectStub) {
      try {
        await durableObjectStub.fetch(new Request('http://internal/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            content: message.content,
            agent_id: message.agent_id,
            agent_name: message.agent_id,
            created_at: now,
          }),
        }));
      } catch (e) {
        console.log('Broadcast failed (room may not be active):', e);
      }
    }

    const newMessage = await db
      .prepare('SELECT * FROM messages WHERE id = ?')
      .bind(id)
      .first<Message>();

    return jsonResponse(successResponse(newMessage), 201);
  } catch (error) {
    console.error('createMessage error:', error);
    return jsonResponse(
      errorResponse(ApiErrors.INTERNAL_ERROR, 'Failed to create message', error),
      StatusCodes[ApiErrors.INTERNAL_ERROR]
    );
  }
}

// ============================================
// Room Members API
// ============================================

export async function joinRoom(db: D1Database, roomId: string, agentId: string): Promise<Response> {
  try {
    // Check if room exists
    const room = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(roomId).first<Room>();
    if (!room) {
      return jsonResponse(
        errorResponse(ApiErrors.NOT_FOUND, `Room with id ${roomId} not found`),
        StatusCodes[ApiErrors.NOT_FOUND]
      );
    }

    // Check if agent exists
    const agent = await db.prepare('SELECT * FROM agents WHERE id = ?').bind(agentId).first<Agent>();
    if (!agent) {
      return jsonResponse(
        errorResponse(ApiErrors.NOT_FOUND, `Agent with id ${agentId} not found`),
        StatusCodes[ApiErrors.NOT_FOUND]
      );
    }

    // Try to join (ignore if already member)
    try {
      await db
        .prepare('INSERT INTO room_members (room_id, agent_id) VALUES (?, ?)')
        .bind(roomId, agentId)
        .run();
    } catch (e) {
      // Already a member, that's fine
    }

    return jsonResponse(successResponse({ room_id: roomId, agent_id: agentId, status: 'joined' }));
  } catch (error) {
    console.error('joinRoom error:', error);
    return jsonResponse(
      errorResponse(ApiErrors.INTERNAL_ERROR, 'Failed to join room', error),
      StatusCodes[ApiErrors.INTERNAL_ERROR]
    );
  }
}

export async function leaveRoom(db: D1Database, roomId: string, agentId: string): Promise<Response> {
  try {
    await db
      .prepare('DELETE FROM room_members WHERE room_id = ? AND agent_id = ?')
      .bind(roomId, agentId)
      .run();

    return jsonResponse(successResponse({ room_id: roomId, agent_id: agentId, status: 'left' }));
  } catch (error) {
    console.error('leaveRoom error:', error);
    return jsonResponse(
      errorResponse(ApiErrors.INTERNAL_ERROR, 'Failed to leave room', error),
      StatusCodes[ApiErrors.INTERNAL_ERROR]
    );
  }
}

export async function getRoomMembers(db: D1Database, roomId: string): Promise<Response> {
  try {
    const { results } = await db
      .prepare(`
        SELECT a.id, a.name, a.avatar, a.is_online, rm.joined_at 
        FROM room_members rm 
        JOIN agents a ON rm.agent_id = a.id 
        WHERE rm.room_id = ?
        ORDER BY rm.joined_at ASC
      `)
      .bind(roomId)
      .all<{ id: string; name: string; avatar: string; is_online: number; joined_at: string }>();

    return jsonResponse(successResponse(results));
  } catch (error) {
    console.error('getRoomMembers error:', error);
    return jsonResponse(
      errorResponse(ApiErrors.INTERNAL_ERROR, 'Failed to fetch room members', error),
      StatusCodes[ApiErrors.INTERNAL_ERROR]
    );
  }
}
