import { User, Couple, Message, Memory, Game, Task, Album, PendingInvite } from './models.js';
import { UserService, CoupleService, MessageService, GameService, TaskService, MemoryService } from './services.js';
import { generateToken, generatePairingCode, calculateMatchPercentage, updateDailyStreak, addXP } from './utils.js';
import botInvite from './botInvite.js';

const APP_URL = process.env.APP_URL || 'https://lovers-game.vercel.app';

// ============ AUTH CONTROLLERS ============
export const loginWithTelegram = async (req, res) => {
  try {
    const { initData, userInfo } = req.body;

    // Validate request
    if (!userInfo || !userInfo.id) {
      return res.status(400).json({
        success: false,
        error: 'Telegram user data not found.',
      });
    }

    // Production:
    // Verify initData with your BOT_TOKEN here.
    // For now we only check that it exists.
    if (typeof initData !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid Telegram initData.',
      });
    }

    const { user, token } = await UserService.createOrUpdateUser(userInfo);

    // Check if there's a pending invite for this user
    const pendingInvite = await PendingInvite.findOne({
      telegramId: userInfo.id.toString(),
      status: 'pending'
    });

    if (pendingInvite) {
      // Auto-connect user to the couple
      const couple = await Couple.findById(pendingInvite.coupleId);
      if (couple && !couple.user2) {
        couple.user2 = user._id;
        couple.nickname2 = user.firstName;
        couple.isPaired = true;
        couple.pendingInvite = null;
        await couple.save();

        user.coupleId = couple._id;
        user.role = 'user2';
        await user.save();

        // Mark invite as accepted
        pendingInvite.status = 'accepted';
        pendingInvite.acceptedAt = new Date();
        await pendingInvite.save();

        // Award welcome bonus
        user.coins = (user.coins || 0) + 100;
        user.xp = (user.xp || 0) + 50;
        await user.save();

        // Notify both users
        const inviter = await User.findById(couple.user1);
        if (inviter) {
          try {
            await botInvite.notifyUser(inviter.telegramId, `
🎉 <b>${user.firstName} has accepted your invitation!</b>

You and ${user.firstName} are now connected on LoveVerse!

Start your journey together:
💬 Chat: ${APP_URL}/chat
🎮 Play games: ${APP_URL}/games
📸 Share memories: ${APP_URL}/memories

Enjoy! 💕
            `);
          } catch (error) {
            console.error('Failed to notify inviter:', error);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        photoUrl: user.photoUrl,
        isPremium: user.isPremium,
        coupleId: user.coupleId || null,
        level: user.level || 1,
        xp: user.xp || 0,
        coins: user.coins || 0,
      },
    });
  } catch (error) {
    console.error('Telegram Login Error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Authentication failed.',
    });
  }
};

// ============ USER CONTROLLERS ============
export const getUserProfile = async (req, res) => {
  try {
    const user = await UserService.getUserProfile(req.userId);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { nickname, preferences } = req.body;
    const user = await UserService.updateUserProfile(req.userId, {
      nickname,
      preferences,
    });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateMood = async (req, res) => {
  try {
    const { mood } = req.body;
    const user = await UserService.updateMood(req.userId, mood);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserAchievements = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('achievements');
    res.json({ success: true, achievements: user.achievements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserStatistics = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const games = await Game.countDocuments({
      $or: [
        { 'coupleId.user1': req.userId },
        { 'coupleId.user2': req.userId },
      ],
    });
    
    res.json({
      success: true,
      stats: {
        level: user.level,
        xp: user.xp,
        coins: user.coins,
        dailyStreak: user.dailyStreak,
        gamesPlayed: games,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ COUPLE CONTROLLERS ============
export const createCouple = async (req, res) => {
  try {
    const { coupleName, nickname, anniversaryDate } = req.body;
    
    // Check if user already has a couple
    const existingUser = await User.findById(req.userId);
    if (existingUser.coupleId) {
      return res.status(400).json({
        success: false,
        error: 'You already have a couple.',
      });
    }
    
    const couple = await CoupleService.createCouple(
      req.userId,
      coupleName,
      nickname,
      anniversaryDate
    );
    
    // Award welcome bonus
    const user = await User.findById(req.userId);
    user.coins = (user.coins || 0) + 100;
    user.xp = (user.xp || 0) + 50;
    await user.save();
    
    res.json({ 
      success: true, 
      couple,
      bonus: {
        coins: 100,
        xp: 50,
      },
      message: 'Couple created successfully! 🎉'
    });
  } catch (error) {
    console.error('Create couple error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

export const invitePartner = async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username is required'
      });
    }

    // Get couple and user info
    const couple = await Couple.findById(coupleId).populate('user1', 'firstName lastName username');
    if (!couple) {
      return res.status(404).json({
        success: false,
        error: 'Couple not found'
      });
    }

    // Check if couple already has two members
    if (couple.user2) {
      return res.status(400).json({
        success: false,
        error: 'Couple already has two members'
      });
    }

    const inviterName = couple.user1 ? couple.user1.firstName : 'Your partner';
    const pairingCode = generatePairingCode();
    
    // Check if user already has a pending invite
    const existingInvite = await PendingInvite.findOne({
      coupleId: coupleId,
      username: username.replace('@', '').trim(),
      status: 'pending'
    });

    if (existingInvite) {
      return res.status(400).json({
        success: false,
        error: 'User already has a pending invite'
      });
    }
    
    // Send invite via bot (handles both users who have/haven't started the bot)
    const result = await botInvite.sendInviteByUsername(
      username, 
      coupleId, 
      inviterName,
      pairingCode
    );
    
    if (result.success) {
      // Update couple with pending invite
      couple.pendingInvite = {
        username: username.replace('@', '').trim(),
        sentAt: new Date(),
        status: 'pending',
        pairingCode: pairingCode
      };
      await couple.save();
      
      // Generate the deep link for the response
      const deepLink = botInvite.generateInviteLink(coupleId);
      
      return res.status(200).json({
        success: true,
        message: result.message,
        couple,
        pairingCode,
        deepLink: deepLink,
        type: result.type || 'deep_link'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('Invite partner error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const joinCouple = async (req, res) => {
  try {
    const { pairingCode } = req.body;
    
    if (!pairingCode) {
      return res.status(400).json({
        success: false,
        error: 'Pairing code is required'
      });
    }
    
    const couple = await CoupleService.joinCouple(req.userId, pairingCode);
    
    // Award welcome bonus
    const user = await User.findById(req.userId);
    user.coins = (user.coins || 0) + 100;
    user.xp = (user.xp || 0) + 50;
    await user.save();
    
    res.json({ 
      success: true, 
      couple,
      bonus: {
        coins: 100,
        xp: 50,
      }
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
};

export const getCoupleProfile = async (req, res) => {
  try {
    const couple = await CoupleService.getCoupleProfile(req.params.coupleId);
    res.json({ success: true, couple });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCoupleProfile = async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { nickname1, nickname2, anniversaryDate } = req.body;
    
    const couple = await Couple.findByIdAndUpdate(
      coupleId,
      { nickname1, nickname2, anniversaryDate },
      { new: true }
    );
    
    res.json({ success: true, couple });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCoupleStatus = async (req, res) => {
  try {
    const couple = await Couple.findById(req.params.coupleId);
    res.json({
      success: true,
      status: couple.onlineStatus,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getInviteStatus = async (req, res) => {
  try {
    const { coupleId } = req.params;
    
    const couple = await Couple.findById(coupleId);
    if (!couple) {
      return res.status(404).json({
        success: false,
        error: 'Couple not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      pendingInvite: couple.pendingInvite || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const acceptInvite = async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { userId } = req.body;
    
    const couple = await Couple.findById(coupleId);
    if (!couple) {
      return res.status(404).json({
        success: false,
        error: 'Couple not found'
      });
    }
    
    // Check if couple already has two members
    if (couple.user2) {
      return res.status(400).json({
        success: false,
        error: 'Couple already has two members'
      });
    }
    
    // Check if user already has a couple
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (user.coupleId) {
      return res.status(400).json({
        success: false,
        error: 'User already has a couple'
      });
    }
    
    // Add user as second partner
    couple.user2 = userId;
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
    await PendingInvite.updateMany(
      { coupleId: coupleId, telegramId: user.telegramId },
      { status: 'accepted', acceptedAt: new Date() }
    );
    
    // Notify both users
    const inviter = await User.findById(couple.user1);
    if (inviter) {
      try {
        await botInvite.notifyUser(inviter.telegramId, `
🎉 <b>${user.firstName} has accepted your invitation!</b>

You and ${user.firstName} are now connected on LoveVerse!

Start your journey together:
💬 Chat: ${APP_URL}/chat
🎮 Play games: ${APP_URL}/games
📸 Share memories: ${APP_URL}/memories

Enjoy! 💕
        `);
      } catch (error) {
        console.error('Failed to notify inviter:', error);
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Successfully joined couple!',
      couple,
      bonus: {
        coins: 100,
        xp: 50
      }
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============ MESSAGE CONTROLLERS ============
export const sendMessage = async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { content, messageType } = req.body;
    
    const message = await MessageService.sendMessage(
      coupleId,
      req.userId,
      content,
      messageType
    );
    
    // Notify partner via bot if they're offline
    const couple = await Couple.findById(coupleId).populate('user1 user2');
    const partner = couple.user1._id.toString() === req.userId ? couple.user2 : couple.user1;
    
    if (partner && !partner.onlineStatus?.isOnline) {
      try {
        await botInvite.notifyUser(partner.telegramId, `
💬 <b>New message from your partner!</b>

You have a new message on LoveVerse.

Open the app to read it:
${APP_URL}
        `);
      } catch (error) {
        console.error('Failed to notify partner:', error);
      }
    }
    
    res.status(201).json({ success: true, message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    
    const messages = await MessageService.getMessages(coupleId, parseInt(limit), parseInt(skip));
    
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const markMessageAsRead = async (req, res) => {
  try {
    const message = await MessageService.markAsRead(req.params.messageId);
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await MessageService.addReaction(
      req.params.messageId,
      req.userId,
      emoji
    );
    
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ GAME CONTROLLERS ============
export const startGame = async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { gameType } = req.body;
    
    const game = await GameService.createGame(coupleId, gameType);
    
    // Notify partner that a game has started
    const couple = await Couple.findById(coupleId).populate('user1 user2');
    const user = await User.findById(req.userId);
    const partner = couple.user1._id.toString() === req.userId ? couple.user2 : couple.user1;
    
    if (partner) {
      try {
        await botInvite.notifyUser(partner.telegramId, `
🎮 <b>Game Invitation!</b>

${user.firstName} has invited you to play <b>${gameType.replace('_', ' ')}</b>!

Open the app to join the game:
${APP_URL}/games
        `);
      } catch (error) {
        console.error('Failed to notify partner:', error);
      }
    }
    
    res.status(201).json({ success: true, game });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const makeGameMove = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { move } = req.body;
    
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    game.rounds.push({ move, player: req.userId });
    await game.save();
    
    res.json({ success: true, game });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const completeGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { winnerId, matchPercentage } = req.body;
    
    const game = await GameService.completeGame(gameId, winnerId, matchPercentage);
    
    // Award XP
    const couple = await Couple.findById(game.coupleId);
    await CoupleService.addRelationshipXP(couple._id, 50);
    
    // Award XP to winner
    if (winnerId) {
      const winner = await User.findById(winnerId);
      if (winner) {
        const xpResult = addXP(winner.xp, 50);
        winner.xp = xpResult.xp;
        winner.level = xpResult.level;
        await winner.save();
      }
    }
    
    res.json({ success: true, game });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getGameHistory = async (req, res) => {
  try {
    const { coupleId } = req.params;
    const games = await GameService.getGameHistory(coupleId);
    
    res.json({ success: true, games });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getGameDetails = async (req, res) => {
  try {
    const { gameId } = req.params;
    const game = await Game.findById(gameId);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    res.json({ success: true, game });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ TASK/PLANNER CONTROLLERS ============
export const createTask = async (req, res) => {
  try {
    const { coupleId } = req.params;
    const taskData = req.body;
    
    const task = await TaskService.createTask(coupleId, taskData);
    
    res.status(201).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCoupleTasks = async (req, res) => {
  try {
    const { coupleId } = req.params;
    const tasks = await TaskService.getCoupleTasks(coupleId);
    
    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;
    
    const task = await Task.findByIdAndUpdate(taskId, updates, { new: true });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const completeTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await TaskService.completeTask(taskId, req.userId);
    
    // Award XP for completing task
    const couple = await Couple.findById(task.coupleId);
    await CoupleService.addRelationshipXP(couple._id, 20);
    
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    await TaskService.deleteTask(taskId);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ MEMORY/ALBUM CONTROLLERS ============
export const uploadMemory = async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { mediaUrl, caption, date, albumId } = req.body;
    
    const memory = await MemoryService.uploadMemory(coupleId, {
      mediaUrl,
      caption,
      date,
      albumId,
    });
    
    // Notify partner about new memory
    const couple = await Couple.findById(coupleId).populate('user1 user2');
    const user = await User.findById(req.userId);
    const partner = couple.user1._id.toString() === req.userId ? couple.user2 : couple.user1;
    
    if (partner) {
      try {
        await botInvite.notifyUser(partner.telegramId, `
📸 <b>New Memory Shared!</b>

${user.firstName} has shared a new memory on LoveVerse.

Open the app to see it:
${APP_URL}/memories
        `);
      } catch (error) {
        console.error('Failed to notify partner:', error);
      }
    }
    
    res.status(201).json({ success: true, memory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMemories = async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { albumId } = req.query;
    
    const memories = await MemoryService.getMemories(coupleId, albumId);
    
    res.json({ success: true, memories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const toggleFavorite = async (req, res) => {
  try {
    const memory = await MemoryService.toggleFavorite(req.params.memoryId);
    res.json({ success: true, memory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteMemory = async (req, res) => {
  try {
    await Memory.findByIdAndDelete(req.params.memoryId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createAlbum = async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { name, description, coverImage } = req.body;
    
    const album = await Album.create({
      coupleId,
      name,
      description,
      coverImage,
    });
    
    res.status(201).json({ success: true, album });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAlbums = async (req, res) => {
  try {
    const { coupleId } = req.params;
    const albums = await Album.find({ coupleId }).populate('memories');
    
    res.json({ success: true, albums });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ REWARD CONTROLLERS ============
export const getRewards = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({
      success: true,
      coins: user.coins,
      dailyRewardAvailable: true, // TODO: Add logic for daily rewards
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const spinLuckySpin = async (req, res) => {
  try {
    const rewards = [10, 25, 50, 100, 250];
    const randomReward = rewards[Math.floor(Math.random() * rewards.length)];
    
    const user = await User.findById(req.userId);
    user.coins += randomReward;
    await user.save();
    
    res.json({
      success: true,
      rewardAmount: randomReward,
      totalCoins: user.coins,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const claimReward = async (req, res) => {
  try {
    // TODO: Implement reward claiming logic
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserCoins = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({ success: true, coins: user.coins });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const purchaseCoins = async (req, res) => {
  try {
    // TODO: Implement coin purchase with payment gateway
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ PROGRESS CONTROLLERS ============
export const getCoupleProgress = async (req, res) => {
  try {
    const couple = await Couple.findById(req.params.coupleId);
    res.json({
      success: true,
      progress: {
        level: couple.relationshipLevel,
        xp: couple.relationshipXp,
        totalXp: couple.totalXp,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCoupleAchievements = async (req, res) => {
  try {
    // TODO: Implement couple achievements
    res.json({ success: true, achievements: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserLevels = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({
      success: true,
      level: user.level,
      xp: user.xp,
      nextLevelXp: (user.level) * 1000,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ DEFAULT EXPORT ============
export default {
  loginWithTelegram,
  getUserProfile,
  updateUserProfile,
  updateMood,
  getUserAchievements,
  getUserStatistics,
  createCouple,
  invitePartner,
  joinCouple,
  getCoupleProfile,
  updateCoupleProfile,
  getCoupleStatus,
  getInviteStatus,
  acceptInvite,
  sendMessage,
  getMessages,
  markMessageAsRead,
  addReaction,
  startGame,
  makeGameMove,
  completeGame,
  getGameHistory,
  getGameDetails,
  createTask,
  getCoupleTasks,
  updateTask,
  completeTask,
  deleteTask,
  uploadMemory,
  getMemories,
  toggleFavorite,
  deleteMemory,
  createAlbum,
  getAlbums,
  getRewards,
  spinLuckySpin,
  claimReward,
  getUserCoins,
  purchaseCoins,
  getCoupleProgress,
  getCoupleAchievements,
  getUserLevels,
};
