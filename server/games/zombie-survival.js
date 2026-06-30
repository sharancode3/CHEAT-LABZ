/**
 * server/games/zombie-survival.js — Co-op Zombie Wave Survival
 */

const zombieState = new Map();
const TICK_INTERVAL_MS = 16;
const ARENA_SIZE = 700;

function createState(players) {
  const pStates = {};
  players.forEach((p) => {
    pStates[p.socketId] = {
      x: 350 + (Math.random() - 0.5) * 100,
      y: 350 + (Math.random() - 0.5) * 100,
      hp: 5,
      alive: true,
      weapon: 'pistol',
      ammo: 9999,
      grenades: 2,
      dashCooldown: 0,
      dashActive: 0,
      reviveProgress: 0, // ms spent reviving
      displayName: p.displayName
    };
  });

  return {
    players: pStates,
    zombies: [], // { x, y, hp, maxHp, speed, type, targetId, shootCooldown }
    drops: [],   // { type, x, y }
    bullets: [], // { x, y, vx, vy, ownerId, damage }
    grenades: [], // { x, y, tx, ty, progress, ownerId }
    blasts: [],   // { x, y, radius, expiresAt }
    wave: 1,
    phase: 'fighting', // 'fighting' | 'break'
    breakTimer: 0,
    zombiesSpawned: 0,
    zombiesToSpawn: 5,
    lastSpawnTime: 0,
    killsCount: 0,
    playersList: players.map(p => p.socketId),
    tickInterval: null
  };
}

function spawnZombie(state) {
  const wave = state.wave;
  const isBoss = (wave % 5 === 0);

  let hp = 3 + Math.floor(wave * 0.5);
  let speed = 0.9 + (wave * 0.05);
  let type = 'normal';

  if (isBoss) {
    hp = 25 + wave * 5;
    speed = 0.5;
    type = 'boss';
  } else {
    const roll = Math.random();
    if (roll < 0.2) {
      type = 'runner';
      hp = 1;
      speed = 1.8;
    } else if (roll < 0.35) {
      type = 'tank';
      hp = 8 + wave;
      speed = 0.45;
    } else if (roll < 0.45) {
      type = 'spitter';
      hp = 2 + Math.floor(wave * 0.2);
      speed = 0.8;
    }
  }

  // Spawn on borders
  let x = 0, y = 0;
  if (Math.random() > 0.5) {
    x = Math.random() > 0.5 ? 20 : ARENA_SIZE - 20;
    y = Math.random() * ARENA_SIZE;
  } else {
    x = Math.random() * ARENA_SIZE;
    y = Math.random() > 0.5 ? 20 : ARENA_SIZE - 20;
  }

  state.zombies.push({
    x, y,
    hp,
    maxHp: hp,
    speed,
    type,
    targetId: state.playersList[Math.floor(Math.random() * state.playersList.length)],
    shootCooldown: 0
  });
  state.zombiesSpawned++;
  state.lastSpawnTime = Date.now();
}

function updateWaveState(state) {
  const now = Date.now();

  if (state.phase === 'break') {
    state.breakTimer -= TICK_INTERVAL_MS;
    if (state.breakTimer <= 0) {
      state.phase = 'fighting';
      state.wave++;
      state.zombiesToSpawn = 5 + (state.wave * 3);
      state.zombiesSpawned = 0;
      state.zombies = [];
      // Heals living slightly
      for (const p of Object.values(state.players)) {
        if (p.alive) p.hp = Math.min(5, p.hp + 1);
      }
    }
    return;
  }

  // Spawn logic
  if (state.zombiesSpawned < state.zombiesToSpawn && now - state.lastSpawnTime >= Math.max(1000, 3000 - state.wave * 150)) {
    spawnZombie(state);
  }

  // Transition to break if all dead
  if (state.zombiesSpawned >= state.zombiesToSpawn && state.zombies.length === 0) {
    state.phase = 'break';
    state.breakTimer = 5000; // 5s break
  }
}

function updatePhysics(io, room, state) {
  const now = Date.now();
  updateWaveState(state);

  // Check Game Over (all dead)
  const anyAlive = Object.values(state.players).some(p => p.hp > 0);
  if (!anyAlive) {
    clearInterval(state.tickInterval);
    io.to(room.code).emit('game:over', { winner: null, finalScores: { kills: state.killsCount } });
    zombieState.delete(room.code);
    room.state = 'waiting';
    return;
  }

  // Update players
  for (const [id, p] of Object.entries(state.players)) {
    if (p.hp <= 0) {
      p.alive = false;
      // Revive progress checking
      let beingRevived = false;
      for (const [oid, opp] of Object.entries(state.players)) {
        if (oid !== id && opp.alive && Math.hypot(p.x - opp.x, p.y - opp.y) < 40) {
          beingRevived = true;
          break;
        }
      }
      if (beingRevived) {
        p.reviveProgress += TICK_INTERVAL_MS;
        if (p.reviveProgress >= 3000) { // 3s
          p.alive = true;
          p.hp = 2; // revive with 2 hp
          p.reviveProgress = 0;
        }
      } else {
        p.reviveProgress = Math.max(0, p.reviveProgress - TICK_INTERVAL_MS * 0.5);
      }
      continue;
    }

    if (p.dashCooldown > 0) p.dashCooldown = Math.max(0, p.dashCooldown - TICK_INTERVAL_MS);
    if (p.dashActive > 0) p.dashActive = Math.max(0, p.dashActive - TICK_INTERVAL_MS);
  }

  // Update bullets
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx;
    b.y += b.vy;

    // Boundary check
    if (b.x < 0 || b.x > ARENA_SIZE || b.y < 0 || b.y > ARENA_SIZE) {
      state.bullets.splice(i, 1);
      continue;
    }

    // Bullet vs Zombie check
    let hit = false;
    for (let j = state.zombies.length - 1; j >= 0; j--) {
      const z = state.zombies[j];
      if (Math.hypot(z.x - b.x, z.y - b.y) < 16) {
        z.hp -= b.damage;
        hit = true;

        if (z.hp <= 0) {
          state.zombies.splice(j, 1);
          state.killsCount++;

          // Explode tank zombie
          if (z.type === 'tank') {
            state.blasts.push({ x: z.x, y: z.y, radius: 60, expiresAt: now + 500 });
          }

          // Upgrade Drop chance
          if (Math.random() < 0.25) {
            const types = ['shotgun', 'machinegun', 'grenade', 'medkit'];
            state.drops.push({
              type: types[Math.floor(Math.random() * types.length)],
              x: z.x,
              y: z.y
            });
          }
        }
        break;
      }
    }

    if (hit) {
      state.bullets.splice(i, 1);
    }
  }

  // Update grenades
  for (let i = state.grenades.length - 1; i >= 0; i--) {
    const g = state.grenades[i];
    g.progress += 0.04;
    g.x = g.x + (g.tx - g.x) * g.progress;
    g.y = g.y + (g.ty - g.y) * g.progress;

    if (g.progress >= 1.0) {
      state.grenades.splice(i, 1);
      state.blasts.push({ x: g.tx, y: g.ty, radius: 80, expiresAt: now + 500 });
    }
  }

  // Update blasts (explode damage)
  for (let i = state.blasts.length - 1; i >= 0; i--) {
    const bl = state.blasts[i];
    if (now >= bl.expiresAt) {
      state.blasts.splice(i, 1);
      continue;
    }

    // Blast hits players
    for (const [id, p] of Object.entries(state.players)) {
      if (p.alive && p.dashActive <= 0 && Math.hypot(p.x - bl.x, p.y - bl.y) < bl.radius) {
        p.hp = Math.max(0, p.hp - 1);
      }
    }

    // Blast hits zombies
    for (let j = state.zombies.length - 1; j >= 0; j--) {
      const z = state.zombies[j];
      if (Math.hypot(z.x - bl.x, z.y - bl.y) < bl.radius) {
        z.hp -= 4; // heavy blast damage
        if (z.hp <= 0) {
          state.zombies.splice(j, 1);
          state.killsCount++;
        }
      }
    }
  }

  // Update Zombie AI
  for (let i = state.zombies.length - 1; i >= 0; i--) {
    const z = state.zombies[i];

    // Pick closest living player
    let closestDist = 99999;
    let target = null;
    for (const [id, p] of Object.entries(state.players)) {
      if (!p.alive) continue;
      const dist = Math.hypot(p.x - z.x, p.y - z.y);
      if (dist < closestDist) {
        closestDist = dist;
        target = p;
      }
    }

    if (target) {
      const angle = Math.atan2(target.y - z.y, target.x - z.x);
      z.x += Math.cos(angle) * z.speed;
      z.y += Math.sin(angle) * z.speed;

      // Contact damage logic
      if (closestDist < 16 && target.dashActive <= 0) {
        if (!z.lastDamageTime || now - z.lastDamageTime >= 1000) {
          target.hp = Math.max(0, target.hp - 1);
          z.lastDamageTime = now;
        }
      }

      // Spitter fire
      if (z.type === 'spitter') {
        if (z.shootCooldown > 0) z.shootCooldown = Math.max(0, z.shootCooldown - TICK_INTERVAL_MS);
        if (z.shootCooldown === 0 && closestDist < 180) {
          z.shootCooldown = 2000; // 2s cooldown
          // Fire spitting bullet at player
          state.bullets.push({
            x: z.x, y: z.y,
            vx: Math.cos(angle) * 3.5,
            vy: Math.sin(angle) * 3.5,
            ownerId: 'zombie',
            damage: 1
          });
        }
      }
    }
  }

  // Pick drops
  for (const [id, p] of Object.entries(state.players)) {
    if (!p.alive) continue;
    for (let i = state.drops.length - 1; i >= 0; i--) {
      const d = state.drops[i];
      if (Math.hypot(p.x - d.x, p.y - d.y) < 20) {
        state.drops.splice(i, 1);
        if (d.type === 'medkit') {
          p.hp = Math.min(5, p.hp + 2);
        } else if (d.type === 'grenade') {
          p.grenades = Math.min(5, p.grenades + 1);
        } else {
          p.weapon = d.type;
          p.ammo = d.type === 'shotgun' ? 3 : 20;
        }
      }
    }
  }
}

export function registerZombieEvents(io, socket, rooms) {
  socket.on('zombie:ready', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    let state = zombieState.get(room.code);
    if (!state) {
      state = createState(room.players);
      zombieState.set(room.code, state);

      state.tickInterval = setInterval(() => {
        updatePhysics(io, room, state);
        io.to(room.code).emit('zombie:tick', {
          players: state.players,
          zombies: state.zombies,
          drops: state.drops,
          bullets: state.bullets,
          grenades: state.grenades,
          blasts: state.blasts,
          wave: state.wave,
          phase: state.phase,
          kills: state.killsCount,
          breakTime: state.breakTimer
        });
      }, TICK_INTERVAL_MS);
    }
  });

  socket.on('zombie:input', ({ code, dx, dy, shoot, aimAngle, dash, grenade }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    const state = zombieState.get(room.code);
    if (!state) return;

    const p = state.players[socket.id];
    if (!p || !p.alive) return;

    // Movement
    let speed = 2.0;
    if (p.dashActive > 0) speed = 5.0; // Dash speed boost

    if (typeof dx === 'number' && typeof dy === 'number') {
      const nextX = p.x + dx * speed;
      const nextY = p.y + dy * speed;

      // Arena borders
      if (nextX > 20 && nextX < ARENA_SIZE - 20) p.x = nextX;
      if (nextY > 20 && nextY < ARENA_SIZE - 20) p.y = nextY;
    }

    // Dash activate
    if (dash && p.dashCooldown === 0) {
      p.dashActive = 800; // 0.8s dash
      p.dashCooldown = 3000; // 3s cooldown
    }

    // Throw Grenade
    if (grenade && p.grenades > 0) {
      p.grenades--;
      const targetX = p.x + Math.cos(aimAngle) * 120;
      const targetY = p.y + Math.sin(aimAngle) * 120;
      state.grenades.push({
        x: p.x,
        y: p.y,
        tx: targetX,
        ty: targetY,
        progress: 0,
        ownerId: socket.id
      });
    }

    // Shoot
    if (shoot && typeof aimAngle === 'number') {
      let canShoot = false;
      let damage = 1;
      let bulletSpeed = 6;

      if (p.weapon === 'pistol') {
        if (!p.lastShootTime || Date.now() - p.lastShootTime >= 400) {
          canShoot = true;
          p.lastShootTime = Date.now();
        }
      } else if (p.weapon === 'machinegun') {
        if (p.ammo > 0 && (!p.lastShootTime || Date.now() - p.lastShootTime >= 120)) {
          canShoot = true;
          p.ammo--;
          p.lastShootTime = Date.now();
          if (p.ammo <= 0) p.weapon = 'pistol'; // Revert
        }
      } else if (p.weapon === 'shotgun') {
        if (p.ammo > 0 && (!p.lastShootTime || Date.now() - p.lastShootTime >= 800)) {
          canShoot = true;
          p.ammo--;
          p.lastShootTime = Date.now();

          // Spread 3 bullets
          const spreads = [-0.18, 0, 0.18];
          spreads.forEach(sp => {
            state.bullets.push({
              x: p.x + Math.cos(aimAngle + sp) * 16,
              y: p.y + Math.sin(aimAngle + sp) * 16,
              vx: Math.cos(aimAngle + sp) * 5.5,
              vy: Math.sin(aimAngle + sp) * 5.5,
              ownerId: socket.id,
              damage: 2
            });
          });
          if (p.ammo <= 0) p.weapon = 'pistol';
          return; // Avoid basic push
        }
      }

      if (canShoot) {
        state.bullets.push({
          x: p.x + Math.cos(aimAngle) * 16,
          y: p.y + Math.sin(aimAngle) * 16,
          vx: Math.cos(aimAngle) * bulletSpeed,
          vy: Math.sin(aimAngle) * bulletSpeed,
          ownerId: socket.id,
          damage
        });
      }
    }
  });

  socket.on('disconnect', () => {
    for (const [code, state] of zombieState.entries()) {
      if (state.players[socket.id]) {
        clearInterval(state.tickInterval);
        zombieState.delete(code);
      }
    }
  });
}
