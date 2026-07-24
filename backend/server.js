import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import router from './routes.js';
import mongoose from 'mongoose';
import { handleWebhook } from './bot.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ============================================
// MIDDLEWARE
// ============================================

// Helmet for security
app.use(helmet({
  contentSecurityPolicy: false, // Disable for simplicity
}));

// CORS
app.use(cors({
  origin: [
    'https://lovers-game.vercel.app',
    'https://lovers-game.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5000'
  ],
  credentials: true,
}));

// Raw body parser for Telegram webhook (must come before express.json)
if (IS_PRODUCTION && process.env.TELEGRAM_BOT_TOKEN) {
  app.use(`/webhook/${process.env.TELEGRAM_BOT_TOKEN}`, express.raw({ 
    type: 'application/json' 
  }));
}

// JSON parser for all other routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// TELEGRAM WEBHOOK ROUTE
// ============================================

if (IS_PRODUCTION && process.env.TELEGRAM_BOT_TOKEN) {
  app.post(`/webhook/${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
    try {
      handleWebhook(req, res);
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });
  
  console.log(`🤖 Webhook endpoint registered: /webhook/${process.env.TELEGRAM_BOT_TOKEN}`);
}

// ============================================
// DATABASE CONNECTION
// ============================================

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/loveverse', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// ============================================
// API ROUTES
// ============================================

// Health check endpoint
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus[dbState] || 'unknown',
      connected: dbState === 1,
    },
    bot: {
      configured: !!process.env.TELEGRAM_BOT_TOKEN,
      mode: IS_PRODUCTION ? 'webhook' : 'polling',
    }
  });
});

// API routes
app.use('/api', router);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong!';
  
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ============================================
// START SERVER
// ============================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🔍 Health check at http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (IS_PRODUCTION) {
    console.log(`🤖 Bot mode: Webhook`);
    console.log(`🔗 Webhook URL: ${process.env.API_URL || 'https://lovers-game.onrender.com'}/webhook/${process.env.TELEGRAM_BOT_TOKEN}`);
  } else {
    console.log(`🤖 Bot mode: Polling`);
  }
  console.log('='.repeat(60));
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  // Close the server
  server.close(() => {
    console.log('✅ HTTP server closed');
  });
  
  // Close MongoDB connection
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB:', error);
  }
  
  // Exit process
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  shutdown('uncaughtException');
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});

export default app;
