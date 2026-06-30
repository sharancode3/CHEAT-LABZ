/**
 * server/games/king-of-the-hill.js — King of the Hill Server
 */

const kothState = new Map();
const TICK_INTERVAL_MS = 16; // 60Hz
const ARENA_SIZE = 700;
const ZONE_MOVE_INTERVAL = 17000; // moves every 17 seconds
const SCORE_TICK_INTERVAL = 1000; // checks zone every 1 second

function createState(players) {
  const pStates = {};
  const spawns = [
    { x: 150, y: 150 },
    { x: 550, y: 550 },
    { x: 150, y: 550 },
    { x: 550, y: 150 }
  ];

  players.forEach((p, i) => {
    pStates[p.socketId] = {
      x: spawns[i].x,
      y: spawns[i].y,
      vx: 0,
      vy: 0,
      radius: 20,
      score: 0,
      inZone: false
    };
  });

  return {
    players: pStates,
    zone: {
      x: ARENA_SIZE / 2,
      y: ARENA_SIZE / 2,
      radius: 90,
      moveCount: 0,
      nextMoveAt: Date.now() + ZONE_MOVE_INTERVAL
    },
    zoneHolder: null,
    timeLeft: 300,
    playersList: players.map(p => p.socketId),
    lastScoreTick: Date.now(),
    tickInterval: null
  };
}

function moveZone(state) {
  state.zone.moveCount++;
  // Shrink by 10% per move, down to 50% max shrink
  const shrinkFactor = Math.max(0.5, 1 - state.zone.moveCount * 0.1);
  state.zone.radius = 90 * shrinkFactor;

  // New random coordinates within boundaries
  const border = state.zone.radius + 50;
  state.zone.x = border + Math.random() * (ARENA_SIZE - border * 2);
  state.zone.y = border + Math.random() * (ARENA_SIZE - border * 2);
  state.zone.nextMoveAt = Date.now() + ZONE_MOVE_INTERVAL;
}

function updatePhysics(io, room, state) {
  state.timeLeft = Math.max(0, state.timeLeft - TICK_INTERVAL_MS / 1000);

  const now = Date.now();

  // Zone reposition check
  if (now >= state.zone.nextMoveAt) {
    moveZone(state);
    io.to(room.code).emit('koth:zone-moved', { zone: state.zone });
  }

  // Physics update players
  const ids = Object.keys(state.players);
  for (let i = 0; i < ids.length; i++) {
    const p = state.players[ids[i]];
    p.x += p.vx;
    p.y += p.vy;

    // Arena walls limit
    if (p.x - p.radius < 20) { p.x = p.radius + 20; p.vx *= -0.4; }
    if (p.x + p.radius > ARENA_SIZE - 20) { p.x = ARENA_SIZE - 20 - p.radius; p.vx *= -0.4; }
    if (p.y - p.radius < 20) { p.y = p.radius + 20; p.vy *= -0.4; }
    if (p.y + p.radius > ARENA_SIZE - 20) { p.y = ARENA_SIZE - 20 - p.radius; p.vy *= -0.4; }

    // Friction
    p.vx *= 0.86;
    p.vy *= 0.86;

    // Check inside zone
    const distToZone = Math.hypot(p.x - state.zone.x, p.y - state.zone.y);
    p.inZone = distToZone < state.zone.radius;
  }

  // Player circle vs Player circle collisions & pushing
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const p1 = state.players[ids[i]];
      const p2 = state.players[ids[j]];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);
      const minDist = p1.radius + p2.radius;

      if (dist < minDist) {
        // Resolve overlap
        const overlap = minDist - dist;
        const ax = dx / dist;
        const ay = dy / dist;

        p1.x -= ax * (overlap / 2);
        p1.y -= ay * (overlap / 2);
        p2.x += ax * (overlap / 2);
        p2.y += ay * (overlap / 2);

        // Elastic push force
        const force = 3.5;
        p1.vx -= ax * force;
        p1.vy -= ay * force;
        p2.vx += ax * force;
        p2.vy += ay * force;
      }
    }
  }

  // Award points every 1 second
  if (now - state.lastScoreTick >= SCORE_TICK_INTERVAL) {
    state.lastScoreTick = now;

    const playersInZone = ids.filter(id => state.players[id].inZone);
    if (playersInZone.length === 1) {
      const holderId = playersInZone[0];
      const p = state.players[holderId];
      p.score += 1;

      state.zoneHolder = holderId;

      io.to(room.code).emit('koth:point-awarded', {
        holderId,
        score: p.score
      });

      // Win limit: 30 points
      if (p.score >= 30) {
        clearInterval(state.tickInterval);
        io.to(room.code).emit('game:over', { winner: holderId, finalScores: null });
        kothState.delete(room.code);
        room.state = 'waiting';
        return;
      }
    } else {
      state.zoneHolder = null;
    }
  }

  // Win by time limit expiration
  if (state.timeLeft <= 0) {
    clearInterval(state.tickInterval);
    let maxScore = -1;
    let winnerId = null;
    for (const [id, p] of Object.entries(state.players)) {
      if (p.score > maxScore) {
        maxScore = p.score;
        winnerId = id;
      }
    }
    io.to(room.code).emit('game:over', { winner: winnerId, finalScores: null });
    kothState.delete(room.code);
    room.state = 'waiting';
  }
}

export function registerKingOfTheHillEvents(io, socket, rooms) {
  socket.on('koth:ready', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    let state = kothState.get(room.code);
    if (!state) {
      state = createState(room.players);
      kothState.set(room.code, state);

      state.tickInterval = setInterval(() => {
        updatePhysics(io, room, state);
        io.to(room.code).emit('koth:tick', {
          players: state.players,
          zone: state.zone,
          zoneHolder: state.zoneHolder,
          timeLeft: state.timeLeft
        });
      }, TICK_INTERVAL_MS);
    }
  });

  socket.on('koth:input', ({ code, up, down, left, right }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    const state = kothState.get(room.code);
    if (!state) return;

    const p = state.players[socket.id];
    if (!p) return;

    // Movement force accelerations
    const force = 0.9;
    if (left) p.vx -= force;
    if (right) p.vx += force;
    if (up) p.vy -= force;
    if (down) p.vy += force;

    // Cap velocity
    const speed = Math.hypot(p.vx, p.vy);
    const maxSpeed = 6;
    if (speed > maxSpeed) {
      p.vx = (p.vx / speed) * maxSpeed;
      p.vy = (p.vy / speed) * maxSpeed;
    }
  });

  socket.on('disconnect', () => {
    for (const [code, state] of kothState.entries()) {
      if (state.players[socket.id]) {
        clearInterval(state.tickInterval);
        kothState.delete(code);
      }
    }
  });
}
