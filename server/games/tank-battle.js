/**
 * server/games/tank-battle.js — Tank Battle Server
 */

const tankState = new Map();
const TICK_INTERVAL_MS = 16; // 60Hz
const ARENA_SIZE = 700;
const BULLET_SPEED = 5; // Pixels per tick
const BOMB_TIMER = 3000; // 3s respawn
const GAME_TIME_MS = 300000; // 5 min

// Static wall configurations for 3 layouts
const LAYOUTS = [
  // Layout 0: Center block + 4 corner columns
  [
    { x: 300, y: 300, w: 100, h: 100 },
    { x: 120, y: 120, w: 60, h: 60 },
    { x: 520, y: 120, w: 60, h: 60 },
    { x: 120, y: 520, w: 60, h: 60 },
    { x: 520, y: 520, w: 60, h: 60 }
  ],
  // Layout 1: Large cross
  [
    { x: 100, y: 320, w: 180, h: 60 },
    { x: 420, y: 320, w: 180, h: 60 },
    { x: 320, y: 100, w: 60, h: 180 },
    { x: 320, y: 420, w: 60, h: 180 }
  ],
  // Layout 2: Maze-like pillars
  [
    { x: 200, y: 100, w: 60, h: 180 },
    { x: 440, y: 100, w: 60, h: 180 },
    { x: 200, y: 420, w: 60, h: 180 },
    { x: 440, y: 420, w: 60, h: 180 },
    { x: 320, y: 320, w: 60, h: 60 }
  ]
];

function createState(players, layoutIndex) {
  const pStates = {};
  const spawns = [
    { x: 80, y: 80, angle: 0 },
    { x: 620, y: 620, angle: Math.PI },
    { x: 80, y: 620, angle: -Math.PI/2 },
    { x: 620, y: 80, angle: Math.PI/2 }
  ];

  players.forEach((p, i) => {
    pStates[p.socketId] = {
      x: spawns[i].x,
      y: spawns[i].y,
      angle: spawns[i].angle,
      turretAngle: spawns[i].angle,
      health: 3,
      alive: true,
      kills: 0,
      deaths: 0,
      streak: 0,
      cooldown: 0,
      respawnTimer: 0,
      displayName: p.displayName
    };
  });

  return {
    tanks: pStates,
    bullets: [], // { x, y, vx, vy, bounceCount, ownerId }
    walls: LAYOUTS[layoutIndex],
    timeLeft: 300, // 5 minutes
    playersList: players.map(p => p.socketId),
    tickInterval: null
  };
}

function checkAABBCircleCollision(rect, cx, cy, r) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const distanceX = cx - closestX;
  const distanceY = cy - closestY;
  const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
  return distanceSquared < (r * r);
}

function updatePhysics(io, room, state) {
  state.timeLeft = Math.max(0, state.timeLeft - TICK_INTERVAL_MS / 1000);

  // Update tanks
  for (const [id, t] of Object.entries(state.tanks)) {
    if (!t.alive) {
      t.respawnTimer -= TICK_INTERVAL_MS;
      if (t.respawnTimer <= 0) {
        t.alive = true;
        t.health = 3;
        t.x = 80 + Math.random() * (ARENA_SIZE - 160);
        t.y = 80 + Math.random() * (ARENA_SIZE - 160);
      }
      continue;
    }

    if (t.cooldown > 0) t.cooldown = Math.max(0, t.cooldown - TICK_INTERVAL_MS);
  }

  // Update bullets
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx;
    b.y += b.vy;

    // Boundary check / bounce
    let remove = false;
    if (b.x < 10 || b.x > ARENA_SIZE - 10) {
      b.vx *= -1;
      b.bounceCount++;
    }
    if (b.y < 10 || b.y > ARENA_SIZE - 10) {
      b.vy *= -1;
      b.bounceCount++;
    }

    // Wall collision / bounce
    for (const w of state.walls) {
      if (checkAABBCircleCollision(w, b.x, b.y, 4)) {
        // Simple reflection based on where it hit
        const fromLeft = b.x < w.x;
        const fromRight = b.x > w.x + w.w;
        const fromTop = b.y < w.y;
        const fromBottom = b.y > w.y + w.h;

        if (fromLeft || fromRight) b.vx *= -1;
        if (fromTop || fromBottom) b.vy *= -1;

        b.bounceCount++;
        break;
      }
    }

    if (b.bounceCount > 1) remove = true;

    // Bullet vs Tank collision
    if (!remove) {
      for (const [id, t] of Object.entries(state.tanks)) {
        if (!t.alive) continue;
        const dist = Math.hypot(t.x - b.x, t.y - b.y);
        if (dist < 18) { // Hit!
          t.health -= 1;
          remove = true;

          // Apply small knockback
          t.x += (b.vx / BULLET_SPEED) * 8;
          t.y += (b.vy / BULLET_SPEED) * 8;

          io.to(room.code).emit('tank:hit', { socketId: id, health: t.health });

          if (t.health <= 0) {
            t.alive = false;
            t.deaths++;
            t.streak = 0;
            t.respawnTimer = BOMB_TIMER;

            // Award killer
            const killer = state.tanks[b.ownerId];
            if (killer) {
              killer.kills++;
              killer.streak++;
              io.to(room.code).emit('tank:kill', {
                killerId: b.ownerId,
                victimId: id,
                streak: killer.streak
              });
            }
          }
          break;
        }
      }
    }

    // Bullet vs Bullet collision
    if (!remove) {
      for (let j = i - 1; j >= 0; j--) {
        const b2 = state.bullets[j];
        if (Math.hypot(b.x - b2.x, b.y - b2.y) < 8) {
          state.bullets.splice(i, 1);
          state.bullets.splice(j, 1);
          remove = true;
          break;
        }
      }
    }

    if (remove) {
      state.bullets.splice(i, 1);
    }
  }

  // Win condition: time expired
  if (state.timeLeft <= 0) {
    clearInterval(state.tickInterval);
    let maxKills = -1;
    let winnerId = null;
    for (const [id, t] of Object.entries(state.tanks)) {
      if (t.kills > maxKills) {
        maxKills = t.kills;
        winnerId = id;
      }
    }
    io.to(room.code).emit('game:over', { winner: winnerId, finalScores: null });
    tankState.delete(room.code);
    room.state = 'waiting';
  }
}

export function registerTankBattleEvents(io, socket, rooms) {
  socket.on('tank:ready', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    let state = tankState.get(room.code);
    if (!state) {
      // Pick random layout out of 3
      const layoutIdx = Math.floor(Math.random() * 3);
      state = createState(room.players, layoutIdx);
      tankState.set(room.code, state);

      state.tickInterval = setInterval(() => {
        updatePhysics(io, room, state);
        io.to(room.code).emit('tank:tick', {
          tanks: state.tanks,
          bullets: state.bullets,
          walls: state.walls,
          timeLeft: state.timeLeft
        });
      }, TICK_INTERVAL_MS);
    }
  });

  socket.on('tank:input', ({ code, up, down, left, right, fire, turretAngle }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    const state = tankState.get(room.code);
    if (!state) return;

    const t = state.tanks[socket.id];
    if (!t || !t.alive) return;

    // Movement (A/D rotate tank, W/S forward/backward)
    if (left) t.angle -= 0.05;
    if (right) t.angle += 0.05;

    let speed = 0;
    if (up) speed = 2.5;
    if (down) speed = -1.5;

    if (speed !== 0) {
      const nextX = t.x + Math.cos(t.angle) * speed;
      const nextY = t.y + Math.sin(t.angle) * speed;

      // Collide with boundary
      let collides = nextX < 18 || nextX > ARENA_SIZE - 18 || nextY < 18 || nextY > ARENA_SIZE - 18;

      // Collide with walls
      if (!collides) {
        for (const w of state.walls) {
          if (checkAABBCircleCollision(w, nextX, nextY, 18)) {
            collides = true;
            break;
          }
        }
      }

      if (!collides) {
        t.x = nextX;
        t.y = nextY;
      }
    }

    // Update turret aim angle
    if (typeof turretAngle === 'number') {
      t.turretAngle = turretAngle;
    }

    // Firing logic
    if (fire && t.cooldown === 0) {
      t.cooldown = 500; // 0.5s cooldown
      state.bullets.push({
        x: t.x + Math.cos(t.turretAngle) * 22,
        y: t.y + Math.sin(t.turretAngle) * 22,
        vx: Math.cos(t.turretAngle) * BULLET_SPEED,
        vy: Math.sin(t.turretAngle) * BULLET_SPEED,
        bounceCount: 0,
        ownerId: socket.id
      });
    }
  });

  socket.on('disconnect', () => {
    for (const [code, state] of tankState.entries()) {
      if (state.tanks[socket.id]) {
        clearInterval(state.tickInterval);
        tankState.delete(code);
      }
    }
  });
}
