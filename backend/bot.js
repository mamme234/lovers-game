import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { User, Couple, PendingInvite, InviteCode } from './models.js';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.APP_URL || 'https://lovers-game.vercel.app';
const API_URL = process.env.API_URL || 'https://lovers-game.onrender.com';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let bot = null;

// Initialize bot with appropriate mode
if (BOT_TOKEN) {
  if (IS_PRODUCTION) {
    // Production: Webhook mode
    bot = new TelegramBot(BOT_TOKEN, {
      webHook: {
        host: '0.0.0.0',
        port: process.env.PORT || 8443,
      },
    });
    console.log('🤖 Telegram bot initialized in Webhook mode');
  } else {
    // Development: Polling mode
    bot = new TelegramBot(BOT_TOKEN, { polling: true });
    console.log('🤖 Telegram bot initialized in Polling mode');
  }
} else {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN not set. Bot features disabled.');
}

// ============================================
// SET WEBHOOK (production only)
// ============================================
if (IS_PRODUCTION && bot && BOT_TOKEN) {
  const webhookUrl = `${API_URL}/webhook/${BOT_TOKEN}`;
  
  // Delete any existing webhook first
  bot.deleteWebHook()
    .then(() => {
      console.log('✅ Old webhook deleted');
      return bot.setWebHook(webhookUrl, {
        drop_pending_updates: true,
        allowed_updates: ['message', 'callback_query', 'inline_query'],
      });
    })
    .then(() => {
      console.log(`✅ Webhook set to: ${webhookUrl}`);
      console.log('🔗 Webhook URL:', webhookUrl);
      
      // Get webhook info to verify
      return bot.getWebHookInfo();
    })
    .then((info) => {
      console.log('📋 Webhook info:', {
        url: info.url,
        pending_update_count: info.pending_update_count,
        last_error_date: info.last_error_date ? new Date(info.last_error_date * 1000) : null,
        last_error_message: info.last_error_message,
      });
    })
    .catch((error) => {
      console.error('❌ Failed to set webhook:', error);
    });
}

// ============================================
// WEBHOOK HANDLER
// ============================================
export function handleWebhook(req, res) {
  try {
    if (!bot) {
      console.error('Bot not initialized');
      return res.status(500).json({ error: 'Bot not initialized' });
    }
    
    // Process the update
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// ============================================
// BOT COMMAND HANDLERS
// ============================================

if (bot) {
  
  // ============ /start COMMAND ============
  bot.onText(/\/start(.+)?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const firstName = msg.chat.first_name || 'User';
    const username = msg.chat.username || '';
    
    const param = match[1] ? match[1].trim() : '';
    let coupleId = null;
    
    if (param && param.startsWith('ref_')) {
      coupleId = param.substring(4);
    }
    
    try {
      let user = await User.findOne({ telegramId: chatId.toString() });
      
      if (!user) {
        user = new User({
          telegramId: chatId.toString(),
          username: username,
          firstName: firstName,
          lastName: msg.chat.last_name || '',
          photoUrl: '',
          isPremium: msg.chat.is_premium || false,
          level: 1,
          xp: 0,
          coins: 0,
        });
        await user.save();
        console.log(`📝 New user registered: ${firstName} (${chatId})`);
      }
      
      if (user.coupleId) {
        const couple = await Couple.findById(user.coupleId);
        await bot.sendMessage(chatId, `
💕 <b>Welcome back to LoveVerse!</b>

You're already connected with your partner.
Open the app to continue your journey together!

${APP_URL}

Enjoy your time together! 🎉
        `, { 
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Open App', url: APP_URL }]
            ]
          }
        });
        return;
      }
      
      if (coupleId) {
        const couple = await Couple.findById(coupleId);
        if (couple && !couple.user2) {
          await bot.sendMessage(chatId, `
💕 <b>You've been invited to join a couple!</b>

${couple.nickname1 || 'Someone'} has invited you to become their partner on LoveVerse.

Click the button below to accept the invitation:
          `, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ 
                  text: '💕 Accept Invite', 
                  url: `${APP_URL}/accept-invite?coupleId=${coupleId}&userId=${chatId}`
                }],
                [{ text: '📱 Open App', url: APP_URL }]
              ]
            }
          });
          
          const pendingInvite = new PendingInvite({
            coupleId: coupleId,
            username: username || chatId.toString(),
            telegramId: chatId.toString(),
            pairingCode: couple.pairingCode,
            inviterName: couple.nickname1 || 'Your partner',
            status: 'pending',
          });
          await pendingInvite.save();
          return;
        }
      }
      
      await bot.sendMessage(chatId, `
💕 <b>Welcome to LoveVerse!</b>

Hi ${firstName}! 🎉

LoveVerse is the ultimate couples app for Telegram. 
Connect with your partner and enjoy:

<b>Features:</b>
• 🎮 Fun games
• 💬 Private chat
• 📸 Shared memories
• 📅 Date planner
• 🏆 Achievements

<b>Get started:</b>
1. Open the app
2. Create or join a couple
3. Start your journey together!

${APP_URL}

Have a beautiful journey together! 💕
      `, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💕 Get Started', url: APP_URL }]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in /start handler:', error);
      await bot.sendMessage(chatId, '❌ Something went wrong. Please try again later.');
    }
  });

  // ============ /help COMMAND ============
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    
    await bot.sendMessage(chatId, `
💕 <b>LoveVerse Help Center</b>

<b>Commands:</b>
/start - Start the bot
/help - Show this help
/status - Check your profile
/leaderboard - Top users
/invite @username - Invite someone

<b>How to use LoveVerse:</b>
1. Open the mini app
2. Create or join a couple
3. Enjoy games, chat, and memories!

${APP_URL}
    `, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Open App', url: APP_URL }]
        ]
      }
    });
  });

  // ============ /invite COMMAND ============
  bot.onText(/\/invite (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const targetUsername = match[1].trim().replace('@', '');
    
    try {
      const user = await User.findOne({ telegramId: chatId.toString() });
      
      if (!user || !user.coupleId) {
        await bot.sendMessage(chatId, `
❌ <b>You need to be in a couple first!</b>

Create a couple in the app and try again.
${APP_URL}
        `, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Open App', url: APP_URL }]
            ]
          }
        });
        return;
      }
      
      const couple = await Couple.findById(user.coupleId);
      const inviterName = user.firstName || 'Your partner';
      const pairingCode = couple.pairingCode || 'N/A';
      
      const result = await sendInviteByUsername(
        targetUsername,
        user.coupleId,
        inviterName,
        pairingCode
      );
      
      if (result.success) {
        await bot.sendMessage(chatId, `
✅ <b>Invite sent successfully!</b>

Your invitation has been sent to @${targetUsername}.
They will receive it in their Telegram.

💕 LoveVerse
        `, {
          parse_mode: 'HTML'
        });
      } else {
        await bot.sendMessage(chatId, `
❌ <b>Failed to send invite</b>

${result.message || 'Please try again later.'}
        `, {
          parse_mode: 'HTML'
        });
      }
    } catch (error) {
      console.error('Invite command error:', error);
      await bot.sendMessage(chatId, '❌ Failed to send invite. Please try again.');
    }
  });

  // ============ /status COMMAND ============
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
      const user = await User.findOne({ telegramId: chatId.toString() });
      
      if (!user) {
        await bot.sendMessage(chatId, `
❌ <b>User not found</b>

Please open the app first to register:
${APP_URL}
        `, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Open App', url: APP_URL }]
            ]
          }
        });
        return;
      }
      
      let message = `
📊 <b>Your LoveVerse Status</b>

👤 <b>Name:</b> ${user.firstName} ${user.lastName || ''}
🏆 <b>Level:</b> ${user.level}
⭐ <b>XP:</b> ${user.xp}
💰 <b>Coins:</b> ${user.coins}
🔥 <b>Streak:</b> ${user.dailyStreak} days
      `;
      
      if (user.coupleId) {
        const couple = await Couple.findById(user.coupleId);
        if (couple) {
          message += `
💕 <b>Couple:</b> ${couple.nickname1 || 'You'} & ${couple.nickname2 || 'Partner'}
❤️ <b>Relationship Level:</b> ${couple.relationshipLevel || 1}
          `;
        }
      } else {
        message += `
💕 <b>Status:</b> Not paired yet
        `;
      }
      
      await bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 Open App', url: APP_URL }]
          ]
        }
      });
    } catch (error) {
      console.error('Status command error:', error);
      await bot.sendMessage(chatId, '❌ Failed to get status.');
    }
  });

  // ============ /leaderboard COMMAND ============
  bot.onText(/\/leaderboard/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
      const topUsers = await User.find()
        .sort({ level: -1, xp: -1 })
        .limit(10)
        .select('firstName lastName level xp coins');
      
      let message = `🏆 <b>LoveVerse Leaderboard</b>\n\n`;
      
      if (topUsers.length === 0) {
        message += 'No users yet. Be the first! 🎉';
      } else {
        topUsers.forEach((user, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          message += `${medal} <b>${user.firstName}</b> - Level ${user.level} | ${user.xp} XP\n`;
        });
      }
      
      await bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 Open App', url: APP_URL }]
          ]
        }
      });
    } catch (error) {
      console.error('Leaderboard error:', error);
      await bot.sendMessage(chatId, '❌ Failed to get leaderboard.');
    }
  });

  // ============ CALLBACK QUERY HANDLERS ============
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    
    try {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: 'Opening app...',
        show_alert: false
      });
      
      await bot.sendMessage(chatId, `
💕 <b>Opening LoveVerse...</b>

Click the button below to open the app:
        `, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Open App', url: APP_URL }]
            ]
          }
        });
    } catch (error) {
      console.error('Callback error:', error);
    }
  });

  // ============ ERROR HANDLING ============
  bot.on('error', (error) => {
    console.error('Bot error:', error);
  });

  if (!IS_PRODUCTION) {
    bot.on('polling_error', (error) => {
      console.error('Polling error:', error);
    });
  }

  console.log('🤖 Bot commands registered');
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Send an invite to a user by their username
 */
export async function sendInviteByUsername(username, coupleId, inviterName, pairingCode) {
  try {
    if (!bot) {
      return { 
        success: false, 
        message: 'Bot not configured.' 
      };
    }

    const cleanUsername = username.replace('@', '').trim();
    
    let chatInfo;
    try {
      chatInfo = await bot.getChat(`@${cleanUsername}`);
    } catch (error) {
      return { 
        success: false, 
        message: `User @${cleanUsername} not found on Telegram.` 
      };
    }

    const chatId = chatInfo.id;

    // Check if user already has a pending invite
    const existingInvite = await PendingInvite.findOne({
      coupleId: coupleId,
      telegramId: chatId.toString(),
      status: 'pending'
    });

    if (existingInvite) {
      return {
        success: false,
        message: `User @${cleanUsername} already has a pending invite.`
      };
    }

    const pendingInvite = new PendingInvite({
      coupleId: coupleId,
      username: cleanUsername,
      telegramId: chatId.toString(),
      pairingCode: pairingCode || 'N/A',
      inviterName: inviterName || 'Someone',
      status: 'pending',
    });
    await pendingInvite.save();

    const message = `
💕 <b>You've been invited to join LoveVerse!</b>

<b>${inviterName}</b> has invited you to become their partner on LoveVerse!

<b>✨ What is LoveVerse?</b>
• 🎮 10+ fun games for couples
• 💬 Private and secure chat
• 📸 Share memories and photos
• 📅 Plan dates together

<b>Join now and start your journey! 💕</b>
    `;

    const keyboard = {
      inline_keyboard: [
        [{ 
          text: '💕 Accept Invite', 
          url: `${APP_URL}/accept-invite?coupleId=${coupleId}&userId=${chatId}`
        }],
        [{ 
          text: '📱 Open App', 
          url: APP_URL 
        }],
        [{ 
          text: 'ℹ️ Learn More', 
          callback_data: 'learn_more'
        }]
      ]
    };

    await bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });

    console.log(`📨 Invite sent to @${cleanUsername} for couple ${coupleId}`);
    
    return { 
      success: true, 
      message: `Invite sent to @${cleanUsername}!`,
      chatId: chatId
    };

  } catch (error) {
    console.error('Send invite error:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to send invite' 
    };
  }
}

/**
 * Notify all members of a couple
 */
export async function notifyCoupleMembers(coupleId, message) {
  try {
    if (!bot) return;

    const couple = await Couple.findById(coupleId).populate('user1 user2');
    if (!couple) return;

    const users = [couple.user1, couple.user2].filter(Boolean);
    
    for (const user of users) {
      try {
        await bot.sendMessage(user.telegramId, message, {
          parse_mode: 'HTML'
        });
        console.log(`📨 Notification sent to ${user.firstName} (${user.telegramId})`);
      } catch (error) {
        console.error(`Failed to notify user ${user.telegramId}:`, error);
      }
    }
  } catch (error) {
    console.error('Notify couple members error:', error);
  }
}

/**
 * Notify a single user
 */
export async function notifyUser(telegramId, message, options = {}) {
  try {
    if (!bot) return;

    await bot.sendMessage(telegramId, message, {
      parse_mode: 'HTML',
      ...options
    });
    console.log(`📨 Notification sent to ${telegramId}`);
  } catch (error) {
    console.error(`Failed to notify user ${telegramId}:`, error);
  }
}

/**
 * Send a game invitation
 */
export async function sendGameInvite(coupleId, gameType, inviterName) {
  try {
    if (!bot) return;

    const couple = await Couple.findById(coupleId).populate('user1 user2');
    if (!couple) return;

    const partner = couple.user2 || couple.user1;
    if (!partner) return;

    const message = `
🎮 <b>Game Invitation!</b>

${inviterName} has invited you to play <b>${gameType.replace('_', ' ')}</b>!

Open the app to join the game:
${APP_URL}

💕 LoveVerse
    `;

    await bot.sendMessage(partner.telegramId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Join Game', url: `${APP_URL}/games` }]
        ]
      }
    });
  } catch (error) {
    console.error('Send game invite error:', error);
  }
}

export default {
  bot,
  handleWebhook,
  sendInviteByUsername,
  notifyCoupleMembers,
  notifyUser,
  sendGameInvite,
};
