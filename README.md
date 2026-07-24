# 💕 LoveVerse - Premium Couples Mini App

A premium Telegram mini app designed for couples to connect, play games, share memories, and strengthen their relationship.

## 🎯 Features

### 💞 Core Features
- **Couple System**: Invite partner via pairing code
- **Private Messenger**: End-to-end encrypted chat with typing indicators
- **Fun Games**: 10+ interactive games for couples
- **Shared Memories**: Photo albums and timeline
- **Relationship Planner**: Calendar, tasks, and reminders
- **Rewards System**: Coins, badges, and achievements
- **Progress Tracking**: Levels, XP, and statistics

### 🎮 Games
1. Compatibility Quiz
2. Truth or Dare
3. Would You Rather
4. Guess My Answer
5. Emoji Challenge
6. Memory Match
7. Couple Puzzle
8. Draw Together
9. Fast Reaction
10. Story Builder

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose
- **Socket.io** for real-time communication
- **JWT** for authentication
- **Telegram WebApp** authentication

### Frontend
- **HTML5** & **CSS3**
- **Vanilla JavaScript** (ES6 Modules)
- **Socket.io** client
- **GSAP** for animations
- **Lottie** for complex animations
- **Chart.js** for statistics

### Hosting
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: MongoDB Atlas
- **Storage**: Cloudinary

## 📁 Project Structure

```
lovers-game/
├── backend/
│   ├── server.js          # Express server
│   ├── package.json       # Dependencies
│   ├── .env              # Environment variables
│   ├── config.js         # Configuration
│   ├── db.js             # MongoDB connection
│   ├── models.js         # Mongoose schemas
│   ├── controllers.js    # Route handlers
│   ├── routes.js         # API endpoints
│   ├── middleware.js     # Custom middleware
│   ├── services.js       # Business logic
│   ├── utils.js          # Utility functions
│   └── socket.js         # WebSocket handlers
│
└── frontend/
    ├── index.html        # Main HTML
    ├── css/
    │   ├── main.css      # Main styles
    │   ├── animations.css # Animations
    │   └── responsive.css # Responsive design
    ├── js/
    │   ├── app.js        # Main app logic
    │   ├── auth.js       # Authentication
    │   ├── socket.js     # Socket.io client
    │   ├── telegram.js   # Telegram integration
    │   ├── animations.js # Animation manager
    │   └── pages/        # Page modules
    │       ├── dashboard.js
    │       ├── chat.js
    │       ├── games.js
    │       ├── memories.js
    │       └── profile.js
    ├── assets/           # Images & resources
    └── animations/       # Lottie files
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- MongoDB Atlas account
- Telegram Bot Token
- Cloudinary account (optional)

### Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEB_APP_SECRET=your_app_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=http://localhost:3000
SOCKET_CORS_ORIGIN=http://localhost:3000
```

Start server:
```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
# Serve with a local server
python3 -m http.server 3000
```

Or use Vercel CLI:
```bash
vercel dev
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/login` - Login with Telegram
- `POST /api/auth/refresh-token` - Refresh JWT token

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `PATCH /api/user/mood` - Update mood

### Couple
- `POST /api/couple/create` - Create couple
- `POST /api/couple/invite` - Generate pairing code
- `POST /api/couple/join` - Join couple with code
- `GET /api/couple/:id/profile` - Get couple profile

### Messages
- `POST /api/couple/:id/messages` - Send message
- `GET /api/couple/:id/messages` - Get messages
- `PATCH /api/messages/:id/read` - Mark as read

### Games
- `POST /api/couple/:id/games/start` - Start game
- `GET /api/couple/:id/games/history` - Game history
- `POST /api/couple/:id/games/:gameId/complete` - Complete game

### Memories
- `POST /api/couple/:id/memories` - Upload memory
- `GET /api/couple/:id/memories` - Get memories
- `PATCH /api/memories/:id/favorite` - Toggle favorite

## 🔐 Security Features

- ✅ Telegram WebApp authentication
- ✅ JWT token-based authorization
- ✅ Password hashing with bcrypt
- ✅ End-to-end encrypted messaging
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Input validation
- ✅ Helmet.js security headers

## 📱 Real-Time Features

- Live messaging with typing indicators
- Online/offline status
- Game synchronization
- Notification system
- Presence updates

## 🎨 UI/UX Features

- Glassmorphism design
- Dark mode support
- Smooth GSAP animations
- Lottie complex animations
- Responsive design (mobile-first)
- Premium gradients
- Micro-interactions

## 📊 Database Schema

### Collections
- **Users**: Profile, stats, preferences
- **Couples**: Relationship data, pairing status
- **Messages**: Chat history with reactions
- **Games**: Game records and results
- **Memories**: Photos and albums
- **Tasks**: Planner and shopping lists
- **Achievements**: Badges and milestones

## 🚢 Deployment

### Render (Backend)
1. Connect GitHub repo
2. Set environment variables
3. Deploy on main push

### Vercel (Frontend)
1. Connect GitHub repo
2. Set API URL as env variable
3. Auto-deploy on push

## 📖 Contributing

Contributions welcome! Please follow the existing code style.

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 💬 Support

For issues and questions, please open a GitHub issue.

---

**Made with 💕 for couples who want to strengthen their bond through fun and meaningful interactions.**
