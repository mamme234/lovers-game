import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from './config.js';

// Generate JWT Token
export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpire,
  });
};

// Generate Pairing Code
export const generatePairingCode = () => {
  return crypto
    .randomBytes(3)
    .toString('hex')
    .toUpperCase()
    .substring(0, 6);
};

// Calculate Relationship Level
export const calculateLevel = (xp) => {
  const levelThreshold = 1000; // XP needed per level
  return Math.floor(xp / levelThreshold) + 1;
};

// Add XP and return updated XP and Level
export const addXP = (currentXP, amount) => {
  const newXP = (currentXP || 0) + amount;
  const newLevel = calculateLevel(newXP);
  return { 
    xp: newXP, 
    level: newLevel,
    xpGained: amount,
    leveledUp: newLevel > calculateLevel(currentXP || 0)
  };
};

// Calculate Match Percentage
export const calculateMatchPercentage = (answers1, answers2) => {
  if (answers1.length === 0 || answers2.length === 0) return 0;
  
  const matches = answers1.filter(
    (answer, index) => answer === answers2[index]
  ).length;
  
  return Math.round((matches / answers1.length) * 100);
};

// Format Date for Display
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Calculate Days Since
export const daysSince = (date) => {
  const now = new Date();
  const then = new Date(date);
  const diffTime = Math.abs(now - then);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Validate Email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Get Random Item from Array
export const getRandomItem = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

// Shuffle Array
export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Generate Random ID
export const generateRandomId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Check if Two Dates are Same Day
export const isSameDay = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Get Streak Status
export const updateDailyStreak = (lastCheckInDate) => {
  const today = new Date();
  const lastCheckIn = new Date(lastCheckInDate);
  
  if (isSameDay(today, lastCheckIn)) {
    return { isNewDay: false };
  }
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (isSameDay(yesterday, lastCheckIn)) {
    return { isNewDay: true, increaseStreak: true };
  }
  
  return { isNewDay: true, increaseStreak: false };
};

// Mood Emoji Mapping
export const getMoodEmoji = (mood) => {
  const moodMap = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    confused: '😕',
    loved: '😍',
    grateful: '🙏',
  };
  return moodMap[mood] || '😊';
};

// Validate Telegram Data
export const validateTelegramData = (initData, token) => {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    // Remove hash from data
    params.delete('hash');
    
    // Create data check string
    const dataCheckString = Array.from(params.entries())
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join('\n');
    
    // Verify hash
    const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const calculatedHash = crypto
      .createHmac('sha256', secret)
      .update(dataCheckString)
      .digest('hex');
    
    return calculatedHash === hash;
  } catch (error) {
    console.error('Error validating Telegram data:', error);
    return false;
  }
};

// Default export
export default {
  generateToken,
  generatePairingCode,
  calculateLevel,
  addXP,
  calculateMatchPercentage,
  formatDate,
  daysSince,
  isValidEmail,
  getRandomItem,
  shuffleArray,
  generateRandomId,
  isSameDay,
  updateDailyStreak,
  getMoodEmoji,
  validateTelegramData,
};
