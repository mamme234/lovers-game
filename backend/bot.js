import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { User, Couple, PendingInvite } from './models.js';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.APP_URL || 'https://lovers-game.vercel.app';
const BOT_USERNAME = process.env.BOT_USERNAME || 'LoveVerse_bot';
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
// GENERATE COUPLE LINK
// ============================================
export function generateCoupleLink(coupleId) {
  return `https://t.me/${BOT_USERNAME}?start=ref_${coupleId}`;
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
      
      // ============ CASE 1: User already has a couple ============
      if (user.coupleId) {
        const couple = await Couple.findById(user.coupleId);
        const partner = couple.user2 ? await User.findById(couple.user2) : null;
        
        await bot.sendMessage(chatId, `
💕 <b>Welcome back to LoveVerse!</b>

You're already connected with ${partner ? partner.firstName : 'your partner'}.

<b>Your Couple Info:</b>
💑 ${couple.nickname1 || 'You'} & ${couple.nickname2 || 'Partner'}
❤️ Level: ${couple.relationshipLevel || 1}
⭐ XP: ${couple.relationshipXp || 0}

Open the app to continue your journey together!

${APP_URL}

Enjoy your time together! 🎉
        `, { 
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Open App', url: APP_URL }],
              [{ text: '💬 Chat with Partner', url: `${APP_URL}/chat` }]
            ]
          }
        });
        return;
      }
      
      // ============ CASE 2: User was invited (has coupleId in param) ============
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

Share this link with your partner:
${generateCoupleLink(coupleId)}
          `, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '📋 Copy Link', callback_data: `copy_${generateCoupleLink(coupleId)}` }],
                [{ text: '📱 Open App', url: APP_URL }]
              ]
            }
          });
          return;
        }
        
        // ============ ACCEPT INVITE ============
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
        
        // Award welcome bonus
        user.coins = (user.coins || 0) + 100;
        user.xp = (user.xp || 0) + 50;
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
      
      // ============ CASE 3: New user (no invite) ============
      // Show main menu with option to create couple
      await bot.sendMessage(chatId, `
💕 <b>Welcome to LoveVerse!</b>

Hi ${firstName}! 🎉

You're not in a couple yet. Here are your options:

<b>💑 Create a Couple</b>
Start your journey by creating a couple and inviting your partner.

<b>🔗 Join a Couple</b>
If you already have an invite link, click it to join.

<b>Features:</b>
• 🎮 Fun games
• 💬 Private chat
• 📸 Shared memories
• 📅 Date planner
      `, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💑 Create Couple', callback_data: 'create_couple' }],
            [{ text: '📱 Open App', url: APP_URL }]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in /start handler:', error);
      await bot.sendMessage(chatId, '❌ Something went wrong. Please try again later.');
    }
  });

  // ============ /create COMMAND ============
  bot.onText(/\/create/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.chat.first_name || 'User';
    
    try {
      const user = await User.findOne({ telegramId: chatId.toString() });
      
      if (!user) {
        await bot.sendMessage(chatId, `
❌ <b>User not found</b>

Please start the bot first with /start
        `, {
          parse_mode: 'HTML'
        });
        return;
      }
      
      if (user.coupleId) {
        await bot.sendMessage(chatId, `
❌ <b>You already have a couple!</b>

Use /status to see your couple info.
        `, {
          parse_mode: 'HTML'
        });
        return;
      }
      
      // Create couple
      const couple = new Couple({
        user1: user._id,
        nickname1: user.firstName,
        pairingCode: generatePairingCode(),
        isPaired: false,
      });
      await couple.save();
      
      // Update user
      user.coupleId = couple._id;
      user.role = 'user1';
      await user.save();
      
      // Generate invite link
      const inviteLink = generateCoupleLink(couple._id);
      
      await bot.sendMessage(chatId, `
💑 <b>Couple Created!</b>

Your couple has been created successfully!

<b>Share this link with your partner:</b>
${inviteLink}

<b>How it works:</b>
1. Send this link to your partner
2. They click it and join the bot
3. You'll be connected automatically! 🎉

Or open the app to manage your couple:
${APP_URL}
      `, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Copy Link', callback_data: `copy_${inviteLink}` }],
            [{ text: '📤 Share Link', url: `tg://msg_url?url=${encodeURIComponent(inviteLink)}&text=Join%20me%20on%20LoveVerse!` }],
            [{ text: '📱 Open App', url: APP_URL }]
          ]
        }
      });
      
    } catch (error) {
      console.error('Create couple error:', error);
      await bot.sendMessage(chatId, '❌ Failed to create couple. Please try again.');
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

Please start the bot first with /start
        `, {
          parse_mode: 'HTML'
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
💕 <b>Couple:</b> ${couple.nickname1 || 'You'} & ${partner ? partner.firstName : 'Waiting for partner...'}
❤️ <b>Relationship Level:</b> ${couple.relationshipLevel || 1}
${!partner ? `
📨 <b>Invite Link:</b>
${generateCoupleLink(couple._id)}
` : ''}
          `;
        }
      } else {
        message += `
💕 <b>Status:</b> Not in a couple

Use /create to create a couple!
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

  // ============ /help COMMAND ============
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    
    await bot.sendMessage(chatId, `
💕 <b>LoveVerse Help Center</b>

<b>Commands:</b>
/start - Start the bot
/create - Create a couple
/status - Check your profile
/help - Show this help

<b>How to use LoveVerse:</b>
1. Start the bot with /start
2. Use /create to create a couple
3. Share the invite link with your partner
4. Your partner clicks the link
5. You're connected! 🎉

<b>Or use the mini app:</b>
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

  // ============ CALLBACK QUERY HANDLERS ============
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    
    try {
      if (data === 'create_couple') {
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: 'Creating couple...',
          show_alert: false
        });
        
        // Simulate /create command
        const user = await User.findOne({ telegramId: chatId.toString() });
        
        if (user && user.coupleId) {
          await bot.sendMessage(chatId, '❌ You already have a couple!');
          return;
        }
        
        // Create couple
        const couple = new Couple({
          user1: user._id,
          nickname1: user.firstName,
          pairingCode: generatePairingCode(),
          isPaired: false,
        });
        await couple.save();
        
        user.coupleId = couple._id;
        user.role = 'user1';
        await user.save();
        
        const inviteLink = generateCoupleLink(couple._id);
        
        await bot.sendMessage(chatId, `
💑 <b>Couple Created!</b>

Share this link with your partner:
${inviteLink}

They'll be connected automatically when they click it! 💕
        `, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📋 Copy Link', callback_data: `copy_${inviteLink}` }],
              [{ text: '📤 Share Link', url: `tg://msg_url?url=${encodeURIComponent(inviteLink)}&text=Join%20me%20on%20LoveVerse!` }],
              [{ text: '📱 Open App', url: APP_URL }]
            ]
          }
        });
        return;
      }
      
      if (data.startsWith('copy_')) {
        const link = data.replace('copy_', '');
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: 'Link copied! 📋',
          show_alert: false
        });
        // Note: Can't actually copy to clipboard from bot, but user can select text
        await bot.sendMessage(chatId, `
📋 <b>Your invite link:</b>

${link}

Send this to your partner! 💕
        `, {
          parse_mode: 'HTML'
        });
        return;
      }
      
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: 'Opening app...',
        show_alert: false
      });
      
    } catch (error) {
      console.error('Callback error:', error);
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: 'Something went wrong',
        show_alert: true
      });
    }
  });

  console.log('🤖 Bot commands registered');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generatePairingCode() {
  const crypto = await import('crypto');
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

export function generateCoupleLink(coupleId) {
  return `https://t.me/${BOT_USERNAME}?start=ref_${coupleId}`;
}

/**
 * Send invite to a user by their username
 */
export async function sendInviteByUsername(username, coupleId, inviterName) {
  try {
    if (!bot) {
      return { 
        success: false, 
        message: 'Bot not configured.' 
      };
    }

    const cleanUsername = username.replace('@', '').trim();
    const deepLink = generateCoupleLink(coupleId);
    
    // Try to get chat info from Telegram
    let chatId = null;
    let userExists = false;
    
    try {
      const chatInfo = await bot.getChat(`@${cleanUsername}`);
      chatId = chatInfo.id;
      userExists = true;
    } catch (error) {
      console.log(`⚠️ User @${cleanUsername} not found on Telegram`);
    }
    
    // Create pending invite
    const pendingInvite = new PendingInvite({
      coupleId: coupleId,
      username: cleanUsername,
      telegramId: chatId ? chatId.toString() : 'unknown',
      pairingCode: 'N/A',
      inviterName: inviterName || 'Someone',
      status: 'pending',
    });
    await pendingInvite.save();
    
    // If user exists, send direct message
    if (chatId && userExists) {
      try {
        const message = `
💕 <b>You've been invited to join LoveVerse!</b>

<b>${inviterName}</b> has invited you to become their partner!

Click the button below to accept:
        `;

        const keyboard = {
          inline_keyboard: [
            [{ text: '💕 Accept Invite', url: deepLink }],
            [{ text: '📱 Open App', url: APP_URL }]
          ]
        };

        await bot.sendMessage(chatId, message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });

        return { 
          success: true, 
          message: `Invite sent to @${cleanUsername}!`,
          type: 'direct',
          deepLink: deepLink
        };
      } catch (error) {
        console.log('Failed to send direct message:', error);
      }
    }
    
    // Return deep link
    return { 
      success: true, 
      message: `Share this link with @${cleanUsername}: ${deepLink}`,
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
  } catch (error) {
    console.error(`Failed to notify user ${telegramId}:`, error);
  }
}

export default {
  bot,
  handleWebhook,
  generateCoupleLink,
  sendInviteByUsername,
  notifyCoupleMembers,
  notifyUser,
};
