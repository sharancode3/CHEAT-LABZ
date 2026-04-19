# 🎮 Hyper Plays

Hyper Plays is a browser arcade platform with a full gaming UI redesign (2026) focused on quick game discovery, fullscreen play, and account-linked progress.

## 🌟 What’s New in the Redesign

- **Redesigned Landing Experience** (`index.html`)
  - Hero dashboard, spotlight cards, category pills, search, and quick launch.
- **Redesigned Auth Flow** (`login.html`, `register.html`)
  - Modern gaming-style forms, guest mode, password show/hide, offline fallback.
- **Redesigned Portal Command Center** (`portal.html`)
  - Player overview stats, game filtering, search, fullscreen game shell, HUD controls.
- **Redesigned Supporting Pages**
  - `about.html` now matches the same visual system.
  - `tests/tests.html` is now a styled interactive utility test runner.

## 🧩 Core Features

- Secure authentication with JWT and local offline fallback.
- Progress tracking API integration with local fallback storage.
- Fullscreen game launch with pause/resume/replay/exit controls.
- Local high-score persistence per user and per game.
- Responsive layouts across desktop and mobile.

## 🚀 Quick Start

### Prerequisites

- Node.js (v14+)
- npm

### Install and Run

1. Install dependencies:
   ```powershell
   npm install
   ```

2. Start backend API server:
   ```powershell
   npm start
   ```

3. Open frontend:
   - Open `index.html` directly, or
   - Use a static host / VS Code Live Server.

Server runs on `http://localhost:3000` by default.

## 🗺️ Main UX Flow

1. Open `index.html`.
2. Use **Account** or **Launch Portal**.
3. Sign in / sign up / continue as guest.
4. Enter `portal.html` and launch games from the dashboard.
5. Finish rounds to save score/progress.

## 📁 Key Files

- `index.html`, `style.css`, `script.js` → Landing UI + interactions
- `login.html`, `login.css`, `login.js` → Auth UI + logic
- `register.html` → Standalone registration flow
- `portal.html`, `portal.style.css`, `portal.app.js` → Main game command center
- `about.html` → Product/about overview
- `tests/tests.html` → Utility test runner
- `server.js` → API backend

## 🧪 Test Runner

Open `tests/tests.html` in browser to run utility tests for `shared/utils.js`.

## 🔧 Configuration

Create/update `.env`:

```env
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

## 🎮 Adding a New Game

1. Create a folder under `games/` with an `index.html`.
2. Add the game entry in `portal.app.js` `GAMES` array.
3. (Optional) Add a matching thumbnail under `assets/thumbs/` and map it in `THUMBS`.
4. Post result events from the game:

```javascript
window.parent.postMessage({
  type: 'game_over',
  gameId: 'your-game-id',
  result: 'completed',
  score: 123
}, '*');
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Progress
- `POST /api/progress`
- `GET /api/progress/:gameId`
- `GET /api/progress`
- `GET /api/leaderboard/:gameId`

## 🐛 Troubleshooting

### `EADDRINUSE: 3000`
- Another process is already using port 3000 (often your existing server instance).

### Games don’t load
- Confirm `embed` paths in `portal.app.js` match actual files.

### Progress doesn’t persist to API
- Verify backend is running and auth token exists in localStorage.

---

Made for fast browser gaming and continuous UI iteration.
