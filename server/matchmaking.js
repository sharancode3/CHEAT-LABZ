/**
 * matchmaking.js — Random Matchmaking Queue for CHEAT LABZ
 *
 * Players who want to play with strangers join a per-gameId queue.
 * When enough players are present, a room is auto-created.
 */
import { rooms, findRoom } from './rooms.js';

// ────────────────────────────────────────────────────────────────────────────
// Queue Store: gameId → [socketId, ...]
// ────────────────────────────────────────────────────────────────────────────
const queue = new Map();

// Minimum players needed per game (extend as games are added)
const GAME_MIN_PLAYERS = {
  'multiplayer-snake':    2,
  'battle-tetris':        2,
  'hex-wars':             2,
  'color-bomb':           4,
  'turbo-race-mp':        2,
  'battleship':           2,
  'physics-soccer':       2,
  'color-flood-duel':    2,
  'pixel-gunfight':       2,
  'mini-clash':           2,
  'ludo':                 4,
  'bomberman-arena':      4,
  'tank-battle':          4,
  'king-of-the-hill':    4,
  'top-down-racer':       4,
  'zombie-survival':      4,
  'mini-party-pack':      4,
  'capture-the-flag':     4,
  'rock-paper-scissors-tournament': 4,
  default:                2,
};

function getMinPlayers(gameId) {
  return GAME_MIN_PLAYERS[gameId] || GAME_MIN_PLAYERS.default;
}

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

function removeFromQueue(socket) {
  for (const [gameId, sockets] of queue.entries()) {
    const idx = sockets.findIndex(s => s.id === socket.id);
    if (idx !== -1) {
      sockets.splice(idx, 1);
      if (sockets.length === 0) queue.delete(gameId);
      return gameId;
    }
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Socket Event Registration
// ────────────────────────────────────────────────────────────────────────────
export function registerMatchmakingEvents(io, socket) {

  // ── matchmaking:join ─────────────────────────────────────────────────────
  socket.on('matchmaking:join', ({ gameId } = {}) => {
    if (!gameId) {
      socket.emit('matchmaking:error', { message: 'gameId is required.' });
      return;
    }

    // Remove from any existing queue first
    removeFromQueue(socket);

    // Add to this game's queue
    if (!queue.has(gameId)) queue.set(gameId, []);
    const gameQueue = queue.get(gameId);

    // Prevent double-entry
    if (gameQueue.some(s => s.id === socket.id)) return;

    gameQueue.push(socket);
    socket.matchmakingGame = gameId;

    const position = gameQueue.length;
    socket.emit('matchmaking:searching', { gameId, position, total: gameQueue.length });

    console.log(`[MATCH] ${socket.playerName} joined queue for "${gameId}" (pos ${position})`);

    // Check if we have enough players
    const needed = getMinPlayers(gameId);
    if (gameQueue.length >= needed) {
      // Pull exact number of players
      const matched = gameQueue.splice(0, needed);
      if (gameQueue.length === 0) queue.delete(gameId);

      // Create room
      const code = generateTeamCode();
      const room = {
        code,
        gameId,
        maxPlayers: needed,
        players: matched.map((s, i) => ({
          socketId: s.id,
          displayName: s.playerName,
          color: s.playerColor,
          ready: false,
          isHost: i === 0,
        })),
        state: 'waiting',
        gameState: {},
        createdAt: Date.now(),
        settings: {},
        countdownTimer: null,
      };

      rooms.set(code, room);

      // Join each matched socket to room
      for (const s of matched) {
        s.join(code);
        s.currentRoom = code;
        s.matchmakingGame = null;
      }

      // Notify all matched players
      const cleanRoom = {
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

      io.to(code).emit('matchmaking:found', { code, room: cleanRoom });

      console.log(`[MATCH] Matched ${matched.map(s => s.playerName).join(' vs ')} in room ${code}`);
    }
  });

  // ── matchmaking:cancel ───────────────────────────────────────────────────
  socket.on('matchmaking:cancel', () => {
    const gameId = removeFromQueue(socket);
    socket.matchmakingGame = null;
    socket.emit('matchmaking:cancelled', { gameId });
    if (gameId) console.log(`[MATCH] ${socket.playerName} cancelled queue for "${gameId}"`);
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Export for disconnect cleanup
// ────────────────────────────────────────────────────────────────────────────
export { removeFromQueue };
