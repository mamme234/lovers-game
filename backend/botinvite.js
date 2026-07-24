import TelegramBot from 'node-telegram-bot-api';
import { User, Couple } from './models.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.APP_URL || 'https://lovers-game.vercel.app';

let bot = null;

if (BOT_TOKEN) {
  bot = new TelegramBot(BOT_TOKEN, { polling: false });
} else {
  console.warn('TELEGRAM_BOT_TOKEN not set. Bot features disabled.');
}

/**
 * Send an invite to a user by their username
 * @param {string} username - Telegram username (without @)
 * @param {string} coupleId - The couple ID
 * @param {string} inviterName - Name of the person inviting
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sendInviteByUsername(username, coupleId, inviterName) {
  try {
    if (!bot) {
      return { 
        success: false, 
        message: 'Bot not configured. Please set TELEGRAM_BOT_TOKEN.' 
      };
    }

    // Clean username
    const cleanUsername = username.replace('@', '').trim();
    
    // Try to find user by username first
    let user = await User.findOne({ username: cleanUsername });
    
    if (!user) {
      // If user not found, try to get chat ID from username via bot
      try {
        const chatInfo = await bot.getChat(`@${cleanUsername}`);
        const chatId = chatInfo.id;
        
        // User exists on Telegram but not in our DB
        // Create a pending invitation record
        const inviteLink = `${APP_URL}/?ref=${coupleId}&username=${cleanUsername}`;
        
        // Send message directly
        const message = `
💕 <b>You've been invited to join LoveVerse!</b>

${inviterName} has invited you to become their partner on LoveVerse - a premium couples app for Telegram.

<b>What is LoveVerse?</b>
• 🎮 Fun games for couples
• 💬 Private chat
• 📸 Share memories
• 📅 Planner for dates

<b>Click the button below to join:</b>
        `;
        
        const keyboard = {
          inline_keyboard: [
            [{ 
              text: '💕 Join LoveVerse', 
              url: inviteLink 
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

        // Create pending invite in database
        await createPendingInvite(coupleId, cleanUsername, chatId);

        return { 
          success: true, 
          message: `Invite sent to @${cleanUsername}!` 
        };
      } catch (error) {
        console.error('Error finding user:', error);
        return { 
          success: false, 
          message: `User @${cleanUsername} not found on Telegram.` 
        };
      }
    }

    // User exists in our DB
    if (user.coupleId) {
      return { 
        success: false, 
        message: 'User is already in a couple.' 
      };
    }

    // Generate invite link
    const inviteLink = `${APP_URL}/?ref=${coupleId}`;
    
    // Send message to user
    const message = `
💕 <b>You've been invited to join LoveVerse!</b>

${inviterName} has invited you to become their partner on LoveVerse - a premium couples app for Telegram.

<b>What is LoveVerse?</b>
• 🎮 Fun games for couples
• 💬 Private chat
• 📸 Share memories
• 📅 Planner for dates

<b>Click the button below to join:</b>
    `;
    
    const keyboard = {
      inline_keyboard: [
        [{ 
          text: '💕 Accept Invite', 
          url: inviteLink 
        }],
        [{ 
          text: '📱 Open App', 
          url: APP_URL 
        }]
      ]
    };

    await bot.sendMessage(user.telegramId, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });

    // Create pending invite
    await createPendingInvite(coupleId, cleanUsername, user.telegramId);

    return { 
      success: true, 
      message: `Invite sent to @${cleanUsername}!` 
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
 * Create a pending invitation record
 */
async function createPendingInvite(coupleId, username, telegramId) {
  try {
    const invite = new PendingInvite({
      coupleId,
      username,
      telegramId,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    await invite.save();
    return invite;
  } catch (error) {
    console.error('Create pending invite error:', error);
    return null;
  }
}

/**
 * Send a notification to all couple members
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

Have questions? Visit our support channel or use the help section in the app.

Enjoy your journey! 💕
    `;

    await bot.sendMessage(telegramId, message, {
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Send welcome message error:', error);
  }
}

/**
 * Send daily challenge notification
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
          parse_mode: 'HTML'
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
 * Send game invitation
 */
export async function sendGameInvite(coupleId, gameType, inviterName) {
  try {
    if (!bot) return;

    const couple = await Couple.findById(coupleId).populate('user1 user2');
    if (!couple) return;

    const partner = couple.user2 || couple.user1;
    const user1 = couple.user1;
    
    if (!partner) return;

    const message = `
🎮 <b>Game Invitation!</b>

${inviterName} has invited you to play <b>${gameType}</b>!

Open the app to join the game:
${APP_URL}

💕 LoveVerse
    `;

    await bot.sendMessage(partner.telegramId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Join Game', url: `${APP_URL}/?game=${gameType}` }]
        ]
      }
    });
  } catch (error) {
    console.error('Send game invite error:', error);
  }
}

/**
 * Send reminder to connect
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
• Check in with your partner
• Play a game together
• Share a memory

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

export default {
  sendInviteByUsername,
  notifyCoupleMembers,
  sendWelcomeMessage,
  sendDailyChallenge,
  sendGameInvite,
  sendConnectReminder
};
