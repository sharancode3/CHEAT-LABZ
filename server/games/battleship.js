/**
 * server/games/battleship.js — Multiplayer Battleship Server
 */

const battleshipState = new Map(); // roomCode -> state
const PLACEMENT_TIME_MS = 90000;
const TURN_TIME_MS      = 30000;

const SHIPS_CONFIG = [
  { name: 'Carrier',    size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser',    size: 3 },
  { name: 'Submarine',  size: 3 },
  { name: 'Destroyer',  size: 2 },
];

function createState(players) {
  const [p1, p2] = players;
  return {
    phase: 'placement', // 'placement' | 'battle' | 'finished'
    players: players.map(p => ({ socketId: p.socketId, displayName: p.displayName })),
    currentTurn: p1.socketId,
    boards: {
      [p1.socketId]: { ships: [], hits: [], misses: [], ready: false },
      [p2.socketId]: { ships: [], hits: [], misses: [], ready: false },
    },
    timers: {
      placement: null,
      turn: null
    }
  };
}

function clearTimers(state) {
  if (state.timers.placement) clearTimeout(state.timers.placement);
  if (state.timers.turn) clearTimeout(state.timers.turn);
  state.timers.placement = null;
  state.timers.turn = null;
}

function handleTurnTimeout(io, room, state) {
  const targetId = state.currentTurn;
  const oppId = state.players.find(p => p.socketId !== targetId).socketId;
  const oppBoard = state.boards[oppId];

  // Pick random coordinates that haven't been shot at
  const shots = new Set([...oppBoard.hits.map(h => `${h.x},${h.y}`), ...oppBoard.misses.map(m => `${m.x},${m.y}`)]);
  const candidates = [];
  for (let x = 0; x < 10; x++) {
    for (let y = 0; y < 10; y++) {
      if (!shots.has(`${x},${y}`)) {
        candidates.push({ x, y });
      }
    }
  }

  if (candidates.length > 0) {
    const shot = candidates[Math.floor(Math.random() * candidates.length)];
    fireShot(io, room, state, targetId, shot.x, shot.y);
  }
}

function startTurnTimer(io, room, state) {
  if (state.timers.turn) clearTimeout(state.timers.turn);
  state.timers.turn = setTimeout(() => {
    handleTurnTimeout(io, room, state);
  }, TURN_TIME_MS);
}

function fireShot(io, room, state, shooterId, x, y) {
  const oppId = state.players.find(p => p.socketId !== shooterId).socketId;
  const oppBoard = state.boards[oppId];

  // Check if hit
  let hit = false;
  let hitShip = null;
  let sunk = false;

  for (const ship of oppBoard.ships) {
    for (const cell of ship.cells) {
      if (cell.x === x && cell.y === y) {
        hit = true;
        hitShip = ship;
        break;
      }
    }
    if (hit) break;
  }

  if (hit) {
    oppBoard.hits.push({ x, y });
    // Check if sunk
    const shipHitCells = hitShip.cells.filter(c => 
      oppBoard.hits.some(h => h.x === c.x && h.y === c.y)
    );
    if (shipHitCells.length === hitShip.cells.length) {
      sunk = true;
      hitShip.sunk = true;
    }
  } else {
    oppBoard.misses.push({ x, y });
  }

  // Check game over
  const allSunk = oppBoard.ships.every(s => s.sunk);

  io.to(room.code).emit('battleship:shot-result', {
    shooterId,
    x, y,
    hit,
    sunkShip: sunk ? { name: hitShip.name, cells: hitShip.cells } : null,
    allSunk,
    currentTurn: allSunk ? null : (hit ? shooterId : oppId) // Hit gets another go
  });

  if (allSunk) {
    clearTimers(state);
    state.phase = 'finished';
    setTimeout(() => {
      io.to(room.code).emit('game:over', { winner: shooterId, finalScores: null });
      battleshipState.delete(room.code);
      room.state = 'waiting';
    }, 2000);
  } else {
    state.currentTurn = hit ? shooterId : oppId;
    startTurnTimer(io, room, state);
  }
}

export function registerBattleshipEvents(io, socket, rooms) {
  socket.on('battleship:ready', ({ code, ships }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    let state = battleshipState.get(room.code);
    if (!state) {
      state = createState(room.players);
      battleshipState.set(room.code, state);

      // Start placement phase timer
      state.timers.placement = setTimeout(() => {
        // Auto ready with whatever ships they have
        state.players.forEach(p => {
          if (!state.boards[p.socketId].ready) {
            state.boards[p.socketId].ready = true;
          }
        });
        checkAllReady();
      }, PLACEMENT_TIME_MS);
    }

    const playerBoard = state.boards[socket.id];
    if (playerBoard) {
      playerBoard.ships = ships.map(s => ({ ...s, sunk: false }));
      playerBoard.ready = true;
      io.to(room.code).emit('battleship:player-ready', { socketId: socket.id });
      checkAllReady();
    }

    function checkAllReady() {
      const allReady = state.players.every(p => state.boards[p.socketId].ready);
      if (allReady) {
        clearTimers(state);
        state.phase = 'battle';
        io.to(room.code).emit('battleship:battle-start', { currentTurn: state.currentTurn });
        startTurnTimer(io, room, state);
      }
    }
  });

  socket.on('battleship:fire', ({ code, x, y }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    const state = battleshipState.get(room.code);
    if (!state || state.phase !== 'battle') return;
    if (state.currentTurn !== socket.id) return;

    // Check if already shot there
    const oppId = state.players.find(p => p.socketId !== socket.id).socketId;
    const oppBoard = state.boards[oppId];
    const shotExists = [...oppBoard.hits, ...oppBoard.misses].some(s => s.x === x && s.y === y);
    if (shotExists) return;

    fireShot(io, room, state, socket.id, x, y);
  });

  socket.on('disconnect', () => {
    for (const [code, state] of battleshipState.entries()) {
      if (state.players.some(p => p.socketId === socket.id)) {
        clearTimers(state);
        battleshipState.delete(code);
      }
    }
  });
}
