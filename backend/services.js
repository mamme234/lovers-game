import { User, Couple, Message, Memory, Game, Task } from './models.js';
import { generateToken, calculateLevel, daysSince } from './utils.js';
import bcrypt from 'bcryptjs';

// User Service
export class UserService {
  static async createOrUpdateUser(telegramData) {
    try {
      const { id, first_name, last_name, username, photo_url, is_premium } =
        telegramData;

      let user = await User.findOne({ telegramId: id });

      if (!user) {
        user = await User.create({
          telegramId: id,
          firstName: first_name,
          lastName: last_name,
          username,
          photoUrl: photo_url,
          isPremium: is_premium,
        });
      } else {
        user.isPremium = is_premium;
        user.photoUrl = photo_url;
        await user.save();
      }

      const token = generateToken(user._id);
      return { user, token };
    } catch (error) {
      throw new Error(`User creation failed: ${error.message}`);
    }
  }

  static async getUserProfile(userId) {
    try {
      const user = await User.findById(userId).populate('coupleId');
      if (!user) throw new Error('User not found');
      return user;
    } catch (error) {
      throw error;
    }
  }

  static async updateUserProfile(userId, updates) {
    try {
      const user = await User.findByIdAndUpdate(userId, updates, {
        new: true,
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  static async addXP(userId, xpAmount) {
    try {
      const user = await User.findById(userId);
      user.xp += xpAmount;
      user.level = calculateLevel(user.xp);
      await user.save();
      return user;
    } catch (error) {
      throw error;
    }
  }

  static async updateMood(userId, mood) {
    try {
      const user = await User.findById(userId);
      user.mood = mood;
      user.moodHistory.push({
        mood,
        timestamp: new Date(),
      });
      await user.save();
      return user;
    } catch (error) {
      throw error;
    }
  }
}

// Couple Service
export class CoupleService {
  static async createCouple(userId) {
    try {
      const couple = await Couple.create({
        user1: userId,
      });
      
      await User.findByIdAndUpdate(userId, {
        coupleId: couple._id,
      });

      return couple;
    } catch (error) {
      throw error;
    }
  }

  static async invitePartner(coupleId, pairingCode) {
    try {
      const couple = await Couple.findByIdAndUpdate(
        coupleId,
        { pairingCode },
        { new: true }
      );
      return couple;
    } catch (error) {
      throw error;
    }
  }

  static async joinCouple(userId, pairingCode) {
    try {
      const couple = await Couple.findOne({
        pairingCode,
        user2: null,
      });

      if (!couple) {
        throw new Error('Invalid pairing code');
      }

      couple.user2 = userId;
      couple.isPaired = true;
      couple.pairingCode = null;
      await couple.save();

      await User.findByIdAndUpdate(userId, {
        coupleId: couple._id,
      });

      return couple;
    } catch (error) {
      throw error;
    }
  }

  static async getCoupleProfile(coupleId) {
    try {
      const couple = await Couple.findById(coupleId)
        .populate('user1')
        .populate('user2');
      return couple;
    } catch (error) {
      throw error;
    }
  }

  static async updateOnlineStatus(coupleId, userId, isOnline) {
    try {
      const couple = await Couple.findById(coupleId);
      
      if (couple.user1.toString() === userId.toString()) {
        couple.onlineStatus.user1Online = isOnline;
        couple.onlineStatus.lastOnline.user1 = new Date();
      } else {
        couple.onlineStatus.user2Online = isOnline;
        couple.onlineStatus.lastOnline.user2 = new Date();
      }

      await couple.save();
      return couple;
    } catch (error) {
      throw error;
    }
  }

  static async addRelationshipXP(coupleId, xpAmount) {
    try {
      const couple = await Couple.findById(coupleId);
      couple.relationshipXp += xpAmount;
      couple.totalXp += xpAmount;
      couple.relationshipLevel = calculateLevel(couple.relationshipXp);
      await couple.save();
      return couple;
    } catch (error) {
      throw error;
    }
  }
}

// Message Service
export class MessageService {
  static async sendMessage(coupleId, senderId, content, messageType = 'text') {
    try {
      const message = await Message.create({
        coupleId,
        senderId,
        content,
        messageType,
      });
      return message.populate('senderId');
    } catch (error) {
      throw error;
    }
  }

  static async getMessages(coupleId, limit = 50, skip = 0) {
    try {
      const messages = await Message.find({ coupleId })
        .populate('senderId')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
      return messages.reverse();
    } catch (error) {
      throw error;
    }
  }

  static async markAsRead(messageId) {
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        {
          isRead: true,
          readAt: new Date(),
        },
        { new: true }
      );
      return message;
    } catch (error) {
      throw error;
    }
  }

  static async addReaction(messageId, userId, emoji) {
    try {
      const message = await Message.findById(messageId);
      
      // Remove existing reaction from user if any
      message.reactions = message.reactions.filter(
        (r) => r.userId.toString() !== userId.toString()
      );
      
      // Add new reaction
      message.reactions.push({ emoji, userId });
      await message.save();
      
      return message;
    } catch (error) {
      throw error;
    }
  }
}

// Game Service
export class GameService {
  static async createGame(coupleId, gameType) {
    try {
      const game = await Game.create({
        coupleId,
        gameType,
      });
      return game;
    } catch (error) {
      throw error;
    }
  }

  static async updateGameScore(gameId, user1Score, user2Score) {
    try {
      const game = await Game.findById(gameId);
      game.score1 = user1Score;
      game.score2 = user2Score;
      await game.save();
      return game;
    } catch (error) {
      throw error;
    }
  }

  static async completeGame(gameId, winnerId, matchPercentage = null) {
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
      return game;
    } catch (error) {
      throw error;
    }
  }

  static async getGameHistory(coupleId, limit = 10) {
    try {
      const games = await Game.find({ coupleId })
        .sort({ completedAt: -1 })
        .limit(limit);
      return games;
    } catch (error) {
      throw error;
    }
  }
}

// Task Service
export class TaskService {
  static async createTask(coupleId, taskData) {
    try {
      const task = await Task.create({
        coupleId,
        ...taskData,
      });
      return task;
    } catch (error) {
      throw error;
    }
  }

  static async getCoupleTasks(coupleId) {
    try {
      const tasks = await Task.find({ coupleId })
        .sort({ dueDate: 1 })
        .populate('assignedTo');
      return tasks;
    } catch (error) {
      throw error;
    }
  }

  static async completeTask(taskId, userId) {
    try {
      const task = await Task.findByIdAndUpdate(
        taskId,
        {
          isCompleted: true,
          completedBy: userId,
          completedAt: new Date(),
        },
        { new: true }
      );
      return task;
    } catch (error) {
      throw error;
    }
  }

  static async deleteTask(taskId) {
    try {
      await Task.findByIdAndDelete(taskId);
      return { success: true };
    } catch (error) {
      throw error;
    }
  }
}

// Memory Service
export class MemoryService {
  static async uploadMemory(coupleId, memoryData) {
    try {
      const memory = await Memory.create({
        coupleId,
        ...memoryData,
      });
      return memory;
    } catch (error) {
      throw error;
    }
  }

  static async getMemories(coupleId, albumId = null) {
    try {
      let query = { coupleId };
      if (albumId) query.albumId = albumId;
      
      const memories = await Memory.find(query).sort({ date: -1 });
      return memories;
    } catch (error) {
      throw error;
    }
  }

  static async toggleFavorite(memoryId) {
    try {
      const memory = await Memory.findById(memoryId);
      memory.isFavorite = !memory.isFavorite;
      await memory.save();
      return memory;
    } catch (error) {
      throw error;
    }
  }
}

export default {
  UserService,
  CoupleService,
  MessageService,
  GameService,
  TaskService,
  MemoryService,
};
