import { User, Couple, Message, Game, Task, Memory } from './models.js';
import { generateToken, generatePairingCode } from './utils.js';
import mongoose from 'mongoose';

// ============ USER SERVICE ============
export const UserService = {
  createOrUpdateUser: async (userInfo) => {
    try {
      let user = await User.findOne({ telegramId: userInfo.id });

      if (user) {
        // Update existing user
        user.firstName = userInfo.first_name || user.firstName;
        user.lastName = userInfo.last_name || user.lastName;
        user.username = userInfo.username || user.username;
        user.photoUrl = userInfo.photo_url || user.photoUrl;
        user.isPremium = userInfo.is_premium || user.isPremium;
        user.lastActive = new Date();
        await user.save();
      } else {
        // Create new user
        user = new User({
          telegramId: userInfo.id,
          firstName: userInfo.first_name || 'User',
          lastName: userInfo.last_name || '',
          username: userInfo.username || '',
          photoUrl: userInfo.photo_url || '',
          isPremium: userInfo.is_premium || false,
          level: 1,
          xp: 0,
          coins: 0,
          dailyStreak: 0,
          lastActive: new Date(),
        });
        await user.save();
      }

      // Generate JWT token
      const token = generateToken(user._id);

      return { user, token };
    } catch (error) {
      throw new Error(`User service error: ${error.message}`);
    }
  },

  getUserProfile: async (userId) => {
    try {
      const user = await User.findById(userId)
        .select('-__v')
        .populate('coupleId', 'name nickname1 nickname2 relationshipLevel');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
    } catch (error) {
      throw new Error(`Get user profile error: ${error.message}`);
    }
  },

  updateUserProfile: async (userId, updates) => {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
    } catch (error) {
      throw new Error(`Update user profile error: ${error.message}`);
    }
  },

  updateMood: async (userId, mood) => {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { 
          mood: mood,
          lastMoodUpdate: new Date(),
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
    } catch (error) {
      throw new Error(`Update mood error: ${error.message}`);
    }
  },
};

// ============ COUPLE SERVICE ============
export const CoupleService = {
  createCouple: async (userId, coupleName, nickname, anniversaryDate) => {
    try {
      // Check if user already has a couple
      const existingUser = await User.findById(userId);
      if (existingUser.coupleId) {
        throw new Error('User already has a couple.');
      }
      
      // Generate unique pairing code
      const pairingCode = generatePairingCode();
      
      // Create couple
      const couple = new Couple({
        name: coupleName || `${existingUser.firstName}'s Love`,
        user1: userId,
        nickname1: nickname || existingUser.firstName,
        anniversaryDate: anniversaryDate || new Date(),
        pairingCode,
        relationshipLevel: 1,
        relationshipXp: 0,
        totalXp: 0,
        onlineStatus: {
          user1Online: true,
          user2Online: false,
        },
      });
      
      await couple.save();
      
      // Update user with couple ID
      existingUser.coupleId = couple._id;
      existingUser.role = 'user1';
      await existingUser.save();
      
      return couple;
    } catch (error) {
      throw new Error(`Failed to create couple: ${error.message}`);
    }
  },

  invitePartner: async (coupleId, pairingCode) => {
    try {
      const couple = await Couple.findByIdAndUpdate(
        coupleId,
        { pairingCode },
        { new: true }
      );
      
      if (!couple) {
        throw new Error('Couple not found');
      }
      
      return couple;
    } catch (error) {
      throw new Error(`Invite partner error: ${error.message}`);
    }
  },

  joinCouple: async (userId, pairingCode) => {
    try {
      // Find couple by pairing code
      const couple = await Couple.findOne({ pairingCode });
      
      if (!couple) {
        throw new Error('Invalid pairing code.');
      }
      
      // Check if couple is already complete
      if (couple.user2) {
        throw new Error('Couple already has two members.');
      }
      
      // Check if user already has a couple
      const user = await User.findById(userId);
      if (user.coupleId) {
        throw new Error('User already has a couple.');
      }
      
      // Add user as second partner
      couple.user2 = userId;
      couple.nickname2 = user.firstName;
      couple.onlineStatus.user2Online = true;
      await couple.save();
      
      // Update user
      user.coupleId = couple._id;
      user.role = 'user2';
      await user.save();
      
      return couple;
    } catch (error) {
      throw new Error(`Join couple error: ${error.message}`);
    }
  },

  getCoupleProfile: async (coupleId) => {
    try {
      const couple = await Couple.findById(coupleId)
        .populate('user1', 'firstName lastName username photoUrl')
        .populate('user2', 'firstName lastName username photoUrl');
      
      if (!couple) {
        throw new Error('Couple not found');
      }
      
      return couple;
    } catch (error) {
      throw new Error(`Get couple profile error: ${error.message}`);
    }
  },

  addRelationshipXP: async (coupleId, xpAmount) => {
    try {
      const couple = await Couple.findById(coupleId);
      
      if (!couple) {
        throw new Error('Couple not found');
      }
      
      couple.relationshipXp += xpAmount;
      couple.totalXp += xpAmount;
      
      // Level up logic
      const levelThreshold = 1000;
      const newLevel = Math.floor(couple.totalXp / levelThreshold) + 1;
      
      if (newLevel > couple.relationshipLevel) {
        couple.relationshipLevel = newLevel;
        // Could trigger level up event here
      }
      
      await couple.save();
      
      return couple;
    } catch (error) {
      throw new Error(`Add relationship XP error: ${error.message}`);
    }
  },
};

// ============ MESSAGE SERVICE ============
export const MessageService = {
  sendMessage: async (coupleId, senderId, content, messageType = 'text') => {
    try {
      const message = new Message({
        coupleId,
        sender: senderId,
        content,
        messageType,
        timestamp: new Date(),
        read: false,
      });
      
      await message.save();
      
      // Update last activity in couple
      await Couple.findByIdAndUpdate(coupleId, {
        lastActivity: new Date(),
      });
      
      return message.populate('sender', 'firstName lastName username');
    } catch (error) {
      throw new Error(`Send message error: ${error.message}`);
    }
  },

  getMessages: async (coupleId, limit = 50, skip = 0) => {
    try {
      const messages = await Message.find({ coupleId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'firstName lastName username photoUrl');
      
      return messages.reverse();
    } catch (error) {
      throw new Error(`Get messages error: ${error.message}`);
    }
  },

  markAsRead: async (messageId) => {
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { read: true },
        { new: true }
      );
      
      if (!message) {
        throw new Error('Message not found');
      }
      
      return message;
    } catch (error) {
      throw new Error(`Mark as read error: ${error.message}`);
    }
  },

  addReaction: async (messageId, userId, emoji) => {
    try {
      const message = await Message.findById(messageId);
      
      if (!message) {
        throw new Error('Message not found');
      }
      
      // Check if user already reacted with this emoji
      const existingReaction = message.reactions.find(
        r => r.userId.toString() === userId && r.emoji === emoji
      );
      
      if (existingReaction) {
        // Remove reaction (toggle)
        message.reactions = message.reactions.filter(
          r => r.userId.toString() !== userId || r.emoji !== emoji
        );
      } else {
        // Add reaction
        message.reactions.push({ userId, emoji });
      }
      
      await message.save();
      
      return message;
    } catch (error) {
      throw new Error(`Add reaction error: ${error.message}`);
    }
  },
};

// ============ GAME SERVICE ============
export const GameService = {
  createGame: async (coupleId, gameType) => {
    try {
      const game = new Game({
        coupleId,
        gameType,
        status: 'active',
        rounds: [],
        players: [],
        createdAt: new Date(),
      });
      
      await game.save();
      
      return game;
    } catch (error) {
      throw new Error(`Create game error: ${error.message}`);
    }
  },

  completeGame: async (gameId, winnerId, matchPercentage) => {
    try {
      const game = await Game.findByIdAndUpdate(
        gameId,
        {
          status: 'completed',
          winner: winnerId,
          matchPercentage,
          completedAt: new Date(),
        },
        { new: true }
      );
      
      if (!game) {
        throw new Error('Game not found');
      }
      
      return game;
    } catch (error) {
      throw new Error(`Complete game error: ${error.message}`);
    }
  },

  getGameHistory: async (coupleId) => {
    try {
      const games = await Game.find({ coupleId })
        .sort({ createdAt: -1 })
        .limit(20);
      
      return games;
    } catch (error) {
      throw new Error(`Get game history error: ${error.message}`);
    }
  },
};

// ============ TASK SERVICE ============
export const TaskService = {
  createTask: async (coupleId, taskData) => {
    try {
      const task = new Task({
        ...taskData,
        coupleId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      await task.save();
      
      return task;
    } catch (error) {
      throw new Error(`Create task error: ${error.message}`);
    }
  },

  getCoupleTasks: async (coupleId) => {
    try {
      const tasks = await Task.find({ coupleId })
        .sort({ dueDate: 1, createdAt: -1 });
      
      return tasks;
    } catch (error) {
      throw new Error(`Get couple tasks error: ${error.message}`);
    }
  },

  completeTask: async (taskId, userId) => {
    try {
      const task = await Task.findByIdAndUpdate(
        taskId,
        {
          status: 'completed',
          completedAt: new Date(),
          completedBy: userId,
        },
        { new: true }
      );
      
      if (!task) {
        throw new Error('Task not found');
      }
      
      return task;
    } catch (error) {
      throw new Error(`Complete task error: ${error.message}`);
    }
  },

  deleteTask: async (taskId) => {
    try {
      const task = await Task.findByIdAndDelete(taskId);
      
      if (!task) {
        throw new Error('Task not found');
      }
      
      return task;
    } catch (error) {
      throw new Error(`Delete task error: ${error.message}`);
    }
  },
};

// ============ MEMORY SERVICE ============
export const MemoryService = {
  uploadMemory: async (coupleId, memoryData) => {
    try {
      const memory = new Memory({
        ...memoryData,
        coupleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      await memory.save();
      
      return memory;
    } catch (error) {
      throw new Error(`Upload memory error: ${error.message}`);
    }
  },

  getMemories: async (coupleId, albumId = null) => {
    try {
      const query = { coupleId };
      
      if (albumId) {
        query.albumId = albumId;
      }
      
      const memories = await Memory.find(query)
        .sort({ date: -1, createdAt: -1 });
      
      return memories;
    } catch (error) {
      throw new Error(`Get memories error: ${error.message}`);
    }
  },

  toggleFavorite: async (memoryId) => {
    try {
      const memory = await Memory.findById(memoryId);
      
      if (!memory) {
        throw new Error('Memory not found');
      }
      
      memory.isFavorite = !memory.isFavorite;
      await memory.save();
      
      return memory;
    } catch (error) {
      throw new Error(`Toggle favorite error: ${error.message}`);
    }
  },
};

export default {
  UserService,
  CoupleService,
  MessageService,
  GameService,
  TaskService,
  MemoryService,
};
