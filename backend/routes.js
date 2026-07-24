import express from 'express';
import { authenticateToken, validateCoupleMembership } from './middleware.js';
import * as controllers from './controllers.js';

const router = express.Router();

// ============ AUTH ROUTES ============
router.post('/auth/login', controllers.loginWithTelegram);
// router.post('/auth/refresh-token', controllers.refreshToken); // Uncomment when implemented

// ============ USER ROUTES ============
router.get('/user/profile', authenticateToken, controllers.getUserProfile);
router.put('/user/profile', authenticateToken, controllers.updateUserProfile);
router.patch('/user/mood', authenticateToken, controllers.updateMood);
router.get('/user/achievements', authenticateToken, controllers.getUserAchievements);
router.get('/user/statistics', authenticateToken, controllers.getUserStatistics);

// ============ COUPLE ROUTES ============
router.post('/couple/create', authenticateToken, controllers.createCouple);
router.post('/couple/invite', authenticateToken, controllers.invitePartner);
router.post('/couple/join', authenticateToken, controllers.joinCouple);
router.get('/couple/:coupleId/profile', authenticateToken, validateCoupleMembership, controllers.getCoupleProfile);
router.put('/couple/:coupleId/profile', authenticateToken, validateCoupleMembership, controllers.updateCoupleProfile);
router.get('/couple/:coupleId/status', authenticateToken, validateCoupleMembership, controllers.getCoupleStatus);

// ============ MESSAGE ROUTES ============
router.post('/couple/:coupleId/messages', authenticateToken, validateCoupleMembership, controllers.sendMessage);
router.get('/couple/:coupleId/messages', authenticateToken, validateCoupleMembership, controllers.getMessages);
router.patch('/messages/:messageId/read', authenticateToken, controllers.markMessageAsRead);
router.post('/messages/:messageId/react', authenticateToken, controllers.addReaction);

// ============ GAME ROUTES ============
router.post('/couple/:coupleId/games/start', authenticateToken, validateCoupleMembership, controllers.startGame);
router.post('/couple/:coupleId/games/:gameId/move', authenticateToken, validateCoupleMembership, controllers.makeGameMove);
router.post('/couple/:coupleId/games/:gameId/complete', authenticateToken, validateCoupleMembership, controllers.completeGame);
router.get('/couple/:coupleId/games/history', authenticateToken, validateCoupleMembership, controllers.getGameHistory);
router.get('/couple/:coupleId/games/:gameId', authenticateToken, validateCoupleMembership, controllers.getGameDetails);

// ============ PLANNER/TASK ROUTES ============
router.post('/couple/:coupleId/tasks', authenticateToken, validateCoupleMembership, controllers.createTask);
router.get('/couple/:coupleId/tasks', authenticateToken, validateCoupleMembership, controllers.getCoupleTasks);
router.put('/couple/:coupleId/tasks/:taskId', authenticateToken, validateCoupleMembership, controllers.updateTask);
router.patch('/couple/:coupleId/tasks/:taskId/complete', authenticateToken, validateCoupleMembership, controllers.completeTask);
router.delete('/couple/:coupleId/tasks/:taskId', authenticateToken, validateCoupleMembership, controllers.deleteTask);

// ============ MEMORY/ALBUM ROUTES ============
router.post('/couple/:coupleId/memories', authenticateToken, validateCoupleMembership, controllers.uploadMemory);
router.get('/couple/:coupleId/memories', authenticateToken, validateCoupleMembership, controllers.getMemories);
router.patch('/memories/:memoryId/favorite', authenticateToken, controllers.toggleFavorite);
router.delete('/memories/:memoryId', authenticateToken, controllers.deleteMemory);
router.post('/couple/:coupleId/albums', authenticateToken, validateCoupleMembership, controllers.createAlbum);
router.get('/couple/:coupleId/albums', authenticateToken, validateCoupleMembership, controllers.getAlbums);

// ============ REWARD ROUTES ============
router.get('/user/rewards', authenticateToken, controllers.getRewards);
router.post('/user/rewards/spin', authenticateToken, controllers.spinLuckySpin);
router.post('/user/rewards/claim/:rewardId', authenticateToken, controllers.claimReward);
router.get('/user/coins', authenticateToken, controllers.getUserCoins);
router.post('/user/coins/purchase', authenticateToken, controllers.purchaseCoins);

// ============ PROGRESS ROUTES ============
router.get('/couple/:coupleId/progress', authenticateToken, validateCoupleMembership, controllers.getCoupleProgress);
router.get('/couple/:coupleId/achievements', authenticateToken, validateCoupleMembership, controllers.getCoupleAchievements);
router.get('/user/levels', authenticateToken, controllers.getUserLevels);

export default router;
