import express from 'express';
import http from 'http';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { connectDB } from './db.js';
import { initializeSocket } from './socket.js';
import config from './config.js';
import routes from './routes.js';
import {
  requestLogger,
  corsHeaders,
  errorHandler,
} from './middleware.js';

const app = express();
const server = http.createServer(app);

// ============ DATABASE CONNECTION ============
connectDB();

// ============ MIDDLEWARE ============
// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(corsHeaders);

// Body Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request Logger
app.use(requestLogger);

// Rate Limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// ============ ROUTES ============
app.use('/api/', routes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ============ SOCKET.IO ============
const io = initializeSocket(server, config);
app.set('io', io);

// ============ ERROR HANDLING ============
app.use(errorHandler);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============ SERVER START ============
const PORT = config.port;
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║         🎮 LoveVerse Server 💕         ║
╠════════════════════════════════════════╣
║  ✅ Server running on port ${PORT}           ║
║  ✅ Environment: ${config.nodeEnv}              ║
║  ✅ WebSocket enabled with Socket.io  ║
╚════════════════════════════════════════╝
  `);
});

// Graceful Shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down gracefully...');
  server.close(() => {
    console.log('❌ Server closed');
    process.exit(0);
  });
});

export { app, server, io };
