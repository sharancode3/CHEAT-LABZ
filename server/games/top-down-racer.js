/**
 * server/games/top-down-racer.js — Top-Down Racer Server
 */

const racerState = new Map();
const TICK_INTERVAL_MS = 16;

const TRACK_A = [
  [100, 100], [400, 80], [700, 100], [720, 250],
  [700, 400], [400, 420], [100, 400], [80, 250]
];
const TRACK_B = [
  [100, 100], [300, 150], [400, 250], [500, 350], [700, 400], [720, 250],
  [700, 100], [500, 150], [400, 250], [300, 350], [100, 400], [80, 250]
];

function createState(players) {
  const pStates = {};
  const isFigure8 = Math.random() > 0.5;
  const track = isFigure8 ? TRACK_B : TRACK_A;

  players.forEach((p, i) => {
    pStates[p.socketId] = {
      x: track[0][0] + (i * 12),
      y: track[0][1] + (i * 12),
      angle: 0,
      vx: 0,
      vy: 0,
      lap: 1,
      nextWaypoint: 1,
      offTrackTimer: 0,
      invincibleUntil: 0,
      spinUntil: 0,
      shieldUntil: 0,
      powerup: null,
      lapTimes: [],
      finished: false,
      displayName: p.displayName
    };
  });

  return {
    players: pStates,
    track,
    isTrackB: isFigure8,
    items: [
      { x: track[2][0], y: track[2][1], active: true, respawnAt: 0 },
      { x: track[5][0], y: track[5][1], active: true, respawnAt: 0 }
    ],
    shells: [],   // { x, y, vx, vy, bounces }
    bananas: [],  // { x, y }
    playersList: players.map(p => p.socketId),
    tickInterval: null,
    startTime: Date.now()
  };
}

function updatePhysics(io, room, state) {
  const now = Date.now();
  const track = state.track;

  // Update shells
  for (let i = state.shells.length - 1; i >= 0; i--) {
    const s = state.shells[i];
    s.x += s.vx;
    s.y += s.vy;

    // Bounce check boundaries
    if (s.x < 10 || s.x > 800 || s.y < 10 || s.y > 500) {
      s.bounces++;
      if (s.x < 10) { s.x = 10; s.vx *= -1; }
      if (s.x > 800) { s.x = 800; s.vx *= -1; }
      if (s.y < 10) { s.y = 10; s.vy *= -1; }
      if (s.y > 500) { s.y = 500; s.vy *= -1; }
    }

    if (s.bounces > 3) {
      state.shells.splice(i, 1);
      continue;
    }

    // Shell vs player
    for (const [id, p] of Object.entries(state.players)) {
      if (p.finished) continue;
      const dist = Math.hypot(p.x - s.x, p.y - s.y);
      if (dist < 18) {
        state.shells.splice(i, 1);
        if (now < p.shieldUntil) {
          p.shieldUntil = 0; // shield absorbed
        } else if (now > p.invincibleUntil) {
          p.spinUntil = now + 1500; // spin out 1.5s
        }
        break;
      }
    }
  }

  // Check banana collisions
  for (let i = state.bananas.length - 1; i >= 0; i--) {
    const b = state.bananas[i];
    for (const [id, p] of Object.entries(state.players)) {
      if (p.finished) continue;
      const dist = Math.hypot(p.x - b.x, p.y - b.y);
      if (dist < 18) {
        state.bananas.splice(i, 1);
        if (now < p.shieldUntil) {
          p.shieldUntil = 0;
        } else if (now > p.invincibleUntil) {
          p.spinUntil = now + 1500;
        }
        break;
      }
    }
  }

  // Update item box respawns
  for (const it of state.items) {
    if (!it.active && now >= it.respawnAt) {
      it.active = true;
    }
  }

  // Update players
  for (const [id, p] of Object.entries(state.players)) {
    if (p.finished) continue;

    p.x += p.vx;
    p.y += p.vy;

    // Apply friction
    p.vx *= 0.95;
    p.vy *= 0.95;

    // Waypoint check lap sequence
    const nextWp = track[p.nextWaypoint];
    const distWp = Math.hypot(p.x - nextWp[0], p.y - nextWp[1]);
    if (distWp < 60) {
      p.nextWaypoint = (p.nextWaypoint + 1) % track.length;
      if (p.nextWaypoint === 1) {
        // Lap increment!
        p.lapTimes.push((now - state.startTime) / 1000);
        p.lap++;
        if (p.lap > 3) {
          p.finished = true;
          // Check if race ends for everyone
          const allDone = Object.values(state.players).every(pl => pl.finished);
          if (allDone) {
            clearInterval(state.tickInterval);
            // Award winner
            const winnerId = Object.keys(state.players).sort((a,b) => {
              const la = state.players[a].lapTimes[2] || 999999;
              const lb = state.players[b].lapTimes[2] || 999999;
              return la - lb;
            })[0];

            io.to(room.code).emit('game:over', { winner: winnerId, finalScores: null });
            racerState.delete(room.code);
            room.state = 'waiting';
            return;
          }
        }
      }
    }

    // Distance off-track teleport check
    let closestDist = 9999;
    let closestIdx = 0;
    track.forEach((wp, idx) => {
      const d = Math.hypot(p.x - wp[0], p.y - wp[1]);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = idx;
      }
    });

    if (closestDist > 160) {
      p.offTrackTimer += TICK_INTERVAL_MS;
      if (p.offTrackTimer >= 4000) {
        // Teleport back
        const resetWp = track[Math.max(0, p.nextWaypoint - 1)];
        p.x = resetWp[0];
        p.y = resetWp[1];
        p.vx = 0; p.vy = 0;
        p.offTrackTimer = 0;
        p.invincibleUntil = now + 2000;
      }
    } else {
      p.offTrackTimer = 0;
    }

    // Item boxes pickup
    state.items.forEach(it => {
      if (it.active && Math.hypot(p.x - it.x, p.y - it.y) < 25) {
        it.active = false;
        it.respawnAt = now + 8000;
        const types = ['banana', 'shell', 'boost', 'shield'];
        p.powerup = types[Math.floor(Math.random() * types.length)];
      }
    });
  }
}

export function registerRacerEvents(io, socket, rooms) {
  socket.on('racer:ready', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    let state = racerState.get(room.code);
    if (!state) {
      state = createState(room.players);
      racerState.set(room.code, state);

      state.tickInterval = setInterval(() => {
        updatePhysics(io, room, state);
        io.to(room.code).emit('racer:tick', {
          players: state.players,
          items: state.items,
          shells: state.shells,
          bananas: state.bananas,
          isTrackB: state.isTrackB
        });
      }, TICK_INTERVAL_MS);
    }
  });

  socket.on('racer:input', ({ code, steer, accel, drift, usePowerup }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    const state = racerState.get(room.code);
    if (!state) return;

    const p = state.players[socket.id];
    if (!p || p.finished) return;

    const now = Date.now();
    if (now < p.spinUntil) return; // spinout lock

    // Steer angle
    if (steer === 'left') p.angle -= 0.06;
    if (steer === 'right') p.angle += 0.06;

    let speed = 0;
    if (accel === 'forward') speed = 0.4;
    if (accel === 'reverse') speed = -0.2;

    if (drift) {
      speed *= 1.25; // Drift acceleration bonus
    }

    p.vx += Math.cos(p.angle) * speed;
    p.vy += Math.sin(p.angle) * speed;

    // Use powerup
    if (usePowerup && p.powerup) {
      const type = p.powerup;
      p.powerup = null;

      if (type === 'boost') {
        p.vx += Math.cos(p.angle) * 5;
        p.vy += Math.sin(p.angle) * 5;
      } else if (type === 'shield') {
        p.shieldUntil = now + 5000;
      } else if (type === 'banana') {
        state.bananas.push({
          x: p.x - Math.cos(p.angle) * 22,
          y: p.y - Math.sin(p.angle) * 22
        });
      } else if (type === 'shell') {
        state.shells.push({
          x: p.x + Math.cos(p.angle) * 22,
          y: p.y + Math.sin(p.angle) * 22,
          vx: Math.cos(p.angle) * 6,
          vy: Math.sin(p.angle) * 6,
          bounces: 0
        });
      }
    }
  });

  socket.on('disconnect', () => {
    for (const [code, state] of racerState.entries()) {
      if (state.players[socket.id]) {
        clearInterval(state.tickInterval);
        racerState.delete(code);
      }
    }
  });
}
