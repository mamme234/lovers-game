import { User, Couple, Message, Memory, Game, Task, Album } from './models.js';
import { UserService, CoupleService, MessageService, GameService, TaskService, MemoryService } from './services.js';
import { generateToken, generatePairingCode, calculateMatchPercentage, updateDailyStreak, addXP } from './utils.js';

// ============ AUTH CONTROLLERS ============
export const loginWithTelegram = async (req, res) => {
  try {
    const { initData, userInfo } = req.body;
    
    const { user, token } = await UserService.createOrUpdateUser(userInfo);
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        level: user.level,
        xp: user.xp,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const token = generateToken(user._id);
    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    const couple = await CoupleService.createCouple(req.userId);
    res.json({ success: true, couple });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const invitePartner = async (req, res) => {
  try {
    const { coupleId } = req.params;
    const pairingCode = generatePairingCode();
    
    const couple = await CoupleService.invitePartner(coupleId, pairingCode);
    
    res.json({
      success: true,
      couple,
      pairingCode,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const joinCouple = async (req, res) => {
  try {
    const { pairingCode } = req.body;
    const couple = await CoupleService.joinCouple(req.userId, pairingCode);
    
    res.json({ success: true, couple });
  } catch (error) {
    res.status(400).json({ error: error.message });
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
    
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const completeTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await TaskService.completeTask(taskId, req.userId);
    
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

export default {
  loginWithTelegram,
  refreshToken,
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
