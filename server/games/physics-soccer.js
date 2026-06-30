/**
 * server/games/physics-soccer.js — Physics Soccer Server
 */

const soccerState = new Map();
const TICK_INTERVAL_MS = 16; // ~60Hz
const FIELD_W = 800;
const FIELD_H = 500;
const GOAL_H  = 120;
const GOAL_Y1 = (FIELD_H - GOAL_H)/2;
const GOAL_Y2 = GOAL_Y1 + GOAL_H;

function createState(players) {
  const [p1, p2] = players;
  const pStates = {
    [p1.socketId]: { x: 200, y: FIELD_H/2, vx: 0, vy: 0, radius: 20, team: 0, boostCooldown: 0, boostActive: 0, powerup: null },
    [p2.socketId]: { x: 600, y: FIELD_H/2, vx: 0, vy: 0, radius: 20, team: 1, boostCooldown: 0, boostActive: 0, powerup: null }
  };

  return {
    ball: { x: FIELD_W/2, y: FIELD_H/2, vx: 0, vy: 0, radius: 15 },
    players: pStates,
    scores: [0, 0],
    timeLeft: 180,
    phase: 'playing', // 'playing' | 'goal_scored' | 'finished'
    goalResetTimer: 0,
    powerup: null, // { type: 'speed'|'magnet'|'kick', x, y, radius: 12, spawnedAt }
    lastPowerupSpawn: Date.now(),
    playersList: players.map((p, i) => ({ socketId: p.socketId, displayName: p.displayName, team: i % 2 }))
  };
}

function resetPositions(state) {
  state.ball = { x: FIELD_W/2, y: FIELD_H/2, vx: 0, vy: 0, radius: 15 };
  const ids = Object.keys(state.players);
  if (ids[0]) state.players[ids[0]] = { ...state.players[ids[0]], x: 200, y: FIELD_H/2, vx: 0, vy: 0 };
  if (ids[1]) state.players[ids[1]] = { ...state.players[ids[1]], x: 600, y: FIELD_H/2, vx: 0, vy: 0 };
}

function spawnPowerup(state) {
  const types = ['speed', 'magnet', 'kick'];
  state.powerup = {
    type: types[Math.floor(Math.random() * types.length)],
    x: FIELD_W/4 + Math.random() * (FIELD_W/2),
    y: 100 + Math.random() * (FIELD_H - 200),
    radius: 12,
    spawnedAt: Date.now()
  };
  state.lastPowerupSpawn = Date.now();
}

function updatePhysics(state) {
  const ball = state.ball;

  // Update timers
  if (state.phase === 'goal_scored') {
    state.goalResetTimer -= TICK_INTERVAL_MS / 1000;
    if (state.goalResetTimer <= 0) {
      state.phase = 'playing';
      resetPositions(state);
    }
  }

  // Time limit countdown
  state.timeLeft = Math.max(0, state.timeLeft - TICK_INTERVAL_MS / 1000);

  // Spawns power-up every 45s
  if (Date.now() - state.lastPowerupSpawn >= 45000 && !state.powerup && state.phase === 'playing') {
    spawnPowerup(state);
  }

  // Update players
  for (const [id, p] of Object.entries(state.players)) {
    // Apply boost timers
    if (p.boostActive > 0) p.boostActive = Math.max(0, p.boostActive - TICK_INTERVAL_MS);
    if (p.boostCooldown > 0) p.boostCooldown = Math.max(0, p.boostCooldown - TICK_INTERVAL_MS);

    // Apply active powerup decays
    if (p.powerup) {
      p.powerup.expiresAt -= TICK_INTERVAL_MS;
      if (p.powerup.expiresAt <= 0) p.powerup = null;
    }

    // Move player
    p.x += p.vx;
    p.y += p.vy;

    // Friction
    p.vx *= 0.98;
    p.vy *= 0.98;

    // Boundaries check
    if (p.x - p.radius < 0) { p.x = p.radius; p.vx *= -0.5; }
    if (p.x + p.radius > FIELD_W) { p.x = FIELD_W - p.radius; p.vx *= -0.5; }
    if (p.y - p.radius < 0) { p.y = p.radius; p.vy *= -0.5; }
    if (p.y + p.radius > FIELD_H) { p.y = FIELD_H - p.radius; p.vy *= -0.5; }

    // Check powerup collection
    if (state.powerup) {
      const dist = Math.hypot(p.x - state.powerup.x, p.y - state.powerup.y);
      if (dist < p.radius + state.powerup.radius) {
        p.powerup = {
          type: state.powerup.type,
          expiresAt: state.powerup.type === 'speed' ? 8000 : (state.powerup.type === 'magnet' ? 5000 : 999999) // Kick is next kick
        };
        state.powerup = null;
      }
    }
  }

  // Update ball (only if in play)
  if (state.phase === 'playing') {
    ball.x += ball.vx;
    ball.y += ball.vy;

    ball.vx *= 0.99;
    ball.vy *= 0.99;

    // Wall reflections
    // Goal areas
    const insideLeftGoalX  = ball.x - ball.radius < 10;
    const insideRightGoalX = ball.x + ball.radius > FIELD_W - 10;
    const insideGoalY      = ball.y > GOAL_Y1 && ball.y < GOAL_Y2;

    if (insideGoalY) {
      // Net collisions
      if (ball.x - ball.radius < 0) {
        // Goal team 1
        state.scores[1]++;
        state.phase = 'goal_scored';
        state.goalResetTimer = 3.0;
        ball.vx = 0; ball.vy = 0;
      } else if (ball.x + ball.radius > FIELD_W) {
        // Goal team 0
        state.scores[0]++;
        state.phase = 'goal_scored';
        state.goalResetTimer = 3.0;
        ball.vx = 0; ball.vy = 0;
      }
    } else {
      // Normal wall bounces
      if (ball.x - ball.radius < 10) { ball.x = 10 + ball.radius; ball.vx *= -0.8; }
      if (ball.x + ball.radius > FIELD_W - 10) { ball.x = FIELD_W - 10 - ball.radius; ball.vx *= -0.8; }
    }

    if (ball.y - ball.radius < 10) { ball.y = 10 + ball.radius; ball.vy *= -0.8; }
    if (ball.y + ball.radius > FIELD_H - 10) { ball.y = FIELD_H - 10 - ball.radius; ball.vy *= -0.8; }

    // Magnet powerup attraction
    for (const [id, p] of Object.entries(state.players)) {
      if (p.powerup?.type === 'magnet') {
        const dx = p.x - ball.x;
        const dy = p.y - ball.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 10) {
          ball.vx += (dx / dist) * 0.4;
          ball.vy += (dy / dist) * 0.4;
        }
      }
    }

    // Player vs ball collision
    for (const [id, p] of Object.entries(state.players)) {
      const dx = ball.x - p.x;
      const dy = ball.y - p.y;
      const dist = Math.hypot(dx, dy);
      const minDist = p.radius + ball.radius;

      if (dist < minDist) {
        // Resolve overlap
        const overlap = minDist - dist;
        ball.x += (dx / dist) * overlap;

        // Apply kick velocity
        let force = 6;
        if (p.powerup?.type === 'kick') {
          force = 18;
          p.powerup = null; // Consume
        }

        const angle = Math.atan2(dy, dx);
        ball.vx = Math.cos(angle) * force + p.vx * 0.8;
        ball.vy = Math.sin(angle) * force + p.vy * 0.8;
      }
    }
  }
}

export function registerSoccerEvents(io, socket, rooms) {
  socket.on('soccer:ready', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    let state = soccerState.get(room.code);
    if (!state) {
      state = createState(room.players);
      soccerState.set(room.code, state);

      state.tickInterval = setInterval(() => {
        updatePhysics(state);

        io.to(room.code).emit('soccer:tick', {
          ball: state.ball,
          players: state.players,
          scores: state.scores,
          timeLeft: state.timeLeft,
          phase: state.phase,
          powerup: state.powerup
        });

        if (state.timeLeft <= 0 && state.phase === 'playing') {
          clearInterval(state.tickInterval);
          state.phase = 'finished';
          const winnerId = state.scores[0] > state.scores[1] ? state.playersList[0].socketId
                         : state.scores[1] > state.scores[0] ? state.playersList[1].socketId
                         : null;
          io.to(room.code).emit('game:over', { winner: winnerId, finalScores: state.scores });
          soccerState.delete(room.code);
          room.state = 'waiting';
        }
      }, TICK_INTERVAL_MS);
    }
  });

  socket.on('soccer:input', ({ code, up, down, left, right, boost }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    const state = soccerState.get(room.code);
    if (!state) return;

    const p = state.players[socket.id];
    if (!p) return;

    // Apply force based on input
    let speed = 0.8;
    if (p.powerup?.type === 'speed') speed = 1.3;

    if (boost && p.boostCooldown === 0) {
      p.boostActive = 500; // 0.5s active
      p.boostCooldown = 3000; // 3s cooldown
    }

    const currentSpeed = p.boostActive > 0 ? speed * 2.2 : speed;

    if (left) p.vx -= currentSpeed;
    if (right) p.vx += currentSpeed;
    if (up) p.vy -= currentSpeed;
    if (down) p.vy += currentSpeed;

    // Cap velocity
    const vMag = Math.hypot(p.vx, p.vy);
    const maxV = p.boostActive > 0 ? 12 : (p.powerup?.type === 'speed' ? 8 : 5.5);
    if (vMag > maxV) {
      p.vx = (p.vx / vMag) * maxV;
      p.vy = (p.vy / vMag) * maxV;
    }
  });

  socket.on('disconnect', () => {
    for (const [code, state] of soccerState.entries()) {
      if (state.players[socket.id]) {
        clearInterval(state.tickInterval);
        soccerState.delete(code);
      }
    }
  });
}
