/**
 * server/games/pixel-gunfight.js — Side-scroller Platform Deathmatch
 */

const gunfightState = new Map();
const TICK_INTERVAL_MS = 16; // 60Hz
const ARENA_W = 600;
const ARENA_H = 500;
const GRAVITY = 0.35;

// Wall/Platform boxes: { x, y, w, h }
const PLATFORMS = [
  { x: 0,   y: 460, w: 600, h: 40 }, // Ground floor
  { x: 120, y: 340, w: 140, h: 12 }, // Mid left
  { x: 340, y: 340, w: 140, h: 12 }, // Mid right
  { x: 200, y: 220, w: 200, h: 12 }, // Top center
];

function createState(players) {
  const [p1, p2] = players;
  const pStates = {
    [p1.socketId]: { x: 100, y: 150, vx: 0, vy: 0, hp: 3, alive: true, kills: 0, facing: 'right', jumpsLeft: 2, dodgeCooldown: 0, dodgeActive: 0, width: 24, height: 32 },
    [p2.socketId]: { x: 500, y: 150, vx: 0, vy: 0, hp: 3, alive: true, kills: 0, facing: 'left', jumpsLeft: 2, dodgeCooldown: 0, dodgeActive: 0, width: 24, height: 32 }
  };

  return {
    players: pStates,
    bullets: [], // { x, y, vx, ownerId }
    playersList: players.map(p => p.socketId),
    tickInterval: null
  };
}

function updatePlayerPhysics(p) {
  // Apply gravity
  p.vy += GRAVITY;

  // Horizontal motion damp
  p.vx *= 0.85;

  p.x += p.vx;
  p.y += p.vy;

  // Keep inside arena horizontal boundaries
  if (p.x - p.width/2 < 10) { p.x = 10 + p.width/2; p.vx = 0; }
  if (p.x + p.width/2 > ARENA_W - 10) { p.x = ARENA_W - 10 - p.width/2; p.vx = 0; }

  // Check platforms collisions (landing on top)
  let onGround = false;
  for (const plat of PLATFORMS) {
    // Check if player falls through the top of the platform
    const prevY = p.y - p.vy;
    if (
      p.x + p.width/2 > plat.x &&
      p.x - p.width/2 < plat.x + plat.w &&
      prevY + p.height <= plat.y &&
      p.y + p.height >= plat.y
    ) {
      // Land
      p.y = plat.y - p.height;
      p.vy = 0;
      p.jumpsLeft = 2; // Restore jumps
      onGround = true;
      break;
    }
  }

  // Fall off bottom edge respawn
  if (p.y > ARENA_H) {
    p.x = ARENA_W / 2;
    p.y = 80;
    p.vx = 0; p.vy = 0;
    p.hp = Math.max(0, p.hp - 1);
  }
}

function updatePhysics(io, room, state) {
  const now = Date.now();

  // Update players
  for (const [id, p] of Object.entries(state.players)) {
    if (!p.alive) continue;

    if (p.dodgeCooldown > 0) p.dodgeCooldown = Math.max(0, p.dodgeCooldown - TICK_INTERVAL_MS);
    if (p.dodgeActive > 0) p.dodgeActive = Math.max(0, p.dodgeActive - TICK_INTERVAL_MS);

    updatePlayerPhysics(p);

    if (p.hp <= 0) {
      p.alive = false;
      // Respawn in 2.5s
      setTimeout(() => {
        if (!gunfightState.has(room.code)) return;
        p.alive = true;
        p.hp = 3;
        p.x = ARENA_W / 2;
        p.y = 80;
        io.to(room.code).emit('gunfight:respawned', { socketId: id });
      }, 2500);
    }
  }

  // Update bullets
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx;

    // Out of boundaries
    if (b.x < 0 || b.x > ARENA_W) {
      state.bullets.splice(i, 1);
      continue;
    }

    // Bullet vs Player
    let hit = false;
    for (const [id, p] of Object.entries(state.players)) {
      if (!p.alive || p.dodgeActive > 0 || id === b.ownerId) continue;

      if (
        b.x > p.x - p.width/2 &&
        b.x < p.x + p.width/2 &&
        b.y > p.y &&
        b.y < p.y + p.height
      ) {
        // Bullet hit!
        p.hp = Math.max(0, p.hp - 1);
        hit = true;

        // Check headshot (top 8 pixels of character)
        const isHeadshot = (b.y <= p.y + 8);

        io.to(room.code).emit('gunfight:hit', { socketId: id, headshot: isHeadshot, hp: p.hp });

        if (p.hp <= 0) {
          const killer = state.players[b.ownerId];
          if (killer) {
            killer.kills++;
            if (killer.kills >= 10) {
              // End game
              clearInterval(state.tickInterval);
              io.to(room.code).emit('game:over', { winner: b.ownerId, finalScores: null });
              gunfightState.delete(room.code);
              room.state = 'waiting';
              return;
            }
          }
        }
        break;
      }
    }

    if (hit) {
      state.bullets.splice(i, 1);
    }
  }
}

export function registerGunfightEvents(io, socket, rooms) {
  socket.on('gunfight:ready', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    let state = gunfightState.get(room.code);
    if (!state) {
      state = createState(room.players);
      gunfightState.set(room.code, state);

      state.tickInterval = setInterval(() => {
        updatePhysics(io, room, state);
        io.to(room.code).emit('gunfight:tick', {
          players: state.players,
          bullets: state.bullets,
          platforms: PLATFORMS
        });
      }, TICK_INTERVAL_MS);
    }
  });

  socket.on('gunfight:input', ({ code, left, right, jump, shoot, dodge }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    const state = gunfightState.get(room.code);
    if (!state) return;

    const p = state.players[socket.id];
    if (!p || !p.alive) return;

    // Left/Right walking
    if (left) {
      p.vx = -3.2;
      p.facing = 'left';
    }
    if (right) {
      p.vx = 3.2;
      p.facing = 'right';
    }

    // Jumping (up to double jump)
    if (jump && p.jumpsLeft > 0) {
      p.vy = -6.8;
      p.jumpsLeft--;
    }

    // Dodge roll
    if (dodge && p.dodgeCooldown === 0) {
      p.dodgeActive = 500; // 0.5s roll
      p.dodgeCooldown = 1500; // 1.5s cooldown
      p.vx = p.facing === 'left' ? -6 : 6;
    }

    // Shoot bullet
    if (shoot) {
      // Max 3 bullets on screen per player
      const count = state.bullets.filter(b => b.ownerId === socket.id).length;
      if (count < 3) {
        state.bullets.push({
          x: p.x + (p.facing === 'left' ? -18 : 18),
          y: p.y + 12,
          vx: p.facing === 'left' ? -7 : 7,
          ownerId: socket.id
        });
      }
    }
  });

  socket.on('disconnect', () => {
    for (const [code, state] of gunfightState.entries()) {
      if (state.players[socket.id]) {
        clearInterval(state.tickInterval);
        gunfightState.delete(code);
      }
    }
  });
}
