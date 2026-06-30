/**
 * server/games/bomberman-arena.js — Multiplayer Bomberman Server
 */

const bomberState = new Map();
const TICK_INTERVAL_MS = 16; // 60Hz
const GRID_SIZE = 16;
const CELL_SIZE = 32;
const BOMB_TIMER = 2500; // 2.5 seconds fuse
const BLAST_TIMER = 500; // 0.5s duration

function generateGrid() {
  const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('EMPTY'));
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (r === 0 || r === GRID_SIZE - 1 || c === 0 || c === GRID_SIZE - 1) {
        grid[r][c] = 'HARD';
      } else if (r % 2 === 0 && c % 2 === 0) {
        grid[r][c] = 'HARD';
      } else {
        const isCorner = (r <= 2 && c <= 2) || 
                         (r <= 2 && c >= GRID_SIZE - 3) ||
                         (r >= GRID_SIZE - 3 && c <= 2) ||
                         (r >= GRID_SIZE - 3 && c >= GRID_SIZE - 3);
        if (!isCorner && Math.random() < 0.45) {
          grid[r][c] = 'SOFT';
        }
      }
    }
  }
  return grid;
}

const SPAWNS = [
  { x: 1.5 * CELL_SIZE, y: 1.5 * CELL_SIZE },
  { x: 14.5 * CELL_SIZE, y: 14.5 * CELL_SIZE },
  { x: 1.5 * CELL_SIZE, y: 14.5 * CELL_SIZE },
  { x: 14.5 * CELL_SIZE, y: 1.5 * CELL_SIZE },
];

function createState(players) {
  const grid = generateGrid();
  const pStates = {};

  players.forEach((p, i) => {
    pStates[p.socketId] = {
      x: SPAWNS[i].x,
      y: SPAWNS[i].y,
      alive: true,
      bombsMax: 1,
      bombsPlaced: 0,
      bombRange: 2,
      speed: 2.2, // pixels per tick
      color: ['#EF4444', '#10B981', '#F59E0B', '#3B82F6'][i],
      displayName: p.displayName
    };
  });

  return {
    grid,
    players: pStates,
    bombs: [],   // { x, y, gridX, gridY, placedAt, owner, range }
    blasts: [],  // { cells: [[gx,gy]...], startedAt }
    powerups: [], // { type: 'bomb'|'range'|'speed', gridX, gridY }
    playersList: players.map(p => p.socketId),
    tickInterval: null
  };
}

function checkCollision(grid, x, y) {
  const radius = 10;
  const cellsToCheck = [
    { r: Math.floor((y - radius) / CELL_SIZE), c: Math.floor((x - radius) / CELL_SIZE) },
    { r: Math.floor((y - radius) / CELL_SIZE), c: Math.floor((x + radius) / CELL_SIZE) },
    { r: Math.floor((y + radius) / CELL_SIZE), c: Math.floor((x - radius) / CELL_SIZE) },
    { r: Math.floor((y + radius) / CELL_SIZE), c: Math.floor((x + radius) / CELL_SIZE) },
  ];

  for (const cell of cellsToCheck) {
    if (cell.r < 0 || cell.r >= GRID_SIZE || cell.c < 0 || cell.c >= GRID_SIZE) return true;
    const type = grid[cell.r][cell.c];
    if (type === 'HARD' || type === 'SOFT') return true;
  }
  return false;
}

function processBombDetonation(io, state, bomb) {
  const blastCells = [[bomb.gridX, bomb.gridY]];
  const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]]; // Up, Down, Left, Right

  directions.forEach(([dc, dr]) => {
    for (let d = 1; d <= bomb.range; d++) {
      const nr = bomb.gridY + dr * d;
      const nc = bomb.gridX + dc * d;

      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) break;

      const type = state.grid[nr][nc];
      if (type === 'HARD') {
        break; // Stops immediately
      } else if (type === 'SOFT') {
        // Destroy soft wall
        state.grid[nr][nc] = 'EMPTY';
        blastCells.push([nc, nr]);

        // Powerup spawn chance
        if (Math.random() < 0.35) {
          const types = ['bomb', 'range', 'speed'];
          state.powerups.push({
            type: types[Math.floor(Math.random() * types.length)],
            gridX: nc,
            gridY: nr
          });
        }
        break; // Stops here after hitting soft block
      } else {
        blastCells.push([nc, nr]);
      }
    }
  });

  state.blasts.push({
    cells: blastCells,
    startedAt: Date.now()
  });

  // Re-enable owner's bomb limit
  const owner = state.players[bomb.owner];
  if (owner) owner.bombsPlaced = Math.max(0, owner.bombsPlaced - 1);
}

function updatePhysics(io, room, state) {
  const now = Date.now();

  // 1. Decapsulate expired bombs
  for (let i = state.bombs.length - 1; i >= 0; i--) {
    const bomb = state.bombs[i];
    if (now - bomb.placedAt >= BOMB_TIMER) {
      state.bombs.splice(i, 1);
      processBombDetonation(io, state, bomb);
    }
  }

  // 2. Clear expired blasts
  for (let i = state.blasts.length - 1; i >= 0; i--) {
    const blast = state.blasts[i];
    if (now - blast.startedAt >= BLAST_TIMER) {
      state.blasts.splice(i, 1);
    }
  }

  // 3. Check blast kills
  for (const blast of state.blasts) {
    for (const [id, p] of Object.entries(state.players)) {
      if (!p.alive) continue;
      const pgx = Math.floor(p.x / CELL_SIZE);
      const pgy = Math.floor(p.y / CELL_SIZE);

      const inBlast = blast.cells.some(([bx, by]) => bx === pgx && by === pgy);
      if (inBlast) {
        p.alive = false;
        io.to(room.code).emit('bomberman:player-died', { socketId: id });
      }
    }
  }

  // 4. Check Win condition (last one standing)
  const aliveList = Object.keys(state.players).filter(id => state.players[id].alive);
  if (aliveList.length <= 1) {
    clearInterval(state.tickInterval);
    const winnerId = aliveList[0] || null;
    io.to(room.code).emit('game:over', { winner: winnerId, finalScores: null });
    bomberState.delete(room.code);
    room.state = 'waiting';
  }
}

export function registerBombermanEvents(io, socket, rooms) {
  socket.on('bomberman:ready', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    let state = bomberState.get(room.code);
    if (!state) {
      state = createState(room.players);
      bomberState.set(room.code, state);

      state.tickInterval = setInterval(() => {
        updatePhysics(io, room, state);
        io.to(room.code).emit('bomberman:tick', {
          grid: state.grid,
          players: state.players,
          bombs: state.bombs,
          blasts: state.blasts,
          powerups: state.powerups
        });
      }, TICK_INTERVAL_MS);
    }
  });

  socket.on('bomberman:input', ({ code, up, down, left, right, placeBomb }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    const state = bomberState.get(room.code);
    if (!state) return;

    const p = state.players[socket.id];
    if (!p || !p.alive) return;

    let dx = 0;
    let dy = 0;
    if (left) dx = -p.speed;
    if (right) dx = p.speed;
    if (up) dy = -p.speed;
    if (down) dy = p.speed;

    // Try moving x then y independently for smooth corner sliding
    if (dx !== 0 && !checkCollision(state.grid, p.x + dx, p.y)) {
      p.x += dx;
    }
    if (dy !== 0 && !checkCollision(state.grid, p.x, p.y + dy)) {
      p.y += dy;
    }

    // Pick powerup if on top of it
    const pgx = Math.floor(p.x / CELL_SIZE);
    const pgy = Math.floor(p.y / CELL_SIZE);
    const pupIdx = state.powerups.findIndex(pu => pu.gridX === pgx && pu.gridY === pgy);
    if (pupIdx >= 0) {
      const pu = state.powerups[pupIdx];
      if (pu.type === 'bomb') p.bombsMax++;
      if (pu.type === 'range') p.bombRange++;
      if (pu.type === 'speed') p.speed += 0.5;
      state.powerups.splice(pupIdx, 1);
    }

    // Bomb placing
    if (placeBomb && p.bombsPlaced < p.bombsMax) {
      const bgx = Math.floor(p.x / CELL_SIZE);
      const bgy = Math.floor(p.y / CELL_SIZE);

      // Check if grid already has a bomb
      const bombExists = state.bombs.some(b => b.gridX === bgx && b.gridY === bgy);
      if (!bombExists) {
        state.bombs.push({
          x: bgx * CELL_SIZE + CELL_SIZE/2,
          y: bgy * CELL_SIZE + CELL_SIZE/2,
          gridX: bgx,
          gridY: bgy,
          placedAt: Date.now(),
          owner: socket.id,
          range: p.bombRange
        });
        p.bombsPlaced++;
      }
    }
  });

  socket.on('disconnect', () => {
    for (const [code, state] of bomberState.entries()) {
      if (state.players[socket.id]) {
        clearInterval(state.tickInterval);
        bomberState.delete(code);
      }
    }
  });
}
