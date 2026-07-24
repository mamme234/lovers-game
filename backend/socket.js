import { Server } from 'socket.io';
import { Couple, User, Message } from './models.js';
import { CoupleService } from './services.js';

export const initializeSocket = (httpServer, config) => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.socketCorsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Store active connections
  const userSockets = new Map();
  const coupleRooms = new Map();

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    // ============ AUTHENTICATION ============
    socket.on('authenticate', async (data) => {
      try {
        const { userId, coupleId } = data;
        
        // Store user socket mapping
        userSockets.set(userId, socket.id);
        
        // Join couple room
        socket.join(`couple_${coupleId}`);
        coupleRooms.set(`couple_${coupleId}`, coupleId);
        
        // Update online status
        const couple = await Couple.findById(coupleId);
        await CoupleService.updateOnlineStatus(coupleId, userId, true);
        
        // Notify partner
        io.to(`couple_${coupleId}`).emit('user_online', {
          userId,
          isOnline: true,
          timestamp: new Date(),
        });
        
        console.log(`✅ User ${userId} authenticated in couple ${coupleId}`);
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('error', { message: 'Authentication failed' });
      }
    });

    // ============ MESSAGING ============
    socket.on('send_message', async (data) => {
      try {
        const { coupleId, senderId, content, messageType } = data;
        
        // Create message in database
        const message = await Message.create({
          coupleId,
          senderId,
          content,
          messageType,
        });
        
        // Broadcast to couple
        io.to(`couple_${coupleId}`).emit('new_message', {
          id: message._id,
          senderId,
          content,
          messageType,
          timestamp: message.createdAt,
        });
        
        console.log(`💬 Message sent in couple ${coupleId}`);
      } catch (error) {
        console.error('Message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ============ TYPING INDICATOR ============
    socket.on('typing_start', (data) => {
      const { coupleId, userId } = data;
      io.to(`couple_${coupleId}`).emit('typing_indicator', {
        userId,
        isTyping: true,
      });
    });

    socket.on('typing_end', (data) => {
      const { coupleId, userId } = data;
      io.to(`couple_${coupleId}`).emit('typing_indicator', {
        userId,
        isTyping: false,
      });
    });

    // ============ GAME EVENTS ============
    socket.on('game_move', (data) => {
      const { coupleId, gameId, playerId, move } = data;
      
      io.to(`couple_${coupleId}`).emit('game_update', {
        gameId,
        playerId,
        move,
        timestamp: new Date(),
      });
    });

    socket.on('game_complete', (data) => {
      const { coupleId, gameId, winnerId, score1, score2 } = data;
      
      io.to(`couple_${coupleId}`).emit('game_completed', {
        gameId,
        winnerId,
        score1,
        score2,
      });
    });

    // ============ VOICE/VIDEO SIGNALS ============
    socket.on('call_initiate', (data) => {
      const { coupleId, callerId, calleeId } = data;
      
      io.to(`couple_${coupleId}`).emit('incoming_call', {
        callerId,
        calleeId,
        timestamp: new Date(),
      });
    });

    socket.on('webrtc_signal', (data) => {
      const { coupleId, to, signal } = data;
      
      io.to(`couple_${coupleId}`).emit('webrtc_signal', {
        from: socket.id,
        signal,
      });
    });

    // ============ NOTIFICATION EVENTS ============
    socket.on('send_notification', async (data) => {
      try {
        const { coupleId, type, message, recipientId } = data;
        
        io.to(`couple_${coupleId}`).emit('notification', {
          type,
          message,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Notification error:', error);
      }
    });

    // ============ REACTION EVENTS ============
    socket.on('message_reaction', (data) => {
      const { coupleId, messageId, emoji } = data;
      
      io.to(`couple_${coupleId}`).emit('reaction_added', {
        messageId,
        emoji,
        timestamp: new Date(),
      });
    });

    // ============ PRESENCE EVENTS ============
    socket.on('presence_update', async (data) => {
      try {
        const { coupleId, userId, presence } = data;
        
        io.to(`couple_${coupleId}`).emit('presence_changed', {
          userId,
          presence, // 'online', 'away', 'offline'
        });
      } catch (error) {
        console.error('Presence error:', error);
      }
    });

    // ============ DISCONNECTION ============
    socket.on('disconnect', async () => {
      try {
        // Find user by socket ID
        for (const [userId, socketId] of userSockets.entries()) {
          if (socketId === socket.id) {
            // Find couple and update status
            const user = await User.findById(userId).populate('coupleId');
            if (user && user.coupleId) {
              await CoupleService.updateOnlineStatus(user.coupleId._id, userId, false);
              
              // Notify partner
              io.to(`couple_${user.coupleId._id}`).emit('user_offline', {
                userId,
                isOnline: false,
                timestamp: new Date(),
              });
            }
            
            userSockets.delete(userId);
            break;
          }
        }
        
        console.log(`❌ User disconnected: ${socket.id}`);
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    });

    // ============ ERROR HANDLING ============
    socket.on('error', (error) => {
      console.error(`⚠️ Socket error: ${error}`);
    });
  });

  return io;
};

export default initializeSocket;
