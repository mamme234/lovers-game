import jwt from 'jsonwebtoken';
import config from './config.js';
import { User } from './models.js';

// JWT Authentication Middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = user;
    req.userId = decoded.id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Telegram WebApp Validation Middleware
export const validateTelegramWebApp = (req, res, next) => {
  try {
    const initData = req.headers['x-init-data'] || req.body.initData;
    
    if (!initData) {
      return res.status(401).json({ error: 'Telegram init data required' });
    }

    // In production, verify the hash signature
    // For now, parse the init data
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    // TODO: Verify hash signature with Telegram
    // const dataCheckString = Array.from(params.entries())
    //   .filter(([key]) => key !== 'hash')
    //   .map(([key, value]) => `${key}=${value}`)
    //   .sort()
    //   .join('\n');

    req.telegramInitData = Object.fromEntries(params.entries());
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid Telegram init data' });
  }
};

// Error Handling Middleware
export const errorHandler = (error, req, res, next) => {
  console.error('Error:', error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: Object.values(error.errors).map((e) => e.message),
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  if (error.code === 11000) {
    return res.status(409).json({ error: 'Duplicate field value' });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};

// Logging Middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );
  });
  
  next();
};

// CORS Headers Middleware
export const corsHeaders = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', config.frontendUrl);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Init-Data'
  );
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
};

// Validate Couple Membership
export const validateCoupleMembership = async (req, res, next) => {
  try {
    const { coupleId } = req.params;
    const user = await User.findById(req.userId).populate('coupleId');

    if (!user.coupleId || user.coupleId._id.toString() !== coupleId) {
      return res.status(403).json({ error: 'Not a member of this couple' });
    }

    req.couple = user.coupleId;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export default {
  authenticateToken,
  validateTelegramWebApp,
  errorHandler,
  requestLogger,
  corsHeaders,
  validateCoupleMembership,
};
