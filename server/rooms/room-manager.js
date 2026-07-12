import { Room } from './room.js';
import { CONFIG } from '../config.js';

export const rooms = new Map();

// Characters: ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (Omit: I, O, 0, 1)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateTeamCode() {
  let code;
  let attempts = 0;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    }
    attempts++;
    if (attempts > 100) {
      throw new Error('Failed to generate unique room code');
    }
  } while (rooms.has(code));
  
  return code;
}

export function createRoom(gameId, mode = 'pvp', maxPlayers = 2, settings = {}) {
  const code = generateTeamCode();
  const room = new Room(code, gameId, mode, maxPlayers, settings);
  rooms.set(code, room);
  return room;
}

export function getRoom(code) {
  return rooms.get(code) || null;
}

export function deleteRoom(code) {
  rooms.delete(code);
}

// Cleanup job
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (room.state === 'WAITING' && (now - room.lastActivity > CONFIG.ROOM_INACTIVE_TIMEOUT)) {
      console.log(`[CLEANUP] Deleting inactive room ${code}`);
      rooms.delete(code);
      continue;
    }

    if (room.state === 'FINISHED' && (now - room.lastActivity > CONFIG.ROOM_FINISHED_TIMEOUT)) {
      console.log(`[CLEANUP] Deleting finished room ${code}`);
      rooms.delete(code);
      continue;
    }

    if (room.getConnectedPlayersCount() === 0 && (now - room.lastActivity > CONFIG.ROOM_DISCONNECT_TIMEOUT)) {
      console.log(`[CLEANUP] Deleting abandoned room ${code}`);
      rooms.delete(code);
      continue;
    }
  }
}, 5 * 60 * 1000); // run every 5 mins
