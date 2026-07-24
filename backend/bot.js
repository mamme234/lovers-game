import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { User, Couple, PendingInvite } from './models.js';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.APP_URL || 'https://lovers-game.vercel.app';
const BOT_USERNAME = process.env.BOT_USERNAME || 'LoveVerseBot';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let bot = null;

if (BOT_TOKEN) {
  if (IS_PRODUCTION) {
    bot = new TelegramBot(BOT_TOKEN, {
      webHook: {
        host: '0.0.0.0',
        port: process.env.PORT || 8443,
      },
    });
    console.log('🤖 Telegram bot initialized in Webhook mode');
  } else {
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
  const webhookUrl = `${process.env.API_URL || 'https://lovers-game.onrender.com'}/webhook/${BOT_TOKEN}`;
  
  bot.deleteWebHook()
    .then(() => bot.setWebHook(webhookUrl, {
      drop_pending_updates: true,
      allowed_updates: ['message', 'callback_query'],
    }))
    .then(() => {
      console.log(`✅ Webhook set to: ${webhookUrl}`);
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
      return res.status(500).json({ error: 'Bot not initialized' });
    }
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// ============================================
// GENERATE INVITE LINK
// ============================================
export function generateInviteLink(coupleId) {
  return `https://t.me/${BOT_USERNAME}?start=ref_${coupleId}`;
}

// ============================================
// BOT COMMAND HANDLERS
// ============================================

if (bot) {
  
  // ============ /start COMMAND with Deep Linking ============
  bot.onText(/\/start(.+)?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const firstName = msg.chat.first_name || 'User';
    const username = msg.chat.username || '';
    
    const param = match[1] ? match[1].trim() : '';
    let coupleId = null;
    
    // Parse deep link: /start ref_COUPLEID
    if (param && param.startsWith('ref_')) {
      coupleId = param.substring(4);
    }
    
    try {
      console.log(`📥 /start from ${firstName} (${chatId}) with param: ${param || 'none'}`);
      
      // Find or create user
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
      
      // Check if user already has a couple
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
      
      // ============ HANDLE INVITE FROM DEEP LINK ============
      if (coupleId) {
        const couple = await Couple.findById(coupleId);
        
        if (!couple) {
          await bot.sendMessage(chatId, `
❌ <b>Invalid Invitation</b>

This invitation link is no longer valid.

Please ask your partner to send you a new invitation.

💕 LoveVerse
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
        
        // Check if couple already has two members
        if (couple.user2) {
          await bot.sendMessage(chatId, `
❌ <b>Couple Already Connected</b>

This couple already has two members.

💕 LoveVerse
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
        
        // Check if this user was the one who created the couple
        if (couple.user1.toString() === user._id.toString()) {
          await bot.sendMessage(chatId, `
❌ <b>You created this couple!</b>

You can't join your own couple.
Open the app to invite your partner.

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
        
        // ============ ACCEPT INVITE AUTOMATICALLY ============
        console.log(`✅ Auto-accepting invite for ${firstName} to couple ${coupleId}`);
        
        // Add user as second partner
        couple.user2 = user._id;
        couple.nickname2 = user.firstName;
        couple.isPaired = true;
        couple.pendingInvite = null;
        await couple.save();
        
        // Update user
        user.coupleId = couple._id;
        user.role = 'user2';
        await user.save();
        
        // Mark pending invite as accepted
        const pendingInvite = await PendingInvite.findOne({
          coupleId: couple._id,
          telegramId: chatId.toString(),
          status: 'pending'
        });
        
        if (pendingInvite) {
          pendingInvite.status = 'accepted';
          pendingInvite.acceptedAt = new Date();
          await pendingInvite.save();
        }
        
        // Get inviter info
        const inviter = await User.findById(couple.user1);
        const inviterName = inviter ? inviter.firstName : 'Your partner';
        
        // Send success message to new user
        await bot.sendMessage(chatId, `
🎉 <b>You're Connected!</b>

You are now connected with <b>${inviterName}</b> on LoveVerse!

<b>What's next?</b>
1. 📱 Open the app
2. 💬 Send a sweet message
3. 🎮 Play a game together
4. 📸 Share your first memory

${APP_URL}

Start your beautiful journey together! 💕
        `, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '💕 Open App', url: APP_URL }],
              [{ text: '💬 Send Message', url: `${APP_URL}/chat` }]
            ]
          }
        });
        
        // Notify the inviter
        if (inviter) {
          try {
            await bot.sendMessage(inviter.telegramId, `
🎉 <b>${user.firstName} has accepted your invitation!</b>

You and ${user.firstName} are now connected on LoveVerse!

Start your journey together:
💬 Chat: ${APP_URL}/chat
🎮 Play games: ${APP_URL}/games
📸 Share memories: ${APP_URL}/memories

Enjoy! 💕
            `, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '💕 Open App', url: APP_URL }]
                ]
              }
            });
          } catch (error) {
            console.error('Failed to notify inviter:', error);
          }
        }
        
        return;
      }
      
      // ============ NEW USER (NO INVITE) ============
      // Check if user has a pending invite
      const pendingInvite = await PendingInvite.findOne({
        telegramId: chatId.toString(),
        status: 'pending'
      });
      
      if (pendingInvite) {
        const couple = await Couple.findById(pendingInvite.coupleId);
        if (couple && !couple.user2) {
          await bot.sendMessage(chatId, `
💕 <b>You have a pending invitation!</b>

<b>${pendingInvite.inviterName}</b> is waiting for you to join them on LoveVerse.

Click the button below to accept the invitation:
          `, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ 
                  text: '💕 Accept Invite', 
                  url: `${APP_URL}/accept-invite?coupleId=${couple._id}&userId=${chatId}`
                }],
                [{ text: '📱 Open App', url: APP_URL }]
              ]
            }
          });
          return;
        }
      }
      
      // New user - show welcome
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

<b>How to invite your partner:</b>
1. Open the LoveVerse app
2. Click "Connect with Partner"
3. Enter their username
4. They'll receive an invitation link

<b>How to accept an invitation:</b>
1. Click the link you received
2. The bot will auto-connect you
3. Open the app and start!

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
          const partner = couple.user2 ? await User.findById(couple.user2) : null;
          message += `
💕 <b>Partner:</b> ${partner ? partner.firstName : 'Waiting...'}
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

  console.log('🤖 Bot commands registered');
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Generate an invite link for a couple
 */
export function generateInviteLink(coupleId) {
  return `https://t.me/${BOT_USERNAME}?start=ref_${coupleId}`;
}

/**
 * Send invite to a user - always use deep link if they haven't started the bot
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
    
    // Generate the deep link
    const deepLink = generateInviteLink(coupleId);
    
    // Try to find the user in our database
    const existingUser = await User.findOne({ username: cleanUsername });
    
    // Try to get chat info from Telegram
    let chatId = null;
    let userExists = false;
    
    try {
      const chatInfo = await bot.getChat(`@${cleanUsername}`);
      chatId = chatInfo.id;
      userExists = true;
    } catch (error) {
      // User doesn't exist on Telegram or hasn't started the bot
      console.log(`User @${cleanUsername} not found on Telegram or hasn't started the bot`);
    }
    
    // Create or update pending invite
    const pendingInvite = new PendingInvite({
      coupleId: coupleId,
      username: cleanUsername,
      telegramId: chatId ? chatId.toString() : 'unknown',
      pairingCode: pairingCode || 'N/A',
      inviterName: inviterName || 'Someone',
      status: 'pending',
    });
    await pendingInvite.save();
    
    // If the user has started the bot, try to send a direct message
    if (chatId && userExists) {
      try {
        const message = `
💕 <b>You've been invited to join LoveVerse!</b>

<b>${inviterName}</b> has invited you to become their partner on LoveVerse!

<b>✨ What is LoveVerse?</b>
• 🎮 Fun games for couples
• 💬 Private chat
• 📸 Share memories
• 📅 Plan dates together

Click the button below to accept the invitation:
        `;

        const keyboard = {
          inline_keyboard: [
            [{ 
              text: '💕 Accept Invite', 
              url: deepLink
            }],
            [{ 
              text: '📱 Open App', 
              url: APP_URL 
            }]
          ]
        };

        await bot.sendMessage(chatId, message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });

        console.log(`📨 Direct invite sent to @${cleanUsername}`);
        
        return { 
          success: true, 
          message: `Invite sent to @${cleanUsername}!`,
          type: 'direct',
          deepLink: deepLink
        };
        
      } catch (error) {
        console.log(`Failed to send direct message to @${cleanUsername}, falling back to deep link`);
      }
    }
    
    // If direct message failed or user hasn't started the bot, return the deep link
    console.log(`📨 Deep link generated for @${cleanUsername}: ${deepLink}`);
    
    return { 
      success: true, 
      message: `Invite link generated for @${cleanUsername}! Share this link with them: ${deepLink}`,
      type: 'deep_link',
      deepLink: deepLink
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
 * Notify couple members
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
        console.log(`📨 Notification sent to ${user.firstName}`);
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

export default {
  bot,
  handleWebhook,
  generateInviteLink,
  sendInviteByUsername,
  notifyCoupleMembers,
  notifyUser,
};
