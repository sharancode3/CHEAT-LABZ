/**
 * server.js — CHEAT LABZ Multiplayer Server (Rebuilt Architecture)
 * 
 * Stack: Node.js + Express + Socket.IO
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

import { CONFIG, ALLOWED_ORIGINS } from './config.js';
import { setupRateLimiter } from './middleware/rate-limiter.js';
import { createValidatorMiddleware, validateSchema } from './middleware/validator.js';
import { createRoom, getRoom, deleteRoom, rooms } from './rooms/room-manager.js';
import { handleGameAction } from './games/game-manager.js';
import { createBotForGame } from './bots/bot-manager.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        cb(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        cb(null, true);
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: CONFIG.PING_TIMEOUT,
  pingInterval: CONFIG.PING_INTERVAL,
  perMessageDeflate: true,
});

global.ioInstance = io;

// HTTP Routes
app.use(express.json());
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

app.get('/health', (req, res) => {
  let inGame = 0, inLobby = 0;
  for (const r of rooms.values()) {
    if (r.state === 'PLAYING') inGame += r.getConnectedPlayersCount();
    else inLobby += r.getConnectedPlayersCount();
  }
  res.json({
    status: 'ok',
    rooms: rooms.size,
    players: { total: io.engine.clientsCount, inLobby, inGame },
    uptime: process.uptime(),
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

// Broadcast rooms count
setInterval(() => {
  let inGame = 0, inLobby = 0;
  for (const r of rooms.values()) {
    if (r.state === 'PLAYING') inGame += r.getConnectedPlayersCount();
    else inLobby += r.getConnectedPlayersCount();
  }
  io.emit('presence:update', {
    total: io.engine.clientsCount,
    inLobby,
    inGame
  });
}, 5000);

// Socket Logic
io.on('connection', (socket) => {
  const checkRateLimit = setupRateLimiter(socket, 30);
  socket.use(createValidatorMiddleware(checkRateLimit));

  console.log(`[CONNECT] Socket ${socket.id}`);

  // Helpers
  const joinRoomBroadcast = (room) => {
    socket.join(room.code);
    io.to(room.code).emit('room:updated', { room: room.serialize() });
  };

  // Reconnection Check (happens right after connect if client has token)
  socket.on('player:reconnect', (data) => {
    try {
      if (!validateSchema(data, ['sessionToken'])) throw new Error('Missing token');
      const { sessionToken } = data;
      
      let foundRoom = null;
      let foundPlayer = null;

      for (const r of rooms.values()) {
        const p = r.getPlayerBySessionToken(sessionToken);
        if (p) {
          foundRoom = r;
          foundPlayer = p;
          break;
        }
      }

      if (foundRoom && foundPlayer && !foundPlayer.connected) {
        // Reconnect them
        foundPlayer.socketId = socket.id;
        foundPlayer.connected = true;
        socket.join(foundRoom.code);
        
        console.log(`[RECONNECT] ${foundPlayer.displayName} reconnected to ${foundRoom.code}`);
        socket.emit('room:updated', { room: foundRoom.serialize() });
        socket.to(foundRoom.code).emit('room:updated', { room: foundRoom.serialize() });
        
        if (foundRoom.state === 'PLAYING') {
          socket.emit('game:state', { state: foundRoom.gameState });
        }
      } else {
        socket.emit('error:reconnect', { message: 'Invalid or expired session' });
      }
    } catch (err) {
      socket.emit('error:room', { message: err.message });
    }
  });

  // Room Events
  socket.on('room:create', (data) => {
    try {
      if (!validateSchema(data, ['gameId', 'mode'])) throw new Error('Invalid payload');
      const { gameId, mode, settings } = data;
      const maxPlayers = mode === 'bot' ? 2 : 2; // Default to 2 for now
      
      const room = createRoom(gameId, mode, maxPlayers, settings);
      console.log(`[ROOM] Created ${room.code} for ${gameId} (${mode})`);
      socket.emit('room:created', { code: room.code, room: room.serialize() });
    } catch (err) {
      socket.emit('error:room', { message: err.message });
    }
  });

  socket.on('room:join', (data) => {
    try {
      if (!validateSchema(data, ['code', 'displayName', 'sessionToken'])) throw new Error('Invalid payload');
      const code = data.code.toUpperCase();
      const room = getRoom(code);
      
      if (!room) throw new Error('Room not found');
      
      const color = '#6c63ff'; // Randomize later
      room.addPlayer(socket.id, data.sessionToken, data.displayName, color);
      
      // If it's a bot mode, add the bot too if not already there
      if (room.mode === 'bot' && !room.botPlayer && room.players.size === 1) {
        const bot = createBotForGame(room.gameId, room.settings.difficulty);
        room.botPlayer = bot;
      }
      
      socket.emit('room:joined', { code: room.code, room: room.serialize() });
      joinRoomBroadcast(room);
    } catch (err) {
      socket.emit('error:room', { message: err.message });
    }
  });

  socket.on('room:leave', (data) => {
    try {
      if (!validateSchema(data, ['code'])) return;
      const room = getRoom(data.code);
      if (room) {
        room.removePlayer(socket.id);
        socket.leave(room.code);
        io.to(room.code).emit('room:updated', { room: room.serialize() });
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('player:ready', (data) => {
    try {
      if (!validateSchema(data, ['code'])) return;
      const room = getRoom(data.code);
      if (!room) return;
      const player = room.getPlayerBySocketId(socket.id);
      if (player) {
        player.ready = data.isReady !== undefined ? data.isReady : true;
        
        // Check if all players (and bots) are ready
        let allReady = true;
        for (const p of room.players.values()) {
          if (!p.ready) allReady = false;
        }
        
        if (room.mode === 'bot' && (!room.botPlayer || !room.botPlayer.ready)) {
           allReady = false;
        }

        // Wait for maxPlayers? For now we just check if whoever is in is ready, 
        // but normally we need room to be full.
        const isFull = room.players.size + (room.botPlayer ? 1 : 0) === room.maxPlayers;
        
        if (allReady && isFull && room.state === 'WAITING') {
          room.state = 'COUNTDOWN';
          io.to(room.code).emit('room:countdown', { seconds: 3 });
          
          setTimeout(() => {
            if (room.state === 'COUNTDOWN') {
              room.state = 'PLAYING';
              io.to(room.code).emit('game:started', { initialState: room.gameState });
            }
          }, 3000);
        }
        
        io.to(room.code).emit('room:updated', { room: room.serialize() });
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Game Events
  socket.on('game:action', (data) => {
    handleGameAction(io, socket, data);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`[DISCONNECT] Socket ${socket.id}`);
    
    // Find room the player is in
    for (const room of rooms.values()) {
      const player = room.getPlayerBySocketId(socket.id);
      if (player) {
        player.connected = false;
        
        if (room.state === 'PLAYING') {
          // Player disconnected during active game
          io.to(room.code).emit('opponent:disconnected', { socketId: socket.id });
          
          // Reconnection logic: if they don't reconnect in 60s, forfeit
          setTimeout(() => {
            const p = room.getPlayerBySessionToken(player.sessionToken);
            if (p && !p.connected && room.state === 'PLAYING') {
              io.to(room.code).emit('game:over', { 
                results: { forfeit: true, loser: p.socketId } 
              });
              room.state = 'FINISHED';
            }
          }, CONFIG.RECONNECT_GRACE_PERIOD);
        } else {
          // Just remove them if not in game
          room.removePlayer(socket.id);
          io.to(room.code).emit('room:updated', { room: room.serialize() });
        }
      }
    }
  });
});

// Start
httpServer.listen(CONFIG.PORT, () => {
  console.log(`Server running on port ${CONFIG.PORT} in ${CONFIG.ENV} mode.`);
});
