import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// User Schema
const userSchema = new mongoose.Schema(
  {
    telegramId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    username: String,
    firstName: String,
    lastName: String,
    photoUrl: String,
    isPremium: {
      type: Boolean,
      default: false,
    },
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Couple',
    },
    role: {
      type: String,
      enum: ['user'],
      default: 'user',
    },
    level: {
      type: Number,
      default: 1,
    },
    xp: {
      type: Number,
      default: 0,
    },
    coins: {
      type: Number,
      default: 0,
    },
    dailyStreak: {
      type: Number,
      default: 0,
    },
    lastCheckIn: Date,
    mood: {
      type: String,
      enum: ['happy', 'sad', 'angry', 'confused', 'loved', 'grateful'],
    },
    moodHistory: [
      {
        mood: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    preferences: {
      darkMode: {
        type: Boolean,
        default: true,
      },
      notifications: {
        type: Boolean,
        default: true,
      },
      soundEnabled: {
        type: Boolean,
        default: true,
      },
    },
    achievements: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Achievement',
      },
    ],
    deviceTokens: [String],
  },
  { timestamps: true }
);

// Couple Schema
const coupleSchema = new mongoose.Schema(
  {
    user1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    user2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    pairingCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    nickname1: String,
    nickname2: String,
    anniversaryDate: Date,
    relationshipLevel: {
      type: Number,
      default: 1,
    },
    relationshipXp: {
      type: Number,
      default: 0,
    },
    totalXp: {
      type: Number,
      default: 0,
    },
    isMeeting: {
      type: Boolean,
      default: false,
    },
    onlineStatus: {
      user1Online: {
        type: Boolean,
        default: false,
      },
      user2Online: {
        type: Boolean,
        default: false,
      },
      lastOnline: {
        user1: Date,
        user2: Date,
      },
    },
    sharedPlaylist: [String],
    sharedTasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
    sharedAlbums: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Album',
      },
    ],
    isPaired: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Message Schema
const messageSchema = new mongoose.Schema(
  {
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: String,
    messageType: {
      type: String,
      enum: ['text', 'image', 'voice', 'gif'],
      default: 'text',
    },
    imageUrl: String,
    voiceUrl: String,
    gifUrl: String,
    reactions: [
      {
        emoji: String,
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
  },
  { timestamps: true }
);

// Memory Schema
const memorySchema = new mongoose.Schema(
  {
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
      index: true,
    },
    albumId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Album',
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    caption: String,
    date: Date,
    isFavorite: {
      type: Boolean,
      default: false,
    },
    tags: [String],
  },
  { timestamps: true }
);

// Album Schema
const albumSchema = new mongoose.Schema(
  {
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    coverImage: String,
    memories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Memory',
      },
    ],
    isPrivate: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Game Schema
const gameSchema = new mongoose.Schema(
  {
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
      index: true,
    },
    gameType: {
      type: String,
      enum: [
        'compatibility_quiz',
        'truth_or_dare',
        'would_you_rather',
        'guess_my_answer',
        'emoji_challenge',
        'memory_match',
        'couple_puzzle',
        'draw_together',
        'fast_reaction',
        'story_builder',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['ongoing', 'completed', 'abandoned'],
      default: 'ongoing',
    },
    score1: {
      type: Number,
      default: 0,
    },
    score2: {
      type: Number,
      default: 0,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    matchPercentage: Number,
    rounds: [],
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
  },
  { timestamps: true }
);

// Task/Planner Schema
const taskSchema = new mongoose.Schema(
  {
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    dueDate: Date,
    category: {
      type: String,
      enum: ['date', 'anniversary', 'birthday', 'shopping', 'other'],
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    completedAt: Date,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Achievement Schema
const achievementSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: String,
    icon: String,
    badgeType: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze',
    },
    requirement: String,
  },
  { timestamps: true }
);

// Create Models
export const User = mongoose.model('User', userSchema);
export const Couple = mongoose.model('Couple', coupleSchema);
export const Message = mongoose.model('Message', messageSchema);
export const Memory = mongoose.model('Memory', memorySchema);
export const Album = mongoose.model('Album', albumSchema);
export const Game = mongoose.model('Game', gameSchema);
export const Task = mongoose.model('Task', taskSchema);
export const Achievement = mongoose.model('Achievement', achievementSchema);

export default {
  User,
  Couple,
  Message,
  Memory,
  Album,
  Game,
  Task,
  Achievement,
};
