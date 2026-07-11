/**
 * server.js — CHEAT LABZ Multiplayer Server
 * 
 * Stack: Node.js + Express + Socket.IO
 * Port:  4000 (dev) | process.env.PORT (production)
 *
 * Responsibilities:
 *   1. Serve HTTP health check
 *   2. Real-time presence tracking (broadcast every 5s)
 *   3. Room management (via rooms.js)
 *   4. Random matchmaking (via matchmaking.js)
 *   5. Socket lifecycle: assign identity on connect, cleanup on disconnect
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerRoomEvents, leaveRoom, handleLobbyDisconnect, getRoomsStats, rooms } from './rooms.js';
import { registerMatchmakingEvents, removeFromQueue } from './matchmaking.js';
import { registerRPSEvents }       from './games/rps.js';
import { registerTTTEvents }       from './games/tictactoe.js';
import { registerReflexEvents }    from './games/reflex-duel.js';
import { registerWordDuelEvents }  from './games/word-duel.js';
import { registerSnakeEvents }     from './games/snake-arena.js';
import { registerBattleshipEvents } from './games/battleship.js';
import { registerSoccerEvents }     from './games/physics-soccer.js';
import { registerLudoEvents }       from './games/ludo.js';
import { registerBombermanEvents }  from './games/bomberman-arena.js';
import { registerTankBattleEvents } from './games/tank-battle.js';
import { registerKingOfTheHillEvents } from './games/king-of-the-hill.js';
import { registerColorFloodDuelEvents } from './games/color-flood-duel.js';
import { registerRacerEvents } from './games/top-down-racer.js';
import { registerZombieEvents } from './games/zombie-survival.js';
import { registerPartyEvents } from './games/mini-party-pack.js';
import { registerGunfightEvents } from './games/pixel-gunfight.js';
import { registerCtfEvents } from './games/capture-the-flag.js';
import { registerClashEvents } from './games/mini-clash.js';
import { registerRpsTournamentEvents } from './games/rps-tournament.js';

import { registerIdentityRoutes } from './identity-handler.js';

// Social features store
const activityFeed = [];
export function logActivity(text) {
  activityFeed.unshift({ id: Math.random().toString(36).slice(2, 9), text, timestamp: Date.now() });
  if (activityFeed.length > 20) activityFeed.pop();
  global.ioInstance?.emit('social:activity', activityFeed);
}

function getActiveRooms() {
  const list = [];
  for (const room of rooms.values()) {
    if (room.state === 'waiting' && room.players.length < room.maxPlayers) {
      list.push({
        code: room.code,
        gameId: room.gameId,
        playersCount: room.players.length,
        maxPlayers: room.maxPlayers,
        hostName: room.players.find(p => p.isHost)?.displayName || 'Host'
      });
    }
  }
  return list;
}



// ────────────────────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .concat([
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ])
  .filter(Boolean);

// ────────────────────────────────────────────────────────────────────────────
// Player Name / Color Assignment
// ────────────────────────────────────────────────────────────────────────────
const PLAYER_COLORS = [
  '#6c63ff', '#00d4aa', '#ff6b6b', '#ffd93d',
  '#4ecdc4', '#fd79a8', '#e17055',
];

function randomPlayerName() {
  return 'Player' + Math.floor(1000 + Math.random() * 9000);
}

function randomPlayerColor() {
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
}

// ────────────────────────────────────────────────────────────────────────────
// Server Setup
// ────────────────────────────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, cb) => {
      // Allow if origin is in list or undefined (server-to-server)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        cb(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        cb(null, true); // Permissive in dev — tighten for production
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 20000,
  pingInterval: 10000,
});

global.ioInstance = io;


// ────────────────────────────────────────────────────────────────────────────
// HTTP Routes
// ────────────────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));
registerIdentityRoutes(app);

app.get('/', (req, res) => {
  res.json({
    service: 'CHEAT LABZ Multiplayer Server',
    status: 'online',
    connected: io.engine.clientsCount,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  const { inLobby, inGame } = getRoomsStats();
  res.json({
    status: 'ok',
    players: { total: io.engine.clientsCount, inLobby, inGame },
    uptime: process.uptime(),
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Presence Broadcast (every 5 seconds to all connected clients)
const presenceStore = new Map(); // uid -> { lastSeen: timestamp, socketIds: Set }

setInterval(() => {
  const now = Date.now();
  for (const [uid, data] of presenceStore.entries()) {
    if (now - data.lastSeen > 30000) { // 30s timeout
      presenceStore.delete(uid);
    }
  }

  const { inLobby, inGame } = getRoomsStats();
  let waitingRooms = 0;
  for (const r of rooms.values()) {
    if (r.state === 'waiting' || r.state === 'countdown') waitingRooms++;
  }

  io.emit('presence:update', {
    total: presenceStore.size,
    inLobby,
    inGame,
    waitingRooms
  });

  // Also broadcast active rooms list
  io.emit('social:active-rooms', getActiveRooms());
}, 10000);


// ────────────────────────────────────────────────────────────────────────────
// Socket.IO Connection Handling
// ────────────────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  // Assign identity
  socket.uid         = socket.handshake.query.uid || null;
  socket.playerName  = randomPlayerName();
  socket.playerColor = randomPlayerColor();
  socket.currentRoom = null;
  socket.matchmakingGame = null;

  console.log(`[CONNECT] ${socket.playerName} (${socket.id}) — total: ${io.engine.clientsCount}`);

  // Send identity to the connecting client
  socket.emit('player:identity', {
    socketId: socket.id,
    displayName: socket.playerName,
    color: socket.playerColor,
  });

  // Immediately send current presence
  const { inLobby, inGame } = getRoomsStats();
  let waitingRooms = 0;
  for (const r of rooms.values()) {
    if (r.state === 'waiting' || r.state === 'countdown') waitingRooms++;
  }

  socket.emit('presence:update', {
    total: presenceStore.size,
    inLobby,
    inGame,
    waitingRooms
  });

  socket.on('presence:heartbeat', ({ uid }) => {
    if (!uid) return;
    let entry = presenceStore.get(uid);
    if (!entry) {
      entry = { lastSeen: Date.now(), socketIds: new Set() };
      presenceStore.set(uid, entry);
    }
    entry.lastSeen = Date.now();
    entry.socketIds.add(socket.id);
  });

  // Immediately send activity and active rooms
  socket.emit('social:activity', activityFeed);
  socket.emit('social:active-rooms', getActiveRooms());


  // Register domain-specific events
  registerRoomEvents(io, socket);
  registerMatchmakingEvents(io, socket);
  // Game-specific handlers (each registers its own socket events)
  registerRPSEvents(io, socket, rooms);
  registerTTTEvents(io, socket, rooms);
  registerReflexEvents(io, socket, rooms);
  registerWordDuelEvents(io, socket, rooms);
  registerSnakeEvents(io, socket, rooms);
  registerBattleshipEvents(io, socket, rooms);
  registerSoccerEvents(io, socket, rooms);
  registerLudoEvents(io, socket, rooms);
  registerBombermanEvents(io, socket, rooms);
  registerTankBattleEvents(io, socket, rooms);
  registerKingOfTheHillEvents(io, socket, rooms);
  registerColorFloodDuelEvents(io, socket, rooms);
  registerRacerEvents(io, socket, rooms);
  registerZombieEvents(io, socket, rooms);
  registerPartyEvents(io, socket, rooms);
  registerGunfightEvents(io, socket, rooms);
  registerCtfEvents(io, socket, rooms);
  registerClashEvents(io, socket, rooms);
  registerRpsTournamentEvents(io, socket, rooms);



  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[DISCONNECT] ${socket.playerName} (${socket.id}) — reason: ${reason}`);

    // Remove from presenceStore
    for (const [uid, data] of presenceStore.entries()) {
      if (data.socketIds.has(socket.id)) {
        data.socketIds.delete(socket.id);
        if (data.socketIds.size === 0) {
          presenceStore.delete(uid);
        }
      }
    }

    // Leave current room (calls handleLobbyDisconnect for grace periods)
    if (socket.currentRoom) {
      handleLobbyDisconnect(io, socket, socket.currentRoom);
    }

    // Remove from matchmaking queue
    removeFromQueue(socket);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Start Server
// ────────────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   CHEAT LABZ — Multiplayer Server        ║');
  console.log(`║   Running on port ${PORT}                  ║`);
  console.log('║   Real-time: Socket.IO + WebSocket        ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});
