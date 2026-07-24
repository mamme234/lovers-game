import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { User, Couple } from './models.js';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.APP_URL || 'https://lovers-game.vercel.app';

let bot = null;

if (BOT_TOKEN) {
  bot = new TelegramBot(BOT_TOKEN, { polling: true });
  console.log('🤖 Telegram bot started!');
} else {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN not set. Bot features disabled.');
}

if (bot) {
  // Handle /start command
  bot.onText(/\/start(.+)?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const firstName = msg.chat.first_name || 'User';
    
    // Check if there's a referral parameter
    const param = match[1] ? match[1].trim() : '';
    let coupleId = null;
    
    if (param && param.startsWith('ref_')) {
      coupleId = param.substring(4);
    }
    
    // Check if user exists
    let user = await User.findOne({ telegramId: chatId });
    
    if (user && user.coupleId) {
      // Already in a couple
      await bot.sendMessage(chatId, `
💕 <b>Welcome back to LoveVerse!</b>

You're already connected with your partner. Open the app to continue:
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
      // Check if couple exists and is available
      const couple = await Couple.findById(coupleId);
      if (couple && !couple.user2) {
        // Send invite acceptance message
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
  });

  // Handle callback queries
  bot.on('callback_query', async (callbackQuery) => {
    const action = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    
    if (action === 'accept_invite') {
      // Handle accept invite
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
  });

  console.log('🤖 Bot handlers registered');
}

export default bot;
