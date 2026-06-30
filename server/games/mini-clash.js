/**
 * server/games/mini-clash.js — Tower Rush RTS Server
 */

const clashState = new Map();
const TICK_INTERVAL_MS = 100; // 10Hz strategy update
const GAME_TIME_MS = 180000;  // 3 minutes

const TOWERS_CONFIG = {
  0: { // Bottom (Player 0)
    king:  { x: 250, y: 640, hp: 3000, maxHp: 3000, type: 'king' },
    left:  { x: 130, y: 560, hp: 1500, maxHp: 1500, type: 'crown' },
    right: { x: 370, y: 560, hp: 1500, maxHp: 1500, type: 'crown' }
  },
  1: { // Top (Player 1)
    king:  { x: 250, y: 60,  hp: 3000, maxHp: 3000, type: 'king' },
    left:  { x: 130, y: 140, hp: 1500, maxHp: 1500, type: 'crown' },
    right: { x: 370, y: 140, hp: 1500, maxHp: 1500, type: 'crown' }
  }
};

const UNITS_META = {
  grunt:  { cost: 2, hp: 80,  speed: 6.0, range: 24, damage: 8,  name: 'Grunt' },
  tank:   { cost: 4, hp: 380, speed: 2.8, range: 24, damage: 10, name: 'Tank' },
  archer: { cost: 3, hp: 100, speed: 4.2, range: 80, damage: 6,  name: 'Archer' },
  bomber: { cost: 5, hp: 60,  speed: 5.0, range: 28, damage: 55, name: 'Bomber' }
};

function createState(players) {
  const [p1, p2] = players;
  const elixirs = {
    [p1.socketId]: 4,
    [p2.socketId]: 4
  };

  const towerState = JSON.parse(JSON.stringify(TOWERS_CONFIG));

  return {
    towers: towerState,
    units: [], // { id, x, y, hp, team, type, vx, vy, targetId }
    elixir: elixirs,
    timeLeft: 180,
    playersList: players.map(p => p.socketId),
    tickInterval: null,
    lastElixirTick: Date.now()
  };
}

function updatePhysics(io, room, state) {
  state.timeLeft = Math.max(0, state.timeLeft - TICK_INTERVAL_MS / 1000);

  const now = Date.now();

  // Elixir increment every 1 second
  if (now - state.lastElixirTick >= 1000) {
    state.lastElixirTick = now;
    state.playersList.forEach(id => {
      state.elixir[id] = Math.min(10, state.elixir[id] + 1);
    });
  }

  // Update units auto combat logic
  for (let i = state.units.length - 1; i >= 0; i--) {
    const u = state.units[i];

    // Find nearest opposing target (unit or tower)
    const oppTeam = u.team === 0 ? 1 : 0;
    let closestDist = 99999;
    let target = null;
    let targetType = null; // 'unit' | 'tower'
    let targetKey = null;

    // Check opposing units
    for (const other of state.units) {
      if (other.team === oppTeam) {
        const d = Math.hypot(other.x - u.x, other.y - u.y);
        if (d < closestDist) {
          closestDist = d;
          target = other;
          targetType = 'unit';
        }
      }
    }

    // Check opposing towers
    const oppTowers = state.towers[oppTeam];
    for (const [key, t] of Object.entries(oppTowers)) {
      if (t.hp > 0) {
        const d = Math.hypot(t.x - u.x, t.y - u.y);
        if (d < closestDist) {
          closestDist = d;
          target = t;
          targetType = 'tower';
          targetKey = key;
        }
      }
    }

    if (target) {
      const meta = UNITS_META[u.type];
      if (closestDist <= meta.range) {
        // Attack!
        if (u.type === 'bomber') {
          // Explode! Deal area damage
          if (targetType === 'unit') {
            target.hp -= meta.damage;
          } else {
            target.hp = Math.max(0, target.hp - meta.damage);
          }
          // Remove bomber
          state.units.splice(i, 1);
          continue;
        }

        // Normal unit attack tick
        if (targetType === 'unit') {
          target.hp -= meta.damage;
        } else {
          target.hp = Math.max(0, target.hp - meta.damage);
        }
      } else {
        // Move towards target
        const angle = Math.atan2(target.y - u.y, target.x - u.x);
        u.x += Math.cos(angle) * meta.speed;
        u.y += Math.sin(angle) * meta.speed;
      }
    }
  }

  // Remove dead units
  state.units = state.units.filter(u => u.hp > 0);

  // Check King tower destruction (win condition)
  const p0KingDead = state.towers[0].king.hp <= 0;
  const p1KingDead = state.towers[1].king.hp <= 0;

  if (p0KingDead || p1KingDead || state.timeLeft <= 0) {
    clearInterval(state.tickInterval);
    const winnerId = p0KingDead ? state.playersList[1] : (p1KingDead ? state.playersList[0] : null);
    io.to(room.code).emit('game:over', { winner: winnerId, finalScores: null });
    clashState.delete(room.code);
    room.state = 'waiting';
  }
}

export function registerClashEvents(io, socket, rooms) {
  socket.on('clash:ready', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    let state = clashState.get(room.code);
    if (!state) {
      state = createState(room.players);
      clashState.set(room.code, state);

      state.tickInterval = setInterval(() => {
        updatePhysics(io, room, state);
        io.to(room.code).emit('clash:tick', {
          towers: state.towers,
          units: state.units,
          elixir: state.elixir,
          timeLeft: state.timeLeft
        });
      }, TICK_INTERVAL_MS);
    }
  });

  socket.on('clash:deploy', ({ code, unitType, x, y }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    const state = clashState.get(room.code);
    if (!state) return;

    const pIdx = state.playersList.indexOf(socket.id);
    if (pIdx === -1) return;

    // Validate deploy field half boundaries
    if (pIdx === 0 && y < 350) return; // Can't deploy top half
    if (pIdx === 1 && y > 350) return; // Can't deploy bottom half

    const meta = UNITS_META[unitType];
    if (meta && state.elixir[socket.id] >= meta.cost) {
      state.elixir[socket.id] -= meta.cost;
      state.units.push({
        id: Math.random().toString(36).slice(2, 9),
        x, y,
        hp: meta.hp,
        team: pIdx,
        type: unitType
      });
    }
  });

  socket.on('disconnect', () => {
    for (const [code, state] of clashState.entries()) {
      if (state.playersList.includes(socket.id)) {
        clearInterval(state.tickInterval);
        clashState.delete(code);
      }
    }
  });
}
