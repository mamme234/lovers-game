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
      enum: ['user', 'user1', 'user2'],
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
    onlineStatus: {
      isOnline: {
        type: Boolean,
        default: false,
      },
      lastSeen: Date,
    },
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
    name: {
      type: String,
      default: 'Our Love Story',
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
    // Pending invite tracking
    pendingInvite: {
      username: String,
      sentAt: Date,
      status: {
        type: String,
        enum: ['pending', 'accepted', 'expired'],
      },
      pairingCode: String,
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
      enum: ['active', 'ongoing', 'completed', 'abandoned'],
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
    players: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
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
    xpReward: {
      type: Number,
      default: 0,
    },
    coinReward: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// ============ PENDING INVITE SCHEMA ============
const pendingInviteSchema = new mongoose.Schema(
  {
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      index: true,
    },
    telegramId: {
      type: String,
      required: true,
      index: true,
    },
    pairingCode: {
      type: String,
      required: true,
    },
    inviterName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'cancelled'],
      default: 'pending',
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: Date,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  },
  { timestamps: true }
);

// ============ NOTIFICATION SCHEMA ============
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['invite', 'message', 'game', 'memory', 'task', 'achievement', 'system'],
      required: true,
    },
    title: String,
    message: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    actionUrl: String,
  },
  { timestamps: true }
);

// ============ INVITE CODE SCHEMA ============
const inviteCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      required: true,
    },
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['active', 'used', 'expired'],
      default: 'active',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    usedAt: Date,
  },
  { timestamps: true }
);

// ============ INDEXES ============
// User indexes
userSchema.index({ coupleId: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'preferences.notifications': 1 });

// Couple indexes
coupleSchema.index({ pairingCode: 1 }, { unique: true, partialFilterExpression: { pairingCode: { $type: 'string' } } });
coupleSchema.index({ user1: 1, user2: 1 });
coupleSchema.index({ isPaired: 1 });

// Message indexes
messageSchema.index({ coupleId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ isRead: 1 });

// Pending invite indexes
pendingInviteSchema.index({ coupleId: 1, username: 1 });
pendingInviteSchema.index({ telegramId: 1 });
pendingInviteSchema.index({ status: 1, expiresAt: 1 });

// Notification indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

// ============ CREATE MODELS ============
export const User = mongoose.model('User', userSchema);
export const Couple = mongoose.model('Couple', coupleSchema);
export const Message = mongoose.model('Message', messageSchema);
export const Memory = mongoose.model('Memory', memorySchema);
export const Album = mongoose.model('Album', albumSchema);
export const Game = mongoose.model('Game', gameSchema);
export const Task = mongoose.model('Task', taskSchema);
export const Achievement = mongoose.model('Achievement', achievementSchema);
export const PendingInvite = mongoose.model('PendingInvite', pendingInviteSchema);
export const Notification = mongoose.model('Notification', notificationSchema);
export const InviteCode = mongoose.model('InviteCode', inviteCodeSchema);

// ============ DEFAULT EXPORT ============
export default {
  User,
  Couple,
  Message,
  Memory,
  Album,
  Game,
  Task,
  Achievement,
  PendingInvite,
  Notification,
  InviteCode,
};
