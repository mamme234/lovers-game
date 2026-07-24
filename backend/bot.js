import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { User, Couple, PendingInvite, Notification } from './models.js';
import mongoose from 'mongoose';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.APP_URL || 'https://lovers-game.vercel.app';
const API_URL = process.env.API_URL || 'https://lovers-game.onrender.com/api';

let bot = null;

if (BOT_TOKEN) {
  bot = new TelegramBot(BOT_TOKEN, { 
    polling: true,
    // For production, use webhook instead:
    // webHook: { port: process.env.PORT || 8443 }
  });
  console.log('🤖 Telegram bot started!');
} else {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN not set. Bot features disabled.');
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
    
    // Check if there's a referral parameter
    const param = match[1] ? match[1].trim() : '';
    let coupleId = null;
    let pairingCode = null;
    
    // Parse parameters: /start ref_COUPLEID or /start code_PAIRINGCODE
    if (param) {
      if (param.startsWith('ref_')) {
        coupleId = param.substring(4);
      } else if (param.startsWith('code_')) {
        pairingCode = param.substring(5);
      }
    }
    
    try {
      // Check if user exists in our database
      let user = await User.findOne({ telegramId: chatId.toString() });
      
      // If user doesn't exist, create a temporary user record
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
        console.log(`📝 New user created: ${firstName} (${chatId})`);
      }
      
      // Check if user already has a couple
      if (user.coupleId) {
        const couple = await Couple.findById(user.coupleId);
        await bot.sendMessage(chatId, `
💕 <b>Welcome back to LoveVerse!</b>

You're already connected with ${couple?.nickname2 || 'your partner'}.
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
      
      // Check if user was invited
      if (coupleId) {
        const couple = await Couple.findById(coupleId);
        if (couple && !couple.user2) {
          // Send invite acceptance message
          await bot.sendMessage(chatId, `
💕 <b>You've been invited to join a couple!</b>

${couple.nickname1 || 'Someone'} has invited you to become their partner on LoveVerse.

<b>About LoveVerse:</b>
• 🎮 Fun games for couples
• 💬 Private chat
• 📸 Share memories
• 📅 Plan dates together

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
          
          // Store pending invite
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

${pendingInvite.inviterName} is waiting for you to join them on LoveVerse.

Don't keep them waiting! Accept the invitation now:
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
            [{ text: '💕 Get Started', url: APP_URL }],
            [{ text: '📱 Open App', url: APP_URL }]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in /start handler:', error);
      await bot.sendMessage(chatId, `
❌ <b>Something went wrong</b>

Please try again later or open the app directly:
${APP_URL}
      `, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 Open App', url: APP_URL }]
          ]
        }
      });
    }
  });

  // ============ /help COMMAND ============
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    
    await bot.sendMessage(chatId, `
💕 <b>LoveVerse Help Center</b>

<b>How to use LoveVerse:</b>

1️⃣ <b>Create a couple</b>
   Open the app and click "Create Couple"

2️⃣ <b>Invite your partner</b>
   Use the "Connect with Partner" button
   Share the link with your partner

3️⃣ <b>Play games</b>
   Go to the Games section
   Choose from 10+ fun games

4️⃣ <b>Chat</b>
   Send messages, photos, and reactions

5️⃣ <b>Share memories</b>
   Upload photos and create albums

<b>Need more help?</b>
Contact our support: @LoveVerseSupport

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
    const username = match[1].trim();
    
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
      if (!couple) {
        await bot.sendMessage(chatId, '❌ Couple not found.');
        return;
      }
      
      // Send invite via API
      const response = await fetch(`${API_URL}/couple/${couple._id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: username,
          coupleId: couple._id
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await bot.sendMessage(chatId, `
✅ <b>Invite sent successfully!</b>

Your invitation has been sent to @${username}.
They will receive it in their Telegram.

💕 LoveVerse
        `, {
          parse_mode: 'HTML'
        });
      } else {
        await bot.sendMessage(chatId, `
❌ <b>Failed to send invite</b>

${data.error || 'Please try again later.'}
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
📅 <b>Anniversary:</b> ${couple.anniversaryDate ? new Date(couple.anniversaryDate).toLocaleDateString() : 'Not set'}
          `;
        }
      } else {
        message += `
💕 <b>Status:</b> Not paired yet
Create a couple to start your journey!
        `;
      }
      
      message += `
      
${APP_URL}
      `;
      
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
      
      let message = `
🏆 <b>LoveVerse Leaderboard</b>

`;
      
      if (topUsers.length === 0) {
        message += 'No users yet. Be the first! 🎉';
      } else {
        topUsers.forEach((user, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          message += `
${medal} <b>${user.firstName}</b>
   Level ${user.level} | ${user.xp} XP | ${user.coins} coins
`;
        });
      }
      
      message += `
      
${APP_URL}
      `;
      
      await bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 Open App', url: APP_URL }]
          ]
        }
      });
    } catch (error) {
      console.error('Leaderboard command error:', error);
      await bot.sendMessage(chatId, '❌ Failed to get leaderboard.');
    }
  });

  // ============ CALLBACK QUERY HANDLERS ============
  bot.on('callback_query', async (callbackQuery) => {
    const action = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    
    try {
      if (action === 'accept_invite') {
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: 'Opening app...',
          show_alert: false
        });
        
        await bot.sendMessage(chatId, `
💕 <b>Opening LoveVerse...</b>

Click the button below to complete your registration:
        `, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Open App', url: APP_URL }]
            ]
          }
        });
      }
      
      // Handle other callback actions
      if (action.startsWith('game_')) {
        const gameType = action.replace('game_', '');
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: 'Opening game...',
          show_alert: false
        });
        
        await bot.sendMessage(chatId, `
🎮 <b>Game: ${gameType}</b>

Open the app to play:
${APP_URL}/games
        `, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎮 Play Now', url: `${APP_URL}/games` }]
            ]
          }
        });
      }
    } catch (error) {
      console.error('Callback query error:', error);
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: 'Something went wrong. Please try again.',
        show_alert: true
      });
    }
  });

  // ============ ERROR HANDLING ============
  bot.on('error', (error) => {
    console.error('Bot error:', error);
  });

  bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
  });

  console.log('🤖 Bot commands registered');
}

// ============================================
// EXPORT BOT FUNCTIONS
// ============================================

/**
 * Send an invite to a user by their username
 */
export async function sendInviteByUsername(username, coupleId, inviterName, pairingCode) {
  try {
    if (!bot) {
      return { 
        success: false, 
        message: 'Bot not configured. Please set TELEGRAM_BOT_TOKEN.' 
      };
    }

    const cleanUsername = username.replace('@', '').trim();
    
    // Try to get chat info from Telegram
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

    // Check if user exists in our DB
    let user = await User.findOne({ telegramId: chatId.toString() });
    
    // Create pending invite
    const pendingInvite = new PendingInvite({
      coupleId: coupleId,
      username: cleanUsername,
      telegramId: chatId.toString(),
      pairingCode: pairingCode || 'N/A',
      inviterName: inviterName || 'Someone',
      status: 'pending',
    });
    await pendingInvite.save();

    // Send invitation message
    const message = `
💕 <b>You've been invited to join LoveVerse!</b>

<b>${inviterName}</b> has invited you to become their partner on LoveVerse - a premium couples app for Telegram.

<b>✨ What is LoveVerse?</b>
• 🎮 10+ fun games for couples
• 💬 Private and secure chat
• 📸 Share memories and photos
• 📅 Plan dates and activities
• 🏆 Earn achievements together

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
export async function notifyCoupleMembers(coupleId, message, type = 'general') {
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

/**
 * Send a welcome message to new user
 */
export async function sendWelcomeMessage(telegramId, firstName) {
  try {
    if (!bot) return;

    const message = `
💕 <b>Welcome to LoveVerse!</b>

Hi ${firstName}! 🎉

You've joined the best couples app on Telegram. Here's what you can do:

<b>Features:</b>
• 🎮 Play fun games with your partner
• 💬 Chat privately and securely
• 📸 Share beautiful memories
• 📅 Plan dates and activities
• 🏆 Earn achievements together

<b>Get started:</b>
1. Create or join a couple
2. Complete your profile
3. Start playing games!
4. Share your first memory

${APP_URL}

Have questions? Use the /help command.

Enjoy your journey! 💕
    `;

    await bot.sendMessage(telegramId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Open App', url: APP_URL }]
        ]
      }
    });
  } catch (error) {
    console.error('Send welcome message error:', error);
  }
}

/**
 * Send a daily challenge notification
 */
export async function sendDailyChallenge(coupleId, challenge) {
  try {
    if (!bot) return;

    const couple = await Couple.findById(coupleId).populate('user1 user2');
    if (!couple) return;

    const users = [couple.user1, couple.user2].filter(Boolean);
    const message = `
🎯 <b>Today's Challenge</b>

${challenge}

Complete this challenge together to earn bonus XP and coins! 🎉

💕 LoveVerse
    `;

    for (const user of users) {
      try {
        await bot.sendMessage(user.telegramId, message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎯 Accept Challenge', url: `${APP_URL}/dashboard` }]
            ]
          }
        });
      } catch (error) {
        console.error(`Failed to send challenge to ${user.telegramId}:`, error);
      }
    }
  } catch (error) {
    console.error('Send daily challenge error:', error);
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

/**
 * Send a reminder to connect
 */
export async function sendConnectReminder(userId, daysSince) {
  try {
    if (!bot) return;

    const user = await User.findById(userId);
    if (!user) return;

    const message = `
⏰ <b>Connect Reminder</b>

It's been ${daysSince} days since you last connected with your partner on LoveVerse.

Don't forget to:
• 💬 Check in with your partner
• 🎮 Play a game together
• 📸 Share a memory
• ❤️ Send a sweet message

Stay connected! 💕

${APP_URL}
    `;

    await bot.sendMessage(user.telegramId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💕 Open App', url: APP_URL }]
        ]
      }
    });
  } catch (error) {
    console.error('Send connect reminder error:', error);
  }
}

/**
 * Broadcast message to all users
 */
export async function broadcastMessage(message, users = null) {
  try {
    if (!bot) return;

    let targetUsers = users;
    if (!targetUsers) {
      targetUsers = await User.find({}).select('telegramId');
    }

    let sent = 0;
    let failed = 0;

    for (const user of targetUsers) {
      try {
        await bot.sendMessage(user.telegramId, message, {
          parse_mode: 'HTML'
        });
        sent++;
        // Rate limiting - wait 100ms between messages
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error(`Failed to send to ${user.telegramId}:`, error);
      }
    }

    console.log(`📢 Broadcast complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  } catch (error) {
    console.error('Broadcast error:', error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Create and send an invite code
 */
export async function createInviteCode(coupleId, userId) {
  try {
    const crypto = await import('crypto');
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    const inviteCode = new InviteCode({
      code: code,
      coupleId: coupleId,
      createdBy: userId,
      status: 'active',
    });
    await inviteCode.save();
    
    return inviteCode;
  } catch (error) {
    console.error('Create invite code error:', error);
    return null;
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  bot,
  sendInviteByUsername,
  notifyCoupleMembers,
  notifyUser,
  sendWelcomeMessage,
  sendDailyChallenge,
  sendGameInvite,
  sendConnectReminder,
  broadcastMessage,
  createInviteCode,
};
