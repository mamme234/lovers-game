import { getToken } from './auth.js';

const SOCKET_URL = 'http://localhost:5000';

export function initializeSocket(token, userId) {
  const socket = io(SOCKET_URL, {
    auth: {
      token
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected');
    // Authenticate on connection
    socket.emit('authenticate', { userId });
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  socket.on('error', (error) => {
    console.error('⚠️ Socket error:', error);
  });

  return socket;
}

export function emitMessage(socket, coupleId, content, messageType = 'text') {
  if (socket && socket.connected) {
    socket.emit('send_message', {
      coupleId,
      content,
      messageType
    });
  }
}

export function startGameMove(socket, coupleId, gameId, move) {
  if (socket && socket.connected) {
    socket.emit('game_move', {
      coupleId,
      gameId,
      move
    });
  }
}

export function emitTyping(socket, coupleId, isTyping) {
  if (socket && socket.connected) {
    if (isTyping) {
      socket.emit('typing_start', { coupleId });
    } else {
      socket.emit('typing_end', { coupleId });
    }
  }
}
