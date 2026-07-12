import { getRoom } from '../rooms/room-manager.js';

// Currently we'll stub out the game modules until we rewrite them in Task 7
const gameHandlers = {
  // 'rps': rpsHandler,
  // 'tictactoe': tttHandler,
};

/**
 * Main game event router
 * Receives game:action { code, action, data }
 */
export function handleGameAction(io, socket, payload) {
  const { code, action, data } = payload || {};
  
  if (!code || !action) {
    socket.emit('error:game', { message: 'Missing code or action in game:action' });
    return;
  }

  const room = getRoom(code);
  if (!room) {
    socket.emit('error:game', { message: 'Room not found' });
    return;
  }

  if (room.state !== 'PLAYING') {
    socket.emit('error:game', { message: 'Game is not in PLAYING state' });
    return;
  }

  // Ensure socket is actually a player in this room
  const player = room.getPlayerBySocketId(socket.id);
  if (!player) {
    socket.emit('error:game', { message: 'You are not in this game' });
    return;
  }

  // Route to specific game logic
  const handler = gameHandlers[room.gameId];
  if (handler) {
    try {
      handler(io, room, socket, action, data);
    } catch (err) {
      console.error(`[GAME ERROR] Room ${code} - Action ${action}:`, err);
      socket.emit('error:game', { message: 'Internal game error' });
    }
  } else {
    console.warn(`[GAME MANAGER] No handler for gameId: ${room.gameId}`);
  }
}
