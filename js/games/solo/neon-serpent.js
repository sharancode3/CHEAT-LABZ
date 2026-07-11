import { GameBase } from '../../core/game-base.js';

class NeonSerpent extends GameBase {
  static logicalWidth = 540;
  static logicalHeight = 540;

  init() {
    this.gridCols = 27;
    this.gridRows = 27;
    this.cellSize = 20;

    // Reset state
    this.snake = [
      { x: 13, y: 13 },
      { x: 12, y: 13 },
      { x: 11, y: 13 }
    ];
    this.currentDir = { x: 1, y: 0 };
    this.queuedDir = null;
    this.lives = 3;
    this.score = 0;
    this.isOver = false;

    this.accumulator = 0;
    this.TICK_MS = 130;

    this.foodItems = []; // Array of food objects: { x, y, type, timeTotal, timeLeft, rot }
    this.walls = []; // Array of { x, y }
    this.movingWall = null; // { x, y, dx, minX, maxX }
    this.portals = []; // Array of { a: { x, y }, b: { x, y } }
    this.particles = []; // Array of particles on eating
    this.deathFlashTime = 0; // for death flash animation
    this.eatMouthTimer = 0; // mouth open display timer
    this.totalTime = 0;

    this.setupLevel();
    this.spawnFood();
  }

  setupLevel() {
    this.walls = [];
    this.portals = [];
    this.movingWall = null;
    this.gridCols = 27;
    this.gridRows = 27;

    const lvl = this.level;

    // Level 1: target 100, empty grid
    // Level 2: target 150, 4 corners
    if (lvl === 2) {
      this.addWallBlock(2, 2);
      this.addWallBlock(23, 2);
      this.addWallBlock(2, 23);
      this.addWallBlock(23, 23);
    }

    // Level 3: target 200, cross shape in center
    if (lvl === 3) {
      const cx = 13, cy = 13;
      for (let i = -2; i <= 2; i++) {
        if (i !== 0) {
          this.walls.push({ x: cx + i, y: cy });
          this.walls.push({ x: cx, y: cy + i });
        }
      }
    }

    // Level 4: target 280, diagonal wall lines
    if (lvl === 4) {
      for (let i = 4; i <= 8; i++) {
        this.walls.push({ x: i, y: i });
        this.walls.push({ x: 26 - i, y: i });
      }
    }

    // Level 5: target 350, maze corridors
    if (lvl === 5) {
      this.buildMaze();
    }

    // Level 6: target 450, moving wall
    if (lvl === 6) {
      this.movingWall = { x: 13, y: 8, dx: 1, minX: 5, maxX: 21 };
    }

    // Level 7: target 550, portals
    if (lvl === 7) {
      this.portals.push({ a: { x: 0, y: 13 }, b: { x: 26, y: 13 } });
      this.portals.push({ a: { x: 13, y: 0 }, b: { x: 13, y: 26 } });
    }

    // Level 8: target 680, portals + walls
    if (lvl === 8) {
      this.portals.push({ a: { x: 0, y: 13 }, b: { x: 26, y: 13 } });
      this.walls.push({ x: 13, y: 5 }, { x: 13, y: 6 }, { x: 13, y: 20 }, { x: 13, y: 21 });
    }

    // Level 9: target 820, shrunk grid
    if (lvl === 9) {
      this.gridCols = 24;
      this.gridRows = 24;
      // Portal pairs
      this.portals.push({ a: { x: 1, y: 12 }, b: { x: 22, y: 12 } });
    }

    // Level 10: target 1000, portal + moving + maze
    if (lvl === 10) {
      this.buildMaze();
      this.movingWall = { x: 13, y: 5, dx: 1, minX: 6, maxX: 20 };
      this.portals.push({ a: { x: 0, y: 13 }, b: { x: 26, y: 13 } });
    }
  }

  addWallBlock(startX, startY) {
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        this.walls.push({ x: startX + x, y: startY + y });
      }
    }
  }

  buildMaze() {
    // Maze corridors along outer quadrants
    for (let i = 5; i <= 21; i++) {
      if (i !== 13) {
        this.walls.push({ x: i, y: 6 });
        this.walls.push({ x: i, y: 20 });
      }
    }
  }

  spawnFood() {
    // Build occupied cells set
    const occupied = new Set();
    this.snake.forEach(s => occupied.add(`${s.x},${s.y}`));
    this.walls.forEach(w => occupied.add(`${w.x},${w.y}`));
    this.portals.forEach(p => {
      occupied.add(`${p.a.x},${p.a.y}`);
      occupied.add(`${p.b.x},${p.b.y}`);
    });
    if (this.movingWall) {
      occupied.add(`${this.movingWall.x},${this.movingWall.y}`);
    }

    // Shrink grid bounding box
    const startX = this.level === 9 ? 1 : 0;
    const endX = this.level === 9 ? 23 : this.gridCols - 1;
    const startY = this.level === 9 ? 1 : 0;
    const endY = this.level === 9 ? 23 : this.gridRows - 1;

    const available = [];
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        if (!occupied.has(`${x},${y}`)) {
          available.push({ x, y });
        }
      }
    }

    if (available.length === 0) return;

    // Filter foodItems that are active and remove expired ones
    this.foodItems = this.foodItems.filter(f => f.timeLeft > 0 || f.type === 'regular');

    const foodCountNeeded = (this.level === 5 || this.level === 6 || this.level === 9 || this.level === 10) ? 2 : 1;
    
    while (this.foodItems.length < foodCountNeeded && available.length > 0) {
      const idx = this.rand(0, available.length - 1);
      const cell = available.splice(idx, 1)[0];

      let type = 'regular';
      let timeLimit = 0;

      // Determine food type based on level rules
      const roll = Math.random();
      if (this.level === 3) {
        type = 'fast';
        timeLimit = 8000;
      } else if (this.level === 4) {
        type = 'fast';
        timeLimit = 6000;
      } else if (this.level === 8 || this.level === 9 || this.level === 10) {
        // 1 in 3 chance poison
        if (roll < 0.33) {
          type = 'poison';
        } else if (roll < 0.5) {
          type = 'golden';
        }
      } else if (this.level === 5 || this.level === 6) {
        if (roll < 0.25) {
          type = 'golden';
        }
      }

      this.foodItems.push({
        x: cell.x,
        y: cell.y,
        type,
        timeTotal: timeLimit,
        timeLeft: timeLimit,
        rot: 0
      });
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    this.totalTime += delta;
    if (this.deathFlashTime > 0) {
      this.deathFlashTime = Math.max(0, this.deathFlashTime - delta);
    }
    if (this.eatMouthTimer > 0) {
      this.eatMouthTimer = Math.max(0, this.eatMouthTimer - delta);
    }

    // Input buffering (check opposite direction)
    const inp = this.input;
    let nextDir = null;

    if (inp.wasPressedAny(['ArrowUp', 'w', 'W'])) nextDir = { x: 0, y: -1 };
    else if (inp.wasPressedAny(['ArrowDown', 's', 'S'])) nextDir = { x: 0, y: 1 };
    else if (inp.wasPressedAny(['ArrowLeft', 'a', 'A'])) nextDir = { x: -1, y: 0 };
    else if (inp.wasPressedAny(['ArrowRight', 'd', 'D'])) nextDir = { x: 1, y: 0 };

    if (nextDir) {
      const opposite = (this.currentDir.x + nextDir.x === 0 && this.currentDir.y + nextDir.y === 0);
      if (!opposite) {
        this.queuedDir = nextDir;
      }
    }

    // Food decay tracking
    const isDecaying = (this.level === 4 || this.level === 5 || this.level === 6 || this.level === 7 || this.level === 8 || this.level === 10);
    this.foodItems.forEach(f => {
      if (f.type === 'fast') {
        f.timeLeft -= delta;
      } else if (isDecaying) {
        if (f.timeTotal === 0) {
          f.timeTotal = 8000;
          f.timeLeft = 8000;
        }
        f.timeLeft -= delta;
      }
      if (f.type === 'golden') {
        f.rot += delta * 0.003;
      }
    });

    // Re-spawn expired decaying food items
    let expired = false;
    this.foodItems.forEach(f => {
      if (f.timeLeft <= 0 && f.type !== 'regular' && f.type !== 'poison') {
        expired = true;
      }
    });
    if (expired) {
      this.foodItems = this.foodItems.filter(f => f.timeLeft > 0 || f.type === 'regular' || f.type === 'poison');
      this.spawnFood();
    }

    // Update particles
    this.particles.forEach(p => {
      p.x += p.vx * (delta / 1000);
      p.y += p.vy * (delta / 1000);
      p.alpha = Math.max(0, p.alpha - delta / 300);
    });
    this.particles = this.particles.filter(p => p.alpha > 0);

    // Accumulator tick movement loop
    this.accumulator += delta;
    while (this.accumulator >= this.TICK_MS) {
      this.accumulator -= this.TICK_MS;
      this.performTick();
    }
  }

  performTick() {
    if (this.isOver) return;

    if (this.queuedDir) {
      this.currentDir = this.queuedDir;
      this.queuedDir = null;
    }

    // Moving wall logic
    if (this.movingWall) {
      this.movingWall.x += this.movingWall.dx;
      if (this.movingWall.x <= this.movingWall.minX || this.movingWall.x >= this.movingWall.maxX) {
        this.movingWall.dx *= -1;
      }
    }

    const head = this.snake[0];
    let nextX = head.x + this.currentDir.x;
    let nextY = head.y + this.currentDir.y;

    // Portal traversal
    this.portals.forEach(p => {
      if (nextX === p.a.x && nextY === p.a.y) {
        nextX = p.b.x + this.currentDir.x; // step through portal b
        nextY = p.b.y + this.currentDir.y;
      } else if (nextX === p.b.x && nextY === p.b.y) {
        nextX = p.a.x + this.currentDir.x; // step through portal a
        nextY = p.a.y + this.currentDir.y;
      }
    });

    // Edge check (death if off map bounds)
    const boundsMinX = this.level === 9 ? 1 : 0;
    const boundsMaxX = this.level === 9 ? 23 : 26;
    const boundsMinY = this.level === 9 ? 1 : 0;
    const boundsMaxY = this.level === 9 ? 23 : 26;

    let crashed = false;
    if (nextX < boundsMinX || nextX > boundsMaxX || nextY < boundsMinY || nextY > boundsMaxY) {
      crashed = true;
    }

    // Static walls checks
    this.walls.forEach(w => {
      if (w.x === nextX && w.y === nextY) crashed = true;
    });

    // Moving walls check
    if (this.movingWall && this.movingWall.x === nextX && this.movingWall.y === nextY) {
      crashed = true;
    }

    // Self-collision (check occupied except tail segment if not growing)
    const occupiedSet = new Set(this.snake.slice(0, -1).map(c => `${c.x},${c.y}`));
    if (occupiedSet.has(`${nextX},${nextY}`)) {
      crashed = true;
    }

    if (crashed) {
      this.deathFlashTime = 300;
      this.lives--;
      if (this.lives > 0) {
        // Reset positioning
        this.snake = [
          { x: 13, y: 13 },
          { x: 12, y: 13 },
          { x: 11, y: 13 }
        ];
        this.currentDir = { x: 1, y: 0 };
        this.queuedDir = null;
        this.foodItems = [];
        this.spawnFood();
      }
      return;
    }

    // Insert new head
    this.snake.unshift({ x: nextX, y: nextY });

    // Check food collision
    let eaten = false;
    this.foodItems.forEach((f, idx) => {
      if (nextX === f.x && nextY === f.y) {
        eaten = true;
        this.eatMouthTimer = 200; // mouth visual flag
        
        let pts = 10;
        if (f.type === 'fast') pts = 25;
        if (f.type === 'golden') pts = 50;
        
        if (f.type === 'poison') {
          this.lives--;
        } else {
          this.score += pts * this.level;
        }

        // Spawn particles
        this.spawnParticles(f.x * 20 + 10, f.y * 20 + 10);
        
        // Remove item
        this.foodItems.splice(idx, 1);
      }
    });

    if (eaten) {
      this.spawnFood();
    } else {
      this.snake.pop();
    }

    // Check clear condition
    const target = this.getTargetScore();
    if (this.score >= target) {
      this.levelComplete();
    }
  }

  getTargetScore() {
    const targets = [0, 100, 150, 200, 280, 350, 450, 550, 680, 820, 1000];
    return targets[this.level] || 1000;
  }

  spawnParticles(x, y) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = this.rand(60, 120);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1.0
      });
    }
  }

  render(ctx) {
    this.clear();

    // 1. Draw grid dots batched
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.beginPath();
    const boundX = this.level === 9 ? 24 : 27;
    const boundY = this.level === 9 ? 24 : 27;
    for (let x = 0; x <= boundX; x++) {
      for (let y = 0; y <= boundY; y++) {
        ctx.rect(x * this.cellSize - 1, y * this.cellSize - 1, 2, 2);
      }
    }
    ctx.fill();

    // Draw shrunk grid border
    if (this.level === 9) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 20, 480, 480);
    }

    // 2. Draw static walls
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    this.walls.forEach(w => {
      this.drawRoundedRect(ctx, w.x * 20 + 1, w.y * 20 + 1, 18, 18, 3);
      ctx.fill();
    });

    // 3. Draw moving wall
    if (this.movingWall) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      this.drawRoundedRect(ctx, this.movingWall.x * 20 + 1, this.movingWall.y * 20 + 1, 18, 18, 3);
      ctx.fill();
    }

    // 4. Draw portals
    this.portals.forEach(p => {
      const pulseRadius = 6 + Math.sin(this.totalTime / 500) * 2;
      
      // Portal A (Accent)
      ctx.fillStyle = '#00d4aa';
      ctx.beginPath();
      ctx.arc(p.a.x * 20 + 10, p.a.y * 20 + 10, pulseRadius, 0, Math.PI * 2);
      ctx.fill();

      // Portal B (Complementary: orange/magenta)
      ctx.fillStyle = '#ff4757';
      ctx.beginPath();
      ctx.arc(p.b.x * 20 + 10, p.b.y * 20 + 10, pulseRadius, 0, Math.PI * 2);
      ctx.fill();

      // faint connecting arc line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.a.x * 20 + 10, p.a.y * 20 + 10);
      ctx.lineTo(p.b.x * 20 + 10, p.b.y * 20 + 10);
      ctx.stroke();
    });

    // 5. Draw food items
    this.foodItems.forEach(f => {
      if (f.type === 'regular') {
        const pulse = 5 + Math.sin(this.totalTime / 400) * 1.5;
        ctx.fillStyle = '#00d4aa';
        ctx.beginPath();
        ctx.arc(f.x * 20 + 10, f.y * 20 + 10, pulse, 0, Math.PI * 2);
        ctx.fill();
      } else if (f.type === 'fast') {
        // Fast countdown ring
        const progress = Math.max(0, f.timeLeft / f.timeTotal);
        ctx.strokeStyle = progress > 0.5 ? '#00d4aa' : progress > 0.25 ? '#ffd93d' : '#ff4757';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(f.x * 20 + 10, f.y * 20 + 10, 8, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * progress);
        ctx.stroke();
        
        ctx.fillStyle = '#ffd93d';
        ctx.beginPath();
        ctx.arc(f.x * 20 + 10, f.y * 20 + 10, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (f.type === 'poison') {
        // Poison food
        ctx.fillStyle = '#ff4757';
        ctx.beginPath();
        ctx.arc(f.x * 20 + 10, f.y * 20 + 10, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // skull cross lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(f.x * 20 + 7, f.y * 20 + 7);
        ctx.lineTo(f.x * 20 + 13, f.y * 20 + 13);
        ctx.moveTo(f.x * 20 + 13, f.y * 20 + 7);
        ctx.lineTo(f.x * 20 + 7, f.y * 20 + 13);
        ctx.stroke();
      } else if (f.type === 'golden') {
        // Rotated diamond
        ctx.save();
        ctx.translate(f.x * 20 + 10, f.y * 20 + 10);
        ctx.rotate(f.rot);
        ctx.fillStyle = '#ffd93d';
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(7, 0);
        ctx.lineTo(0, 7);
        ctx.lineTo(-7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    });

    // 6. Draw snake (tail to head)
    for (let i = this.snake.length - 1; i >= 0; i--) {
      const segment = this.snake[i];
      const alpha = this.lerp(0.35, 1.0, i / this.snake.length);
      ctx.fillStyle = `rgba(0, 212, 170, ${alpha})`;
      this.drawRoundedRect(ctx, segment.x * 20 + 2, segment.y * 20 + 2, 16, 16, 4);
      ctx.fill();

      // Head additions
      if (i === 0) {
        // Eyes
        ctx.fillStyle = '#ffffff';
        const eyeOffset = 4;
        let eye1 = { x: 0, y: 0 }, eye2 = { x: 0, y: 0 };
        
        if (this.currentDir.x === 1) {
          eye1 = { x: 12, y: 4 };
          eye2 = { x: 12, y: 12 };
        } else if (this.currentDir.x === -1) {
          eye1 = { x: 4, y: 4 };
          eye2 = { x: 4, y: 12 };
        } else if (this.currentDir.y === 1) {
          eye1 = { x: 4, y: 12 };
          eye2 = { x: 12, y: 12 };
        } else if (this.currentDir.y === -1) {
          eye1 = { x: 4, y: 4 };
          eye2 = { x: 12, y: 4 };
        }

        ctx.beginPath();
        ctx.arc(segment.x * 20 + eye1.x, segment.y * 20 + eye1.y, 2, 0, Math.PI * 2);
        ctx.arc(segment.x * 20 + eye2.x, segment.y * 20 + eye2.y, 2, 0, Math.PI * 2);
        ctx.fill();

        // Mouth arc if eaten recently
        if (this.eatMouthTimer > 0) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(segment.x * 20 + 10, segment.y * 20 + 10, 4, 0, Math.PI);
          ctx.stroke();
        }
      }
    }

    // 7. Draw particles
    this.particles.forEach(p => {
      ctx.fillStyle = `rgba(0, 212, 170, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // 8. Death flash
    if (this.deathFlashTime > 0) {
      const alpha = (this.deathFlashTime / 300) * 0.25;
      ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }

  drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  destroy() {
    super.destroy();
  }
}

window.GameClass = NeonSerpent;
export default NeonSerpent;
