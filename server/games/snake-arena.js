/**
 * server/games/snake-arena.js — Multiplayer Snake Arena
 * Server-authoritative. 100ms tick loop. Last snake alive wins.
 */

const snakeState = new Map();
const TICK_MS    = 100;
const GRID_SIZE  = 30;
const FOOD_COUNT = 3;
const POWERUP_CHANCE = 0.03; // 3% per tick to spawn a power-up

const DIRECTIONS = {
  up:    [0, -1],
  down:  [0, 1],
  left:  [-1, 0],
  right: [1, 0],
};

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

const PLAYER_COLORS = ['#8B5CF6', '#00d4aa', '#EF4444', '#F59E0B'];

function randCell() {
  return [
    Math.floor(Math.random() * GRID_SIZE),
    Math.floor(Math.random() * GRID_SIZE),
  ];
}

function spawnSnake(index) {
  const starts = [
    [[4,4],[3,4],[2,4]],
    [[25,25],[26,25],[27,25]],
    [[4,25],[3,25],[2,25]],
    [[25,4],[26,4],[27,4]],
  ];
  const dirs = ['right', 'left', 'right', 'left'];
  return {
    body: starts[index],
    direction: dirs[index],
    pendingDir: null,
    alive: true,
    score: 0,
    roundWins: 0,
    powerup: null,      // { type, expiresAt }
    ghostUntil: null,
    speedBoostUntil: null,
  };
}

function isOccupied(state, [x, y]) {
  for (const snake of Object.values(state.snakes)) {
    if (!snake.alive) continue;
    if (snake.body.some(([sx, sy]) => sx === x && sy === y)) return true;
  }
  if (state.food.some(([fx, fy]) => fx === x && fy === y)) return true;
  return false;
}

function spawnFood(state) {
  let pos;
  let tries = 0;
  do { pos = randCell(); tries++; } while (isOccupied(state, pos) && tries < 100);
  return pos;
}

function createState(players) {
  const snakes = {};
  players.forEach((p, i) => {
    snakes[p.socketId] = { ...spawnSnake(i), color: PLAYER_COLORS[i] };
  });

  const state = {
    snakes,
    food: [],
    goldFood: null,
    powerups: [],
    tick: 0,
    round: 1,
    roundWinsNeeded: 3,
    players: players.map((p, i) => ({
      socketId: p.socketId,
      displayName: p.displayName,
      color: PLAYER_COLORS[i],
    })),
    tickInterval: null,
    goldFoodTimeout: null,
  };

  // Spawn initial food
  for (let i = 0; i < FOOD_COUNT; i++) state.food.push(spawnFood(state));

  return state;
}

function processTick(io, room, state) {
  const now = Date.now();
  state.tick++;

  // Collect head positions to detect simultaneous collisions
  const nextHeads = {};

  for (const [sid, snake] of Object.entries(state.snakes)) {
    if (!snake.alive) continue;

    // Apply pending direction (180° reversal prevented)
    if (snake.pendingDir && snake.pendingDir !== OPPOSITE[snake.direction]) {
      snake.direction = snake.pendingDir;
    }
    snake.pendingDir = null;

    const [dx, dy] = DIRECTIONS[snake.direction];
    const [hx, hy] = snake.body[0];
    nextHeads[sid] = [hx + dx, hy + dy];
  }

  for (const [sid, snake] of Object.entries(state.snakes)) {
    if (!snake.alive) continue;
    const head = nextHeads[sid];
    const [hx, hy] = head;

    // Wall collision
    if (hx < 0 || hx >= GRID_SIZE || hy < 0 || hy >= GRID_SIZE) {
      snake.alive = false;
      io.to(room.code).emit('snake:died', { socketId: sid, reason: 'wall' });
      continue;
    }

    // Ghost check
    const isGhost = snake.ghostUntil && snake.ghostUntil > now;

    if (!isGhost) {
      // Self collision
      if (snake.body.slice(1).some(([bx, by]) => bx === hx && by === hy)) {
        snake.alive = false;
        io.to(room.code).emit('snake:died', { socketId: sid, reason: 'self' });
        continue;
      }

      // Other snake body collision
      let hitOther = false;
      for (const [oid, other] of Object.entries(state.snakes)) {
        if (oid === sid || !other.alive) continue;
        const otherIsGhost = other.ghostUntil && other.ghostUntil > now;
        if (otherIsGhost) continue;
        if (other.body.some(([bx, by]) => bx === hx && by === hy)) {
          snake.alive = false;
          io.to(room.code).emit('snake:died', { socketId: sid, reason: 'snake' });
          hitOther = true;
          break;
        }
        // Head-on collision
        if (nextHeads[oid] && nextHeads[oid][0] === hx && nextHeads[oid][1] === hy) {
          snake.alive = false;
          other.alive = false;
          io.to(room.code).emit('snake:died', { socketId: sid,  reason: 'head-on' });
          io.to(room.code).emit('snake:died', { socketId: oid, reason: 'head-on' });
          break;
        }
      }
      if (hitOther) continue;
    }

    let grow = false;

    // Food collision
    const foodIdx = state.food.findIndex(([fx, fy]) => fx === hx && fy === hy);
    if (foodIdx >= 0) {
      grow = true;
      snake.score++;
      state.food.splice(foodIdx, 1);
      state.food.push(spawnFood(state));
      io.to(room.code).emit('snake:ate', { socketId: sid, newScore: snake.score });
    }

    // Gold food
    if (state.goldFood && state.goldFood[0] === hx && state.goldFood[1] === hy) {
      grow = true;
      snake.score += 3;
      state.goldFood = null;
      io.to(room.code).emit('snake:ate-gold', { socketId: sid, newScore: snake.score });
    }

    // Power-up collision
    const pIdx = state.powerups.findIndex(p => p.pos[0] === hx && p.pos[1] === hy);
    if (pIdx >= 0) {
      const pu = state.powerups.splice(pIdx, 1)[0];
      if (pu.type === 'speed')  snake.speedBoostUntil = now + 5000;
      if (pu.type === 'shrink') { const cut = Math.min(5, snake.body.length - 1); snake.body = snake.body.slice(0, snake.body.length - cut); }
      if (pu.type === 'ghost')  snake.ghostUntil = now + 3000;
      io.to(room.code).emit('snake:powerup', { socketId: sid, type: pu.type });
    }

    // Move snake
    snake.body.unshift(head);
    if (!grow) snake.body.pop();
  }

  // Spawn gold food rarely
  if (!state.goldFood && Math.random() < 0.003) {
    state.goldFood = spawnFood(state);
    state.goldFoodTimeout = setTimeout(() => { if (state.goldFood) state.goldFood = null; }, 8000);
  }

  // Spawn power-up rarely
  if (state.powerups.length < 2 && Math.random() < POWERUP_CHANCE) {
    const types = ['speed', 'shrink', 'ghost'];
    const type = types[Math.floor(Math.random() * types.length)];
    state.powerups.push({ type, pos: spawnFood(state) });
  }

  // Broadcast game tick
  const tickData = {
    snakes: Object.fromEntries(Object.entries(state.snakes).map(([id, s]) => [id, {
      body: s.body,
      direction: s.direction,
      alive: s.alive,
      score: s.score,
      ghost: s.ghostUntil && s.ghostUntil > now,
      boost: s.speedBoostUntil && s.speedBoostUntil > now,
    }])),
    food: state.food,
    goldFood: state.goldFood,
    powerups: state.powerups,
    tick: state.tick,
  };
  io.to(room.code).emit('game:tick', tickData);

  // Check alive count
  const alive = Object.entries(state.snakes).filter(([,s]) => s.alive);
  if (alive.length <= 1 && Object.keys(state.snakes).length > 1) {
    clearInterval(state.tickInterval);

    const roundWinner = alive.length === 1 ? alive[0][0] : null;
    if (roundWinner) state.snakes[roundWinner].roundWins++;

    io.to(room.code).emit('snake:round-over', {
      winner: roundWinner,
      roundWins: Object.fromEntries(Object.keys(state.snakes).map(id => [id, state.snakes[id].roundWins])),
    });

    // Check match winner
    const matchWinner = Object.entries(state.snakes).find(([,s]) => s.roundWins >= state.roundWinsNeeded);
    if (matchWinner) {
      setTimeout(() => {
        io.to(room.code).emit('game:over', {
          winner: matchWinner[0],
          finalScores: Object.fromEntries(Object.keys(state.snakes).map(id => [id, state.snakes[id].roundWins])),
        });
        snakeState.delete(room.code);
        room.state = 'waiting';
      }, 2500);
      return;
    }

    // New round after 3s
    state.round++;
    setTimeout(() => {
      if (!snakeState.has(room.code)) return;
      const wins = Object.fromEntries(Object.keys(state.snakes).map(id => [id, state.snakes[id].roundWins]));
      // Respawn snakes
      state.players.forEach((p, i) => {
        const s = spawnSnake(i);
        state.snakes[p.socketId] = { ...state.snakes[p.socketId], ...s };
      });
      state.food = [];
      for (let i = 0; i < FOOD_COUNT; i++) state.food.push(spawnFood(state));
      state.powerups = [];
      state.goldFood = null;
      state.tick = 0;

      io.to(room.code).emit('snake:new-round', { round: state.round, roundWins: wins });

      state.tickInterval = setInterval(() => processTick(io, room, state), TICK_MS);
    }, 3000);
  }
}

export function registerSnakeEvents(io, socket, rooms) {
  socket.on('snake:direction', ({ code, dir }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;
    const state = snakeState.get(room.code);
    if (!state) return;
    const snake = state.snakes[socket.id];
    if (!snake || !snake.alive) return;
    if (Object.keys(DIRECTIONS).includes(dir)) {
      snake.pendingDir = dir;
    }
  });

  socket.on('snake:ready', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;
    let state = snakeState.get(room.code);
    if (!state) {
      state = createState(room.players);
      snakeState.set(room.code, state);

      // Send initial state
      io.to(room.code).emit('snake:init', {
        snakes: Object.fromEntries(Object.entries(state.snakes).map(([id, s]) => [id, {
          body: s.body, direction: s.direction, alive: s.alive, score: 0, color: s.color,
        }])),
        food: state.food,
        players: state.players,
        gridSize: GRID_SIZE,
      });

      state.tickInterval = setInterval(() => processTick(io, room, state), TICK_MS);
    }
  });

  socket.on('disconnect', () => {
    for (const [code, state] of snakeState.entries()) {
      clearInterval(state.tickInterval);
      clearTimeout(state.goldFoodTimeout);
      if (state.players.some(p => p.socketId === socket.id)) {
        snakeState.delete(code);
      }
    }
  });
}
