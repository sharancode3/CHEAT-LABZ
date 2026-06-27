/**
 * rooms.js — Room Management Logic for CHEAT LABZ Multiplayer
 *
 * Handles: room creation, joining, ready system, countdown, game actions,
 *          rematch, and disconnect cleanup.
 */

// ────────────────────────────────────────────────────────────────────────────
// Room Store
// ────────────────────────────────────────────────────────────────────────────
export const rooms = new Map(); // code → room object

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
const TEAMCODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateTeamCode() {
  let code;
  do {
    code = Array.from({ length: 6 }, () =>
      TEAMCODE_CHARS[Math.floor(Math.random() * TEAMCODE_CHARS.length)]
    ).join('');
  } while (rooms.has(code));
  return code;
}

function findRoom(code) {
  if (!code) return null;
  return rooms.get(code.toUpperCase().trim()) || null;
}

function getRoomsStats() {
  let inLobby = 0;
  let inGame = 0;
  for (const room of rooms.values()) {
    if (room.state === 'waiting' || room.state === 'countdown') {
      inLobby += room.players.length;
    } else if (room.state === 'playing') {
      inGame += room.players.length;
    }
  }
  return { inLobby, inGame };
}

function cleanRoom(room) {
  // Sanitize room for client broadcast (remove internal refs)
  return {
    code: room.code,
    gameId: room.gameId,
    maxPlayers: room.maxPlayers,
    state: room.state,
    settings: room.settings,
    players: room.players.map(p => ({
      socketId: p.socketId,
      displayName: p.displayName,
      color: p.color,
      ready: p.ready,
      isHost: p.isHost,
    })),
    createdAt: room.createdAt,
  };
}

function reassignHost(room) {
  if (room.players.length > 0 && !room.players.some(p => p.isHost)) {
    room.players[0].isHost = true;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Socket Event Registration
// ────────────────────────────────────────────────────────────────────────────
export function registerRoomEvents(io, socket) {

  // ── room:create ──────────────────────────────────────────────────────────
  socket.on('room:create', ({ gameId, maxPlayers = 4, settings = {} } = {}) => {
    if (!gameId) {
      socket.emit('room:error', { message: 'gameId is required to create a room.' });
      return;
    }

    const code = generateTeamCode();
    const room = {
      code,
      gameId,
      maxPlayers: Math.min(Math.max(Number(maxPlayers) || 4, 2), 4),
      players: [{
        socketId: socket.id,
        displayName: socket.playerName,
        color: socket.playerColor,
        ready: false,
        isHost: true,
      }],
      state: 'waiting',
      gameState: {},
      createdAt: Date.now(),
      settings,
      countdownTimer: null,
    };

    rooms.set(code, room);
    socket.join(code);
    socket.currentRoom = code;

    socket.emit('room:created', { code, room: cleanRoom(room) });
    console.log(`[ROOM] Created ${code} for game "${gameId}" by ${socket.playerName}`);
  });

  // ── room:join ────────────────────────────────────────────────────────────
  socket.on('room:join', ({ code, displayName } = {}) => {
    const room = findRoom(code);

    if (!room) {
      socket.emit('room:error', { message: 'Room not found. Check the code.' });
      return;
    }
    if (room.players.length >= room.maxPlayers) {
      socket.emit('room:error', { message: 'Room is full.' });
      return;
    }
    if (room.state === 'playing') {
      socket.emit('room:error', { message: 'Game already in progress.' });
      return;
    }
    if (room.players.some(p => p.socketId === socket.id)) {
      socket.emit('room:error', { message: 'You are already in this room.' });
      return;
    }

    // Update display name if provided
    if (displayName) {
      socket.playerName = displayName.slice(0, 16).replace(/[^a-zA-Z0-9_]/g, '') || socket.playerName;
    }

    const player = {
      socketId: socket.id,
      displayName: socket.playerName,
      color: socket.playerColor,
      ready: false,
      isHost: false,
    };

    room.players.push(player);
    socket.join(room.code);
    socket.currentRoom = room.code;

    socket.emit('room:joined', { room: cleanRoom(room) });
    io.to(room.code).emit('room:updated', { room: cleanRoom(room) });
    io.to(room.code).emit('room:player-joined', { displayName: socket.playerName });

    console.log(`[ROOM] ${socket.playerName} joined ${room.code}`);
  });

  // ── room:ready ───────────────────────────────────────────────────────────
  socket.on('room:ready', ({ code } = {}) => {
    const roomCode = code || socket.currentRoom;
    const room = findRoom(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    player.ready = !player.ready;

    io.to(room.code).emit('room:updated', { room: cleanRoom(room) });

    // Check if all players ready and minimum player count met
    const allReady = room.players.every(p => p.ready);
    const minPlayers = 2;

    if (allReady && room.players.length >= minPlayers && room.state === 'waiting') {
      startCountdown(io, room);
    }
  });

  // ── room:start (host force-start) ────────────────────────────────────────
  socket.on('room:start', ({ code } = {}) => {
    const roomCode = code || socket.currentRoom;
    const room = findRoom(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player || !player.isHost) {
      socket.emit('room:error', { message: 'Only the host can start the game.' });
      return;
    }
    if (room.players.length < 2) {
      socket.emit('room:error', { message: 'Need at least 2 players to start.' });
      return;
    }

    startCountdown(io, room);
  });

  // ── room:leave ───────────────────────────────────────────────────────────
  socket.on('room:leave', ({ code } = {}) => {
    const roomCode = code || socket.currentRoom;
    leaveRoom(io, socket, roomCode);
  });

  // ── room:settings (host updates settings) ────────────────────────────────
  socket.on('room:settings', ({ code, settings } = {}) => {
    const room = findRoom(code || socket.currentRoom);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player || !player.isHost) return;

    room.settings = { ...room.settings, ...settings };
    io.to(room.code).emit('room:updated', { room: cleanRoom(room) });
  });

  // ── game:action ──────────────────────────────────────────────────────────
  socket.on('game:action', ({ code, action, data } = {}) => {
    const room = findRoom(code || socket.currentRoom);
    if (!room || room.state !== 'playing') return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    // Broadcast action to all others in room (they handle it client-side)
    socket.to(room.code).emit('game:action', { socketId: socket.id, action, data });
  });

  // ── game:state-sync (authoritative state update from host) ───────────────
  socket.on('game:state-sync', ({ code, state } = {}) => {
    const room = findRoom(code || socket.currentRoom);
    if (!room || room.state !== 'playing') return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player || !player.isHost) return;

    room.gameState = state;
    socket.to(room.code).emit('game:state', { state });
  });

  // ── game:end ─────────────────────────────────────────────────────────────
  socket.on('game:end', ({ code, results } = {}) => {
    const room = findRoom(code || socket.currentRoom);
    if (!room) return;

    room.state = 'finished';
    io.to(room.code).emit('game:ended', { results, room: cleanRoom(room) });

    // Send recap with opponent info
    room.players.forEach(player => {
      const opponents = room.players
        .filter(p => p.socketId !== player.socketId)
        .map(p => ({ name: p.displayName, socketId: p.socketId, gameId: room.gameId }));

      const targetSocket = io.sockets.sockets.get(player.socketId);
      if (targetSocket) {
        targetSocket.emit('game:recap', { opponents });
      }
    });
  });

  // ── game:rematch ─────────────────────────────────────────────────────────
  socket.on('game:rematch', ({ code } = {}) => {
    const room = findRoom(code || socket.currentRoom);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player || !player.isHost) return;

    room.state = 'waiting';
    room.gameState = {};
    room.players.forEach(p => { p.ready = false; });

    io.to(room.code).emit('room:updated', { room: cleanRoom(room) });
    console.log(`[ROOM] Rematch in ${room.code}`);
  });

  // ── challenge:invite ─────────────────────────────────────────────────────
  socket.on('challenge:invite', ({ targetSocketId, gameId } = {}) => {
    const target = io.sockets.sockets.get(targetSocketId);
    if (!target) {
      socket.emit('challenge:failed', { message: 'Player is no longer online.' });
      return;
    }
    target.emit('challenge:received', {
      fromName: socket.playerName,
      fromSocketId: socket.id,
      gameId,
    });
  });

  socket.on('challenge:accept', ({ fromSocketId, gameId } = {}) => {
    const from = io.sockets.sockets.get(fromSocketId);
    if (!from) {
      socket.emit('challenge:failed', { message: 'Player is no longer online.' });
      return;
    }

    // Create room, add both
    const code = generateTeamCode();
    const room = {
      code,
      gameId,
      maxPlayers: 2,
      players: [
        {
          socketId: from.id,
          displayName: from.playerName,
          color: from.playerColor,
          ready: false,
          isHost: true,
        },
        {
          socketId: socket.id,
          displayName: socket.playerName,
          color: socket.playerColor,
          ready: false,
          isHost: false,
        },
      ],
      state: 'waiting',
      gameState: {},
      createdAt: Date.now(),
      settings: {},
      countdownTimer: null,
    };

    rooms.set(code, room);
    from.join(code);
    socket.join(code);
    from.currentRoom = code;
    socket.currentRoom = code;

    io.to(code).emit('room:joined', { room: cleanRoom(room) });
    console.log(`[ROOM] Challenge room ${code} created: ${from.playerName} vs ${socket.playerName}`);
  });

  socket.on('challenge:decline', ({ fromSocketId } = {}) => {
    const from = io.sockets.sockets.get(fromSocketId);
    if (from) {
      from.emit('challenge:declined', { byName: socket.playerName });
    }
  });

  // ── player:rename ────────────────────────────────────────────────────────
  socket.on('player:rename', ({ name } = {}) => {
    if (!name) return;
    const cleaned = name.slice(0, 16).replace(/[^a-zA-Z0-9_]/g, '');
    if (!cleaned) return;

    socket.playerName = cleaned;

    // Update name in any current room
    const room = findRoom(socket.currentRoom);
    if (room) {
      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        player.displayName = cleaned;
        io.to(room.code).emit('room:updated', { room: cleanRoom(room) });
      }
    }
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Countdown Logic
// ────────────────────────────────────────────────────────────────────────────
function startCountdown(io, room) {
  if (room.state !== 'waiting') return;

  room.state = 'countdown';

  // Clear any previous timer
  if (room.countdownTimer) clearTimeout(room.countdownTimer);

  io.to(room.code).emit('room:countdown', { seconds: 3 });

  room.countdownTimer = setTimeout(() => {
    const currentRoom = rooms.get(room.code);
    if (!currentRoom || currentRoom.state !== 'countdown') return;

    currentRoom.state = 'playing';
    currentRoom.gameState = {};

    io.to(room.code).emit('game:start', {
      room: cleanRoom(currentRoom),
      initialState: {},
    });

    console.log(`[ROOM] Game started in ${room.code}`);
  }, 3200); // small buffer after 3s countdown
}

// ────────────────────────────────────────────────────────────────────────────
// Leave / Disconnect Helper
// ────────────────────────────────────────────────────────────────────────────
export function leaveRoom(io, socket, code) {
  const room = findRoom(code);
  if (!room) return;

  const wasHost = room.players.some(p => p.socketId === socket.id && p.isHost);
  room.players = room.players.filter(p => p.socketId !== socket.id);

  socket.leave(room.code);
  if (socket.currentRoom === room.code) socket.currentRoom = null;

  if (room.players.length === 0) {
    // Clean up empty room
    if (room.countdownTimer) clearTimeout(room.countdownTimer);
    rooms.delete(room.code);
    console.log(`[ROOM] Deleted empty room ${room.code}`);
    return;
  }

  if (wasHost) reassignHost(room);

  // If game was in countdown/playing, reset to waiting
  if (room.state === 'countdown' || room.state === 'playing') {
    if (room.countdownTimer) clearTimeout(room.countdownTimer);
    room.state = 'waiting';
    room.players.forEach(p => { p.ready = false; });
  }

  io.to(room.code).emit('room:updated', { room: cleanRoom(room) });
  io.to(room.code).emit('room:player-left', { displayName: socket.playerName });

  console.log(`[ROOM] ${socket.playerName} left ${room.code} (${room.players.length} remaining)`);
}

// ────────────────────────────────────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────────────────────────────────────
export { rooms, findRoom, getRoomsStats };
