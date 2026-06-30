/**
 * server/games/capture-the-flag.js — Capture The Flag Server
 */

const ctfState = new Map();
const TICK_INTERVAL_MS = 16;
const MAP_W = 800;
const MAP_H = 500;

function createState(players) {
  const pStates = {};
  const teams = [0, 0, 1, 1]; // 2v2 split

  players.forEach((p, i) => {
    const team = teams[i % 4];
    pStates[p.socketId] = {
      x: team === 0 ? 80 : 720,
      y: 250 + (i % 2 === 0 ? -40 : 40),
      vx: 0,
      vy: 0,
      radius: 16,
      team,
      hp: 3,
      alive: true,
      respawnTimer: 0,
      invincibleUntil: Date.now() + 2000,
      hasFlag: false,
      ammo: 3,
      reloadTimer: 0,
      shootCooldown: 0,
      displayName: p.displayName
    };
  });

  return {
    players: pStates,
    flags: [
      { team: 0, x: 60, y: 250, status: 'base', carrierId: null, dropX: null, dropY: null, dropTimer: 0 },
      { team: 1, x: 740, y: 250, status: 'base', carrierId: null, dropX: null, dropY: null, dropTimer: 0 }
    ],
    bullets: [], // { x, y, vx, vy, team, ownerId }
    teamScores: [0, 0],
    timeLeft: 180, // 3 minutes
    playersList: players.map(p => p.socketId),
    tickInterval: null
  };
}

function resetFlagsAndPositions(state) {
  state.flags[0] = { team: 0, x: 60, y: 250, status: 'base', carrierId: null, dropX: null, dropY: null, dropTimer: 0 };
  state.flags[1] = { team: 1, x: 740, y: 250, status: 'base', carrierId: null, dropX: null, dropY: null, dropTimer: 0 };

  const ids = Object.keys(state.players);
  ids.forEach((id, i) => {
    const p = state.players[id];
    p.x = p.team === 0 ? 80 : 720;
    p.y = 250 + (i % 2 === 0 ? -40 : 40);
    p.vx = 0; p.vy = 0;
    p.hp = 3;
    p.alive = true;
    p.hasFlag = false;
    p.invincibleUntil = Date.now() + 2000;
  });
}

function updatePhysics(io, room, state) {
  state.timeLeft = Math.max(0, state.timeLeft - TICK_INTERVAL_MS / 1000);
  const now = Date.now();

  // Update players
  for (const [id, p] of Object.entries(state.players)) {
    if (!p.alive) {
      p.respawnTimer -= TICK_INTERVAL_MS;
      if (p.respawnTimer <= 0) {
        p.alive = true;
        p.hp = 3;
        p.x = p.team === 0 ? 80 : 720;
        p.y = 250;
        p.invincibleUntil = now + 2000;
      }
      continue;
    }

    if (p.reloadTimer > 0) {
      p.reloadTimer -= TICK_INTERVAL_MS;
      if (p.reloadTimer <= 0) {
        p.ammo = 3;
      }
    }

    if (p.shootCooldown > 0) p.shootCooldown = Math.max(0, p.shootCooldown - TICK_INTERVAL_MS);

    // Apply movement
    p.x += p.vx;
    p.y += p.vy;

    // Friction
    p.vx *= 0.88;
    p.vy *= 0.88;

    // Boundary cap
    if (p.x - p.radius < 20) { p.x = p.radius + 20; p.vx *= -0.3; }
    if (p.x + p.radius > MAP_W - 20) { p.x = MAP_W - 20 - p.radius; p.vx *= -0.3; }
    if (p.y - p.radius < 20) { p.y = p.radius + 20; p.vy *= -0.3; }
    if (p.y + p.radius > MAP_H - 20) { p.y = MAP_H - 20 - p.radius; p.vy *= -0.3; }

    // Flag capture overlap check
    state.flags.forEach(f => {
      if (f.team !== p.team) {
        // Opponent flag
        if (f.status === 'base' || f.status === 'dropped') {
          const fx = f.status === 'base' ? f.x : f.dropX;
          const fy = f.status === 'base' ? f.y : f.dropY;

          if (Math.hypot(p.x - fx, p.y - fy) < p.radius + 15) {
            f.status = 'carried';
            f.carrierId = id;
            p.hasFlag = true;
            io.to(room.code).emit('ctf:announcement', { text: `${p.displayName.toUpperCase()} TOOK THE FLAG!` });
          }
        }
      } else {
        // Own flag
        if (f.status === 'dropped') {
          if (Math.hypot(p.x - f.dropX, p.y - f.dropY) < p.radius + 15) {
            f.status = 'base';
            f.dropTimer = 0;
            io.to(room.code).emit('ctf:announcement', { text: 'YOUR FLAG WAS RETURNED!' });
          }
        } else if (f.status === 'base') {
          // Check if carrying opponent flag to score!
          const oppFlag = state.flags.find(fl => fl.team !== p.team);
          if (oppFlag && oppFlag.carrierId === id) {
            // Score!
            state.teamScores[p.team]++;
            io.to(room.code).emit('ctf:announcement', { text: `TEAM ${p.team === 0 ? 'BLUE' : 'RED'} SCORED!` });

            if (state.teamScores[p.team] >= 3) {
              clearInterval(state.tickInterval);
              // End game
              const winnerId = state.playersList.find(x => state.players[x].team === p.team);
              io.to(room.code).emit('game:over', { winner: winnerId, finalScores: state.teamScores });
              ctfState.delete(room.code);
              room.state = 'waiting';
              return;
            } else {
              resetFlagsAndPositions(state);
            }
          }
        }
      }
    });
  }

  // Update flags dropped timer
  state.flags.forEach(f => {
    if (f.status === 'dropped') {
      f.dropTimer += TICK_INTERVAL_MS;
      if (f.dropTimer >= 10000) { // 10s auto return
        f.status = 'base';
        f.dropTimer = 0;
        io.to(room.code).emit('ctf:announcement', { text: 'FLAG AUTO-RETURNED TO BASE!' });
      }
    } else if (f.status === 'carried') {
      const carrier = state.players[f.carrierId];
      if (carrier) {
        f.x = carrier.x;
        f.y = carrier.y;
      }
    }
  });

  // Update bullets
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx;
    b.y += b.vy;

    // Boundaries
    if (b.x < 0 || b.x > MAP_W || b.y < 0 || b.y > MAP_H) {
      state.bullets.splice(i, 1);
      continue;
    }

    // Bullet vs player
    let hit = false;
    for (const [id, p] of Object.entries(state.players)) {
      if (!p.alive || now < p.invincibleUntil || p.team === b.team) continue;

      if (Math.hypot(p.x - b.x, p.y - b.y) < p.radius + 4) {
        p.hp = Math.max(0, p.hp - 1);
        hit = true;

        if (p.hp <= 0) {
          p.alive = false;
          p.respawnTimer = 5000; // 5s respawn

          // Drop flag if carrying
          if (p.hasFlag) {
            p.hasFlag = false;
            const carryFlag = state.flags.find(f => f.carrierId === id);
            if (carryFlag) {
              carryFlag.status = 'dropped';
              carryFlag.carrierId = null;
              carryFlag.dropX = p.x;
              carryFlag.dropY = p.y;
              carryFlag.dropTimer = 0;
              io.to(room.code).emit('ctf:announcement', { text: 'THE FLAG WAS DROPPED!' });
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

  // Time expired win check
  if (state.timeLeft <= 0) {
    clearInterval(state.tickInterval);
    const winTeam = state.teamScores[0] > state.teamScores[1] ? 0 : (state.teamScores[1] > state.teamScores[0] ? 1 : null);
    const winnerId = winTeam !== null ? state.playersList.find(x => state.players[x].team === winTeam) : null;
    io.to(room.code).emit('game:over', { winner: winnerId, finalScores: state.teamScores });
    ctfState.delete(room.code);
    room.state = 'waiting';
  }
}

export function registerCtfEvents(io, socket, rooms) {
  socket.on('ctf:ready', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    let state = ctfState.get(room.code);
    if (!state) {
      state = createState(room.players);
      ctfState.set(room.code, state);

      state.tickInterval = setInterval(() => {
        updatePhysics(io, room, state);
        io.to(room.code).emit('ctf:tick', {
          players: state.players,
          flags: state.flags,
          bullets: state.bullets,
          scores: state.teamScores,
          timeLeft: state.timeLeft
        });
      }, TICK_INTERVAL_MS);
    }
  });

  socket.on('ctf:input', ({ code, up, down, left, right, shoot, aimAngle, melee }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    const state = ctfState.get(room.code);
    if (!state) return;

    const p = state.players[socket.id];
    if (!p || !p.alive) return;

    // Movement (Carrying flag slows player by 15%)
    const currentSpeed = p.hasFlag ? 2.5 * 0.85 : 2.5;

    if (left) p.vx -= currentSpeed;
    if (right) p.vx += currentSpeed;
    if (up) p.vy -= currentSpeed;
    if (down) p.vy += currentSpeed;

    // Cap velocity
    const speed = Math.hypot(p.vx, p.vy);
    const maxSpeed = p.hasFlag ? 4.5 * 0.85 : 4.5;
    if (speed > maxSpeed) {
      p.vx = (p.vx / speed) * maxSpeed;
      p.vy = (p.vy / speed) * maxSpeed;
    }

    // Shoot projectile
    if (shoot && p.shootCooldown === 0 && p.ammo > 0 && p.reloadTimer === 0) {
      p.shootCooldown = 400; // 0.4s cooldown
      p.ammo--;

      state.bullets.push({
        x: p.x + Math.cos(aimAngle) * 20,
        y: p.y + Math.sin(aimAngle) * 20,
        vx: Math.cos(aimAngle) * 5.0,
        vy: Math.sin(aimAngle) * 5.0,
        team: p.team,
        ownerId: socket.id
      });

      if (p.ammo <= 0) {
        p.reloadTimer = 2000; // 2s reload
      }
    }

    // Melee swing hit pushes opponents
    if (melee) {
      for (const [id, opp] of Object.entries(state.players)) {
        if (id !== socket.id && opp.alive && opp.team !== p.team) {
          const dist = Math.hypot(opp.x - p.x, opp.y - p.y);
          if (dist < 38) {
            // Push back
            const angle = Math.atan2(opp.y - p.y, opp.x - p.x);
            opp.vx += Math.cos(angle) * 7.5;
            opp.vy += Math.sin(angle) * 7.5;
          }
        }
      }
    }
  });

  socket.on('disconnect', () => {
    for (const [code, state] of ctfState.entries()) {
      if (state.players[socket.id]) {
        clearInterval(state.tickInterval);
        ctfState.delete(code);
      }
    }
  });
}
