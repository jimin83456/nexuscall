// ============================================
// Telegram Bot Worker for Cloudflare Workers
// Runs as part of NexusCall Workers
// ============================================

import { successResponse, errorResponse, jsonResponse } from './api-utils';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    from?: { id: number; first_name?: string };
    text?: string;
    date: number;
  };
  callback_query?: {
    id: string;
    from: { id: number };
    data?: string;
    message?: { chat: { id: number }; message_id: number };
  };
}

interface Env {
  BOT_TOKEN: string;
  NEXUS_API: string;
  KV: KVNamespace;
}

// Language data
const LANG: Record<string, Record<string, string>> = {
  ko: {
    welcome: '👋 안녕하세요! NexusCall Telegram Bot입니다!',
    selectLanguage: '언어를 선택해주세요:',
    langSelected: '🇰🇷 한국어로 설정되었습니다!',
    roomsTitle: '📋 참여 가능한 채팅방 목록',
    noRooms: '현재 참여 가능한 채팅방이 없습니다.',
    watchPrompt: '어떤 방을 구독하시겠습니까?',
    watchPromptWithId: '사용법: /watch [room_id]\n\nroom_id는 /rooms 명령어로 확인할 수 있습니다.',
    subscribed: '✅ 구독 완료! 이제 이 방의 메시지를 실시간으로 받게 됩니다.',
    unsubscribed: '❌ 구독 해제되었습니다.',
    notSubscribed: '구독 중인 방이 없습니다. /rooms로 방을 선택해주세요.',
    currentStatus: '📊 현재 상태',
    subscribedTo: '구독 중:',
    noSubscription: '구독 중이 아닌 방',
    help: '📖 도움말\n\n' +
      '/start - 시작하기\n' +
      '/rooms - 채팅방 목록 보기\n' +
      '/watch [방번호] - 방 구독하기\n' +
      '/stop - 구독 해제하기\n' +
      '/status - 현재 상태 보기\n' +
      '/language - 언어 변경하기',
    error: '❌ 오류가 발생했습니다. 다시 시도해주세요.',
    invalidRoom: '잘못된 방 번호입니다.',
    roomSubscribed: '📁 방: {name}\n🔗 {url}',
  },
  en: {
    welcome: '👋 Hello! Welcome to NexusCall Telegram Bot!',
    selectLanguage: 'Select your language:',
    langSelected: '🇺🇸 Language set to English!',
    roomsTitle: '📋 Available Chat Rooms',
    noRooms: 'No rooms available.',
    watchPrompt: 'Which room would you like to subscribe to?',
    watchPromptWithId: 'Usage: /watch [room_id]\n\nUse /rooms to see available room IDs.',
    subscribed: '✅ Subscribed! You will now receive messages from this room in real-time.',
    unsubscribed: '❌ Unsubscribed.',
    notSubscribed: 'Not subscribed to any room. Use /rooms to select a room.',
    currentStatus: '📊 Current Status',
    subscribedTo: 'Subscribed to:',
    noSubscription: 'Not subscribed',
    help: '📖 Help\n\n' +
      '/start - Start\n' +
      '/rooms - List available rooms\n' +
      '/watch [room_id] - Subscribe to a room\n' +
      '/stop - Unsubscribe\n' +
      '/status - Show current status\n' +
      '/language - Change language',
    error: '❌ An error occurred. Please try again.',
    invalidRoom: 'Invalid room number.',
    roomSubscribed: '📁 Room: {name}\n🔗 {url}',
  }
};

export class TelegramBotWorker {
  private token: string;
  private apiUrl: string;
  private nexusApi: string;
  private kv: KVNamespace;

  constructor(env: Env) {
    this.token = env.BOT_TOKEN;
    this.nexusApi = env.NEXUS_API || 'https://nxscall.com';
    this.kv = env.KV;
    this.apiUrl = `https://api.telegram.org/bot${this.token}`;
  }

  // ============================================
  // Main Handler
  // ============================================

  async handleRequest(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return jsonResponse(successResponse({ status: 'Telegram Bot Webhook Ready' }));
    }

    try {
      const update: TelegramUpdate = await request.json();
      await this.handleUpdate(update);
      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('Error handling update:', error);
      return new Response('Error', { status: 200 }); // Always return 200 to Telegram
    }
  }

  // ============================================
  // Update Handler
  // ============================================

  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    if (update.message) {
      await this.handleMessage(update.message);
    } else if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
    }
  }

  private async handleMessage(message: TelegramUpdate['message']): Promise<void> {
    if (!message || !message.text) return;

    const chatId = message.chat.id;
    const text = message.text;

    // Skip non-command messages
    if (!text.startsWith('/')) {
      // Handle room selection via number
      if (text.match(/^\d+\./)) {
        await this.handleRoomSelection(chatId, text);
      }
      return;
    }

    // Parse command
    const [command, ...args] = text.split(' ');

    switch (command) {
      case '/start':
        await this.cmdStart(chatId, message.from?.first_name);
        break;
      case '/help':
        await this.cmdHelp(chatId);
        break;
      case '/rooms':
        await this.cmdRooms(chatId);
        break;
      case '/watch':
        await this.cmdWatch(chatId, args[0]);
        break;
      case '/stop':
        await this.cmdStop(chatId);
        break;
      case '/status':
        await this.cmdStatus(chatId);
        break;
      case '/language':
        await this.cmdLanguage(chatId);
        break;
    }
  }

  private async handleCallbackQuery(query: TelegramUpdate['callback_query']): Promise<void> {
    if (!query.data || !query.message) return;

    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith('lang_')) {
      const lang = data.split('_')[1];
      await this.setUserLanguage(chatId, lang);
      await this.answerCallbackQuery(query.id, lang === 'ko' ? '한국어로 변경됨' : 'Changed to English');
      await this.sendMessage(chatId, this.t(chatId, 'help'));
    }
  }

  // ============================================
  // Commands
  // ============================================

  private async cmdStart(chatId: number, firstName?: string): Promise<void> {
    await this.setUserLanguage(chatId, 'ko');

    const keyboard = {
      keyboard: [
        [{ text: '🇰🇷 한국어' }, { text: '🇺🇸 English' }]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    };

    await this.sendMessage(
      chatId,
      `👋 Hello ${firstName || 'User'}! Welcome to NexusCall!\n\n` + this.t(chatId, 'selectLanguage'),
      keyboard
    );
  }

  private async cmdHelp(chatId: number): Promise<void> {
    await this.sendMessage(chatId, this.t(chatId, 'help'));
  }

  private async cmdRooms(chatId: number): Promise<void> {
    const rooms = await this.fetchRooms();

    if (rooms.length === 0) {
      await this.sendMessage(chatId, this.t(chatId, 'noRooms'));
      return;
    }

    let text = this.t(chatId, 'roomsTitle') + '\n\n';
    rooms.forEach((room: any, index: number) => {
      text += `${index + 1}. ${room.name || room.id}\n`;
      text += `   ID: \`${room.id}\`\n\n`;
    });

    text += '\n' + this.t(chatId, 'watchPrompt');
    text += '\n\n💡 /watch [room_id]';

    const keyboard = rooms.map((room: any, index: number) => [{
      text: `${index + 1}. ${room.name || room.id}`
    }]);

    await this.sendMessage(chatId, text, { keyboard, resize_keyboard: true });
  }

  private async cmdWatch(chatId: number, roomId?: string): Promise<void> {
    if (!roomId) {
      await this.sendMessage(chatId, this.t(chatId, 'watchPromptWithId'));
      return;
    }

    const room = await this.fetchRoom(roomId);

    if (!room) {
      await this.sendMessage(chatId, this.t(chatId, 'invalidRoom'));
      return;
    }

    // Create agent if not exists
    let agentId = await this.getUserAgentId(chatId);
    if (!agentId) {
      const agent = await this.createAgent(
        `Telegram_${chatId}`,
        '📱',
        'Telegram Bot User',
        'Friendly'
      );
      if (agent) {
        agentId = agent.id;
        await this.setUserAgentId(chatId, agentId);
      }
    }

    // Join room
    if (agentId) {
      await this.joinRoom(roomId, agentId);
    }

    await this.setSubscription(chatId, { roomId: room.id, roomName: room.name });

    await this.sendMessage(
      chatId,
      this.t(chatId, 'subscribed') + '\n\n' +
      this.formatText(chatId, this.t(chatId, 'roomSubscribed'), {
        name: room.name,
        url: `https://nxscall.com/watch?room=${room.id}`
      }),
      null,
      'Markdown'
    );
  }

  private async cmdStop(chatId: number): Promise<void> {
    const sub = await this.getSubscription(chatId);

    if (sub) {
      await this.deleteSubscription(chatId);
      await this.sendMessage(chatId, this.t(chatId, 'unsubscribed'));
    } else {
      await this.sendMessage(chatId, this.t(chatId, 'notSubscribed'));
    }
  }

  private async cmdStatus(chatId: number): Promise<void> {
    const sub = await this.getSubscription(chatId);

    let text = this.t(chatId, 'currentStatus') + '\n\n';

    if (sub) {
      text += this.t(chatId, 'subscribedTo') + '\n';
      text += `📁 ${sub.roomName}\n`;
      text += `ID: \`${sub.roomId}\``;
    } else {
      text += this.t(chatId, 'noSubscription');
    }

    await this.sendMessage(chatId, text, null, 'Markdown');
  }

  private async cmdLanguage(chatId: number): Promise<void> {
    const keyboard = {
      inline_keyboard: [
        [{ text: '🇰🇷 한국어', callback_data: 'lang_ko' }],
        [{ text: '🇺🇸 English', callback_data: 'lang_en' }]
      ]
    };

    await this.sendMessage(chatId, this.t(chatId, 'selectLanguage'), keyboard);
  }

  private async handleRoomSelection(chatId: number, text: string): Promise<void> {
    const rooms = await this.fetchRooms();
    const match = text.match(/^(\d+)\./);
    if (!match) return;

    const index = parseInt(match[1]) - 1;
    if (index < 0 || index >= rooms.length) return;

    const room = rooms[index];
    await this.cmdWatch(chatId, room.id);
  }

  // ============================================
  // API Helpers
  // ============================================

  private async fetchRooms(limit = 50): Promise<any[]> {
    try {
      const res = await fetch(`${this.nexusApi}/api/v1/rooms?limit=${limit}`);
      const data = await res.json() as any;
      return data.success ? data.data : [];
    } catch (err) {
      console.error('Error fetching rooms:', err);
      return [];
    }
  }

  private async fetchRoom(roomId: string): Promise<any | null> {
    try {
      const res = await fetch(`${this.nexusApi}/api/v1/rooms/${roomId}`);
      const data = await res.json() as any;
      return data.success ? data.data : null;
    } catch (err) {
      console.error('Error fetching room:', err);
      return null;
    }
  }

  private async createAgent(name: string, avatar: string, description: string, personality: string): Promise<any | null> {
    try {
      const res = await fetch(`${this.nexusApi}/api/v1/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar, description, personality }),
      });
      const data = await res.json() as any;
      return data.success ? data.data : null;
    } catch (err) {
      console.error('Error creating agent:', err);
      return null;
    }
  }

  private async joinRoom(roomId: string, agentId: string): Promise<any | null> {
    try {
      const res = await fetch(`${this.nexusApi}/api/v1/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId }),
      });
      const data = await res.json() as any;
      return data.success ? data.data : null;
    } catch (err) {
      console.error('Error joining room:', err);
      return null;
    }
  }

  // ============================================
  // Telegram API
  // ============================================

  private async sendMessage(chatId: number, text: string, replyMarkup?: any, parseMode?: string): Promise<void> {
    const body: any = {
      chat_id: chatId,
      text: text,
    };

    if (replyMarkup) body.reply_markup = replyMarkup;
    if (parseMode) body.parse_mode = parseMode;

    await fetch(`${this.apiUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
    await fetch(`${this.apiUrl}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
      }),
    });
  }

  // ============================================
  // KV Storage
  // ============================================

  private async getUserLanguage(chatId: number): Promise<string> {
    const data = await this.kv.get(`user:${chatId}`);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed.language || 'ko';
    }
    return 'ko';
  }

  private async setUserLanguage(chatId: number, lang: string): Promise<void> {
    const key = `user:${chatId}`;
    const existing = await this.kv.get(key);
    const data = existing ? JSON.parse(existing) : {};
    data.language = lang;
    await this.kv.put(key, JSON.stringify(data));
  }

  private async getUserAgentId(chatId: number): Promise<string | null> {
    const data = await this.kv.get(`user:${chatId}`);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed.agentId || null;
    }
    return null;
  }

  private async setUserAgentId(chatId: number, agentId: string): Promise<void> {
    const key = `user:${chatId}`;
    const existing = await this.kv.get(key);
    const data = existing ? JSON.parse(existing) : {};
    data.agentId = agentId;
    await this.kv.put(key, JSON.stringify(data));
  }

  private async getSubscription(chatId: number): Promise<any | null> {
    const data = await this.kv.get(`sub:${chatId}`);
    return data ? JSON.parse(data) : null;
  }

  private async setSubscription(chatId: number, sub: any): Promise<void> {
    await this.kv.put(`sub:${chatId}`, JSON.stringify(sub));
  }

  private async deleteSubscription(chatId: number): Promise<void> {
    await this.kv.delete(`sub:${chatId}`);
  }

  // ============================================
  // Localization Helpers
  // ============================================

  private t(chatId: number, key: string): string {
    const lang = 'ko'; // Default for now, can be enhanced
    return LANG[lang]?.[key] || LANG['ko'][key] || key;
  }

  private formatText(chatId: number, template: string, data: Record<string, string>): string {
    let text = template;
    Object.keys(data).forEach(key => {
      text = text.replace(new RegExp(`{${key}}`, 'g'), data[key]);
    });
    return text;
  }
}

// ============================================
// Export for Worker
// ============================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Bot webhook endpoint
    if (url.pathname === '/bot/webhook') {
      const bot = new TelegramBotWorker(env);
      return bot.handleRequest(request);
    }

    // Set webhook (for admin use)
    if (url.pathname === '/bot/set-webhook') {
      const bot = new TelegramBotWorker(env);
      const webhookUrl = `${env.NEXUS_API || 'https://nxscall.com'}/bot/webhook`;
      
      try {
        const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webhookUrl }),
        });
        const data = await res.json();
        return jsonResponse(successResponse(data));
      } catch (error) {
        return jsonResponse(errorResponse('WEBHOOK_ERROR', 'Failed to set webhook', error));
      }
    }

    // Get webhook info
    if (url.pathname === '/bot/webhook-info') {
      try {
        const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getWebhookInfo`);
        const data = await res.json();
        return jsonResponse(successResponse(data));
      } catch (error) {
        return jsonResponse(errorResponse('WEBHOOK_INFO_ERROR', 'Failed to get webhook info', error));
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};
