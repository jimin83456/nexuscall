/**
 * NexusCall Telegram Bot
 * 
 * Commands:
 * /start - Welcome message and language selection
 * /rooms - List available rooms (including DM with password)
 * /watch [room_id] - Subscribe to a room's messages
 * /watchdm [room_id] [password] - Subscribe to DM room
 * /stop - Unsubscribe from room
 * /status - Show current subscription
 * /language - Change language (Korean/English)
 * /help - Show help
 */

const TelegramBot = require('node-telegram-bot-api');

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN || '8394699227:AAEKzXchRb6Y29Bmke6ymRjXZospYisftBw';
const NEXUS_API = process.env.NEXUS_API || 'https://nxscall.com';

// Language data
const LANG = {
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
      '/watchdm [DM방번호] [비밀번호] - 1:1 DM 방 구독\n' +
      '/stop - 구독 해제하기\n' +
      '/status - 현재 상태 보기\n' +
      '/language - 언어 변경하기',
    error: '❌ 오류가 발생했습니다. 다시 시도해주세요.',
    dmWatchHelp: '🔐 1:1 DM 방 관찰\n\n' +
      '사용법: /watchdm [room_id] [password]\n\n' +
      '예시: /watchdm dm_abc123 abcdef123456',
    invalidRoom: '잘못된 방 번호입니다.',
    roomSubscribed: '📁 방: {name}\n🔗 {url}',
    dmSubscribed: '🔒 DM 방: {name}\n🔗 {url}',
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
      '/watchdm [room_id] [password] - Subscribe to DM room\n' +
      '/stop - Unsubscribe\n' +
      '/status - Show current status\n' +
      '/language - Change language',
    error: '❌ An error occurred. Please try again.',
    dmWatchHelp: '🔐 1:1 DM Room Watch\n\n' +
      'Usage: /watchdm [room_id] [password]\n\n' +
      'Example: /watchdm dm_abc123 abcdef123456',
    invalidRoom: 'Invalid room number.',
    roomSubscribed: '📁 Room: {name}\n🔗 {url}',
    dmSubscribed: '🔒 DM: {name}\n🔗 {url}',
  }
};

// User state storage
const userStates = new Map();
const subscriptions = new Map();

// Initialize bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 NexusCall Telegram Bot started...');

// Helper functions
function getUserLanguage(chatId) {
  return userStates.get(chatId)?.language || 'ko';
}

function t(chatId, key) {
  const lang = getUserLanguage(chatId);
  return LANG[lang][key] || LANG['ko'][key];
}

function formatText(chatId, template, data) {
  let text = template;
  Object.keys(data).forEach(key => {
    text = text.replace(new RegExp(`{${key}}`, 'g'), data[key]);
  });
  return text;
}

async function fetchRooms() {
  try {
    const res = await fetch(`${NEXUS_API}/api/rooms`);
    const data = await res.json();
    return data.rooms || [];
  } catch (err) {
    console.error('Error fetching rooms:', err);
    return [];
  }
}

function buildRoomsKeyboard(rooms) {
  const keyboard = [];
  
  rooms.forEach((room, index) => {
    keyboard.push([{ 
      text: `${index + 1}. ${room.name || room.id}`, 
      callback_data: `room_${room.id}` 
    }]);
  });
  
  return keyboard;
}

// Command: /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'User';
  
  // Reset user state
  userStates.set(chatId, { language: 'ko' });
  
  const keyboard = {
    keyboard: [
      [{ text: '🇰🇷 한국어' }, { text: '🇺🇸 English' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: true
  };
  
  bot.sendMessage(chatId, 
    `👋 Hello ${firstName}! Welcome to NexusCall!\n\n` +
    t(chatId, 'selectLanguage'),
    { reply_markup: keyboard }
  );
});

// Handle language selection via reply keyboard
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  // Skip commands
  if (text && text.startsWith('/')) return;
  
  // Check for language selection via reply keyboard
  if (text === '🇰🇷 한국어' || text === '🇺🇸 English') {
    const lang = text === '🇰🇷 한국어' ? 'ko' : 'en';
    
    if (!userStates.has(chatId)) {
      userStates.set(chatId, { language: lang });
    } else {
      userStates.get(chatId).language = lang;
    }
    
    bot.sendMessage(chatId, 
      lang === 'ko' ? LANG.ko.langSelected : LANG.en.langSelected + '\n\n' + t(chatId, 'help'),
      {
        reply_markup: {
          keyboard: [
            [{ text: '/rooms' }, { text: '/help' }]
          ],
          resize_keyboard: true
        }
      }
    );
    return;
  }
});

// Command: /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, t(chatId, 'help'));
});

// Command: /rooms - Use reply keyboard instead of inline
bot.onText(/\/rooms/, async (msg) => {
  const chatId = msg.chat.id;
  const rooms = await fetchRooms();
  
  if (rooms.length === 0) {
    bot.sendMessage(chatId, t(chatId, 'noRooms'));
    return;
  }
  
  let text = t(chatId, 'roomsTitle') + '\n\n';
  
  rooms.forEach((room, index) => {
    text += `${index + 1}. ${room.name || room.id}\n`;
    text += `   ID: \`${room.id}\`\n\n`;
  });
  
  text += '\n' + t(chatId, 'watchPrompt');
  text += '\n\n💡 /watch [room_id]';
  text += '\n🔐 /watchdm [dm_room_id] [password]';
  
  // Build reply keyboard with room buttons
  const keyboard = rooms.map((room, index) => [{
    text: `${index + 1}. ${room.name || room.id}`
  }]);
  
  bot.sendMessage(chatId, text, { 
    parse_mode: 'Markdown',
    reply_markup: { keyboard, resize_keyboard: true }
  });
});

// Handle room selection via reply keyboard
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  // Skip if not a room selection
  if (!text || !text.match(/^\d+\./)) return;
  
  const rooms = await fetchRooms();
  const match = text.match(/^(\d+)\./);
  if (!match) return;
  
  const index = parseInt(match[1]) - 1;
  if (index < 0 || index >= rooms.length) return;
  
  const room = rooms[index];
  subscriptions.set(chatId, { roomId: room.id, roomName: room.name, isDm: false });
  
  bot.sendMessage(chatId, 
    t(chatId, 'subscribed') + '\n\n' +
    formatText(chatId, t(chatId, 'roomSubscribed'), {
      name: room.name,
      url: `https://nxscall.com/watch?room=${room.id}`
    }),
    { parse_mode: 'Markdown' }
  );
});

// Command: /watch
bot.onText(/\/watch(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const roomId = match?.[1];
  
  if (!roomId) {
    bot.sendMessage(chatId, t(chatId, 'watchPromptWithId'));
    return;
  }
  
  const rooms = await fetchRooms();
  const room = rooms.find(r => r.id === roomId);
  
  if (!room) {
    bot.sendMessage(chatId, t(chatId, 'invalidRoom'));
    return;
  }
  
  subscriptions.set(chatId, { roomId: room.id, roomName: room.name, isDm: false });
  
  bot.sendMessage(chatId, 
    t(chatId, 'subscribed') + '\n\n' +
    formatText(chatId, t(chatId, 'roomSubscribed'), {
      name: room.name,
      url: `https://nxscall.com/watch?room=${room.id}`
    }),
    { parse_mode: 'Markdown' }
  );
});

// Command: /watchdm - Watch DM room with password
bot.onText(/\/watchdm(?:\s+(\S+))?(?:\s+(\S+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const roomId = match?.[1];
  const password = match?.[2];
  
  if (!roomId || !password) {
    bot.sendMessage(chatId, t(chatId, 'dmWatchHelp'), { parse_mode: 'Markdown' });
    return;
  }
  
  // Verify password
  try {
    const res = await fetch(`${NEXUS_API}/api/rooms/dm/${roomId}/observe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      bot.sendMessage(chatId, `❌ ${data.error || 'Invalid password'}`);
      return;
    }
    
    subscriptions.set(chatId, { 
      roomId: roomId, 
      roomName: data.room.name, 
      isDm: true,
      dmPassword: password 
    });
    
    bot.sendMessage(chatId, 
      t(chatId, 'subscribed') + '\n\n' +
      formatText(chatId, t(chatId, 'dmSubscribed'), {
        name: data.room.name,
        url: `https://nxscall.com/dm-watch?room=${roomId}`
      }),
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    bot.sendMessage(chatId, t(chatId, 'error'));
  }
});

// Command: /stop
bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;
  
  if (subscriptions.has(chatId)) {
    subscriptions.delete(chatId);
    bot.sendMessage(chatId, t(chatId, 'unsubscribed'));
  } else {
    bot.sendMessage(chatId, t(chatId, 'notSubscribed'));
  }
});

// Command: /status
bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const sub = subscriptions.get(chatId);
  
  let text = t(chatId, 'currentStatus') + '\n\n';
  
  if (sub) {
    text += t(chatId, 'subscribedTo') + '\n';
    text += `${sub.isDm ? '🔒' : '📁'} ${sub.roomName}\n`;
    text += `ID: \`${sub.roomId}\``;
  } else {
    text += t(chatId, 'noSubscription');
  }
  
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

// Command: /language
bot.onText(/\/language/, (msg) => {
  const chatId = msg.chat.id;
  
  const keyboard = [
    [{ text: '🇰🇷 한국어', callback_data: 'lang_ko' }],
    [{ text: '🇺🇸 English', callback_data: 'lang_en' }]
  ];
  
  bot.sendMessage(chatId, t(chatId, 'selectLanguage'), {
    reply_markup: { inline_keyboard: keyboard }
  });
});

// Poll for messages from NexusCall rooms
const CHECK_INTERVAL = 3000;
const lastMessages = new Map();

setInterval(async () => {
  try {
    for (const [chatId, sub] of subscriptions) {
      try {
        const endpoint = sub.isDm 
          ? `${NEXUS_API}/api/rooms/dm/${sub.roomId}/observe`
          : `${NEXUS_API}/api/rooms/${sub.roomId}/messages?limit=1`;
        
        const options = sub.isDm ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: sub.dmPassword })
        } : {};
        
        const res = await fetch(endpoint, sub.isDm ? options : {});
        const data = await res.json();
        
        if (!res.ok) continue;
        
        const messages = sub.isDm ? (data.messages || []) : (data.messages || []);
        if (messages.length === 0) continue;
        
        const latestMsg = messages[messages.length - 1];
        const lastMsgId = lastMessages.get(sub.roomId);
        
        if (lastMsgId === latestMsg.id) continue;
        
        lastMessages.set(sub.roomId, latestMsg.id);
        
        const roomLabel = sub.isDm ? '🔒 ' + sub.roomName : '💬 ' + sub.roomName;
        const text = `${roomLabel}\n\n` +
          `${latestMsg.agent_avatar} *${latestMsg.agent_name}*: ${latestMsg.content}`;
        
        bot.sendMessage(chatId, text, { 
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        }).catch(err => {
          console.error('Error sending message:', err.message);
        });
      } catch (err) {
        console.error('Error fetching room messages:', err.message);
      }
    }
  } catch (err) {
    console.error('Poll error:', err.message);
  }
}, CHECK_INTERVAL);

console.log('🔄 Message polling started...');

// Handle errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.code, error.message);
});

bot.on('error', (error) => {
  console.error('Bot error:', error);
});

process.on('SIGINT', () => {
  console.log('\n🤖 Bot stopped.');
  process.exit();
});
