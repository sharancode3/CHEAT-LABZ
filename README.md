# Hyper Plays - Browser Gaming Platform

<div align="center">

[![Node.js](https://img.shields.io/badge/Node.js-v14%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square)]()

**A modern, full-stack browser gaming platform with real-time progress tracking, secure authentication, and an intuitive arcade experience.**

[🎮 Play Now](#quick-start) • [📖 Documentation](#documentation) • [🤝 Contributing](#contributing)

</div>

---

## Overview

Hyper Plays is a production-grade gaming platform built for the modern browser. It combines a sophisticated full-stack architecture with an engaging user experience, delivering a seamless arcade experience accessible from any device. Whether you're a casual gamer or a developer looking to extend the platform, Hyper Plays provides the infrastructure and flexibility you need.

### Key Highlights

- **🎯 Modern Architecture**: Express.js backend with JWT authentication and REST API
- **🔐 Enterprise-Grade Security**: Secure token-based authentication with offline fallback
- **📊 Real-Time Progress Tracking**: Persistent player statistics and leaderboards
- **🎮 15+ Integrated Games**: Classic arcade titles and modern mini-games
- **📱 Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **⚡ Fullscreen Gaming**: Immersive game experience with in-game controls
- **🌐 Guest Mode**: Play without authentication
- **💾 Offline Support**: Local fallback storage ensures uninterrupted gameplay

---

## Quick Start

### Prerequisites

- **Node.js** v14 or higher
- **npm** v6 or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sharancode3/CHEAT-LABZ.git
   cd CHEAT-LABZ
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Access the platform**
   - Open `http://localhost:3000` in your browser
   - Or open `index.html` directly for frontend-only testing

---

## Features

### 🏠 Landing Dashboard
- Hero showcase with game spotlights
- Category-based game filtering
- Intelligent search functionality
- One-click game launch

### 🔐 Authentication System
- Modern registration and login flows
- JWT token-based session management
- Guest mode for immediate access
- Secure password handling with offline fallback

### 🎮 Game Portal
- Unified command center for all games
- Real-time player statistics
- Personal progress tracking
- Fullscreen game launcher with HUD controls
- Game pause/resume/replay functionality

### 🏆 Leaderboards & Progress
- Global game leaderboards
- Per-player game statistics
- High-score persistence
- Progress sync with backend API

### 📱 Responsive Interface
- Mobile-first design approach
- Touch-friendly controls
- Adaptive layouts for all screen sizes
- Cross-browser compatibility

---

## Architecture

### Technology Stack

**Frontend**
- HTML5, CSS3, Vanilla JavaScript
- Responsive design system
- localStorage for client-side persistence

**Backend**
- Node.js with Express.js
- JWT authentication
- RESTful API design
- CORS support for cross-origin requests

### Project Structure

```
├── index.html              # Landing page
├── portal.html             # Game portal/dashboard
├── login.html              # Authentication flow
├── register.html           # User registration
├── server.js               # Express backend
├── games/                  # Game collection (15+ titles)
│   ├── snake/
│   ├── wordle/
│   ├── bubbleshooter/
│   └── ... (more games)
├── shared/                 # Shared utilities
├── tests/                  # Test utilities
└── assets/                 # Images and resources
```

### Available Games

| Game | Type | Description |
|------|------|-------------|
| **Snake** | Action | Classic snake gameplay |
| **Wordle** | Puzzle | Word guessing game |
| **Bubble Shooter** | Action | Bubble matching arcade |
| **Dino Runner** | Action | Dinosaur endless runner |
| **Memory Grid** | Puzzle | Memory card matching |
| **Monkey Type** | Typing | Typing speed challenge |
| **Pong** | Classic | Two-player pong game |
| **Reaction Time** | Reflex | Reaction speed test |
| **Pixel Dodge** | Action | Dodge obstacles |
| **Word Guesser** | Puzzle | Word puzzle game |
| **Haunted** | Adventure | Spooky adventure game |
| **Key Frenzy** | Reflex | Keyboard speed test |
| **Hyper Tap** | Reflex | Rapid tap game |
| **Neon Pong** | Classic | Modern pong variant |
| **Puzzle** | Puzzle | Puzzle game collection |

---

## API Documentation

### Authentication Endpoints

**Sign Up**
```http
POST /api/auth/signup
Content-Type: application/json

{
  "username": "player",
  "email": "player@example.com",
  "password": "secure_password"
}
```

**Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "player@example.com",
  "password": "secure_password"
}
```

**Get Current User**
```http
GET /api/auth/me
Authorization: Bearer {token}
```

### Progress Endpoints

**Submit Game Score**
```http
POST /api/progress
Authorization: Bearer {token}
Content-Type: application/json

{
  "gameId": "snake",
  "score": 1250,
  "result": "completed"
}
```

**Get Game Progress**
```http
GET /api/progress/:gameId
Authorization: Bearer {token}
```

**Get User Leaderboard**
```http
GET /api/leaderboard/:gameId
```

---

## Configuration

Create a `.env` file in the project root:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your-secure-secret-key-change-in-production
JWT_EXPIRY=7d

# Database (if applicable)
DB_CONNECTION_STRING=

# CORS
CORS_ORIGIN=http://localhost:3000
```

---

## Game Development Guide

### Creating a New Game

1. **Create game directory**
   ```bash
   mkdir -p games/my-game
   ```

2. **Build your game** in `games/my-game/index.html`
   - Use vanilla JavaScript or any framework
   - Keep dependencies minimal

3. **Register in portal** (`portal.app.js`)
   ```javascript
   {
     id: 'my-game',
     title: 'My Awesome Game',
     embed: '/games/my-game/index.html',
     category: 'action'
   }
   ```

4. **Add thumbnail** in `assets/thumbs/my-game.png`

5. **Submit game results** from your game
   ```javascript
   window.parent.postMessage({
     type: 'game_over',
     gameId: 'my-game',
     result: 'completed',
     score: 1500
   }, '*');
   ```

---

## Troubleshooting

### Port Already in Use
```bash
# Change port in .env
PORT=3001
npm start
```

### Games Not Loading
- Verify embed paths in `portal.app.js`
- Check browser console for CORS errors
- Ensure game files exist in `games/` directory

### Authentication Issues
- Clear localStorage: `localStorage.clear()`
- Verify JWT_SECRET matches between client and server
- Check token expiration in browser DevTools

### Progress Not Syncing
- Verify backend is running
- Check network tab in DevTools for API errors
- Confirm JWT token exists in localStorage

---

## Performance Optimization

- **Lazy loading** for game assets
- **Responsive images** for multiple screen sizes
- **Efficient caching** strategies
- **Optimized bundle** sizes

---

## Security Considerations

- JWT tokens secured with strong secret keys
- CORS properly configured for production
- Input validation on all API endpoints
- Password hashing for user credentials
- Secure offline fallback mechanisms

---

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| Mobile Safari | 14+ | ✅ Full |
| Chrome Mobile | 90+ | ✅ Full |

---

## Contributing

Contributions are welcome! Here's how to contribute:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Workflow

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
```

---

## Roadmap

- [ ] Advanced matchmaking system
- [ ] Social features (friend challenges, leaderboards)
- [ ] Game mods support
- [ ] Mobile app version
- [ ] Cloud save synchronization
- [ ] Achievement system
- [ ] Real-time multiplayer games
- [ ] Custom game creation tools

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

For support, issues, or questions:

- 📧 Email: support@hyperplays.dev
- 🐛 Report bugs via [GitHub Issues](https://github.com/sharancode3/CHEAT-LABZ/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/sharancode3/CHEAT-LABZ/discussions)

---

<div align="center">

**Made with ❤️ by the Hyper Plays Team**

*Bringing arcade gaming to the modern web*

</div>
