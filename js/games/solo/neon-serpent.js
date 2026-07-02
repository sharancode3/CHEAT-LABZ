import { GameBase } from '../../core/game-base.js';

class NeonSerpent extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    this.gridSize = 20;
    this.cols = 30; // 600 / 20
    this.rows = 30; // 600 / 20

    if (this.level >= 9) {
      // Shrink grid
      this.gridSize = 40;
      this.cols = 15; // 600 / 40
      this.rows = 15; // 600 / 40
    }

    this.snake = [
      { x: Math.floor(this.cols / 2), y: Math.floor(this.rows / 2) },
      { x: Math.floor(this.cols / 2) - 1, y: Math.floor(this.rows / 2) },
      { x: Math.floor(this.cols / 2) - 2, y: Math.floor(this.rows / 2) }
    ];
    this.dir = { x: 1, y: 0 };
    this.queuedDirection = { x: 1, y: 0 };

    this.food = []; // Array of foods (Level 5 has two)
    this.poisonFood = [];
    this.walls = [];
    this.portals = []; // Pairs of portals: { p1: {x, y}, p2: {x, y} }
    this.movingWall = null; // { x, y, dx, minX, maxX }

    this.tickAccumulator = 0;
    this.tickInterval = 130; // Constant speed
    this.foodPulse = 0;
    this.foodTimer = 0; // For decaying food

    this.setupLevel();
    this.spawnFood();
  }

  setupLevel() {
    const lvl = this.level;
    // Level 2, 8, 10: corner wall blocks
    if (lvl === 2 || lvl === 8 || lvl === 10) {
      this.walls.push({ x: 2, y: 2 }, { x: this.cols - 3, y: 2 }, { x: 2, y: this.rows - 3 }, { x: this.cols - 3, y: this.rows - 3 });
    }
    // Level 3: Cross in center
    if (lvl === 3) {
      const cx = Math.floor(this.cols / 2);
      const cy = Math.floor(this.rows / 2);
      for (let i = -3; i <= 3; i++) {
        if (i !== 0) {
          this.walls.push({ x: cx + i, y: cy });
          this.walls.push({ x: cx, y: cy + i });
        }
      }
    }
    // Level 5, 8, 10: Moving wall
    if (lvl === 5 || lvl === 8 || lvl === 10) {
      this.movingWall = {
        x: Math.floor(this.cols / 2),
        y: 4,
        dx: 1,
        minX: 2,
        maxX: this.cols - 3,
        tickCounter: 0
      };
    }
    // Level 6, 8, 9, 10: Portals
    if (lvl === 6 || lvl === 8 || lvl === 9 || lvl === 10) {
      this.portals.push({
        p1: { x: 3, y: Math.floor(this.rows / 2) },
        p2: { x: this.cols - 4, y: Math.floor(this.rows / 2) },
        decay: lvl === 9 // Decaying portal flag
      });
    }
  }

  spawnFood() {
    const occupied = new Set();
    this.snake.forEach(s => occupied.add(`${s.x},${s.y}`));
    this.walls.forEach(w => occupied.add(`${w.x},${w.y}`));
    this.portals.forEach(p => {
      occupied.add(`${p.p1.x},${p.p1.y}`);
      occupied.add(`${p.p2.x},${p.p2.y}`);
    });
    if (this.movingWall) {
      occupied.add(`${this.movingWall.x},${this.movingWall.y}`);
    }

    const available = [];
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        if (!occupied.has(`${x},${y}`)) {
          available.push({ x, y });
        }
      }
    }

    if (available.length === 0) return;

    // Reset food lists
    this.food = [];
    this.poisonFood = [];

    // Level 5, 8, 10: Spawn two foods
    const foodCount = (this.level === 5 || this.level === 8 || this.level === 10) ? 2 : 1;
    for (let i = 0; i < foodCount; i++) {
      if (available.length > 0) {
        const idx = Math.floor(Math.random() * available.length);
        this.food.push(available.splice(idx, 1)[0]);
      }
    }

    // Level 7, 8, 10: Spawn one poison food
    if (this.level === 7 || this.level === 8 || this.level === 10) {
      if (available.length > 0) {
        const idx = Math.floor(Math.random() * available.length);
        this.poisonFood.push(available.splice(idx, 1)[0]);
      }
    }

    // Food decay timer
    if (this.level === 4 || this.level === 10) {
      this.foodTimer = 8000; // 8 seconds
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    // Poll Input using wasPressedAny
    const inp = this.input;
    if (inp.wasPressedAny(inp.ACTIONS.UP) && this.dir.y === 0) {
      this.queuedDirection = { x: 0, y: -1 };
    } else if (inp.wasPressedAny(inp.ACTIONS.DOWN) && this.dir.y === 0) {
      this.queuedDirection = { x: 0, y: 1 };
    } else if (inp.wasPressedAny(inp.ACTIONS.LEFT) && this.dir.x === 0) {
      this.queuedDirection = { x: -1, y: 0 };
    } else if (inp.wasPressedAny(inp.ACTIONS.RIGHT) && this.dir.x === 0) {
      this.queuedDirection = { x: 1, y: 0 };
    }

    // Decay food timer
    if (this.level === 4 || this.level === 10) {
      this.foodTimer -= delta;
      if (this.foodTimer <= 0) {
        this.spawnFood();
      }
    }

    // Portals decay in level 9
    if (this.level === 9) {
      this.portals.forEach(portal => {
        if (Math.random() < 0.005) { // Random decay recreate
          portal.p1 = { x: Math.floor(Math.random() * this.cols), y: Math.floor(Math.random() * this.rows) };
          portal.p2 = { x: Math.floor(Math.random() * this.cols), y: Math.floor(Math.random() * this.rows) };
        }
      });
    }

    this.tickAccumulator += delta;
    while (this.tickAccumulator >= this.tickInterval) {
      this.tickAccumulator -= this.tickInterval;
      this.processTick();
    }
  }

  processTick() {
    this.dir = { ...this.queuedDirection };

    // Move Moving Wall
    if (this.movingWall) {
      this.movingWall.x += this.movingWall.dx;
      if (this.movingWall.x <= this.movingWall.minX || this.movingWall.x >= this.movingWall.maxX) {
        this.movingWall.dx *= -1;
      }
    }

    const head = this.snake[0];
    let nextX = head.x + this.dir.x;
    let nextY = head.y + this.dir.y;

    // Portal Teleportation
    this.portals.forEach(p => {
      if (nextX === p.p1.x && nextY === p.p1.y) {
        nextX = p.p2.x;
        nextY = p.p2.y;
      } else if (nextX === p.p2.x && nextY === p.p2.y) {
        nextX = p.p1.x;
        nextY = p.p1.y;
      }
    });

    // Wall Collision Check (including Grid limits)
    let hitWall = false;
    if (nextX < 0 || nextX >= this.cols || nextY < 0 || nextY >= this.rows) {
      hitWall = true;
    }
    this.walls.forEach(w => {
      if (w.x === nextX && w.y === nextY) hitWall = true;
    });
    if (this.movingWall && this.movingWall.x === nextX && this.movingWall.y === nextY) {
      hitWall = true;
    }

    if (hitWall) {
      this.lives--;
      this.init();
      return;
    }

    // Snake self-collision check
    const occupiedSet = new Set(this.snake.map(c => `${c.x},${c.y}`));
    if (occupiedSet.has(`${nextX},${nextY}`)) {
      this.lives--;
      this.init();
      return;
    }

    // Insert new head
    this.snake.unshift({ x: nextX, y: nextY });

    // Check food consumption
    let eaten = false;
    this.food.forEach((f, idx) => {
      if (nextX === f.x && nextY === f.y) {
        eaten = true;
        this.score += 10;
        this.spawnFood();
      }
    });

    // Check poison food
    this.poisonFood.forEach((f, idx) => {
      if (nextX === f.x && nextY === f.y) {
        this.lives--;
        this.spawnFood();
      }
    });

    if (!eaten) {
      this.snake.pop();
    }

    // Check Goal
    const goal = this.getLevelGoal();
    if (this.score >= goal.target) {
      this.levelComplete();
    }
  }

  render() {
    this.clearCanvas();
    this.foodPulse += 16; // Simulate delta for simple pulse

    const ctx = this.ctx;

    // Draw Grid intersections
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.beginPath();
    for (let x = 0; x <= this.cols; x++) {
      for (let y = 0; y <= this.rows; y++) {
        ctx.rect(x * this.gridSize - 1, y * this.gridSize - 1, 2, 2);
      }
    }
    ctx.fill();

    // Draw Static Walls
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this.walls.forEach(w => {
      ctx.fillRect(w.x * this.gridSize, w.y * this.gridSize, this.gridSize, this.gridSize);
    });

    // Draw Moving Wall
    if (this.movingWall) {
      ctx.fillStyle = '#ff5e7e';
      ctx.fillRect(this.movingWall.x * this.gridSize, this.movingWall.y * this.gridSize, this.gridSize, this.gridSize);
    }

    // Draw Portals
    this.portals.forEach(p => {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.p1.x * this.gridSize + this.gridSize / 2, p.p1.y * this.gridSize + this.gridSize / 2, this.gridSize / 3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p.p2.x * this.gridSize + this.gridSize / 2, p.p2.y * this.gridSize + this.gridSize / 2, this.gridSize / 3, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw Snake
    this.snake.forEach((segment, idx) => {
      if (idx === 0) {
        ctx.fillStyle = '#6c63ff'; // Bright head
      } else {
        ctx.fillStyle = `rgba(108, 99, 255, ${Math.max(0.2, 1 - idx / this.snake.length)})`;
      }
      ctx.fillRect(segment.x * this.gridSize + 1, segment.y * this.gridSize + 1, this.gridSize - 2, this.gridSize - 2);
    });

    // Draw Food (Pulsing Circle)
    const radius = this.gridSize / 3 + Math.sin(this.foodPulse / 300) * 1.5;
    ctx.fillStyle = '#00d4aa';
    this.food.forEach(f => {
      ctx.beginPath();
      ctx.arc(f.x * this.gridSize + this.gridSize / 2, f.y * this.gridSize + this.gridSize / 2, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Poison Food (Circle with X)
    ctx.fillStyle = '#ef4444';
    this.poisonFood.forEach(f => {
      ctx.beginPath();
      ctx.arc(f.x * this.gridSize + this.gridSize / 2, f.y * this.gridSize + this.gridSize / 2, radius, 0, Math.PI * 2);
      ctx.fill();
      // Draw X
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const offset = 4;
      ctx.moveTo(f.x * this.gridSize + offset, f.y * this.gridSize + offset);
      ctx.lineTo(f.x * this.gridSize + this.gridSize - offset, f.y * this.gridSize + this.gridSize - offset);
      ctx.moveTo(f.x * this.gridSize + this.gridSize - offset, f.y * this.gridSize + offset);
      ctx.lineTo(f.x * this.gridSize + offset, f.y * this.gridSize + this.gridSize - offset);
      ctx.stroke();
    });
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    return [
      { label: 'Score', value: this.score },
      { label: 'Level', value: this.level },
      { label: 'Size', value: this.snake.length }
    ];
  }

  getLevelGoal() {
    const goals = [
      null, // index 0 unused
      { type: 'score', target: 50 },  // Level 1
      { type: 'score', target: 80 },  // Level 2
      { type: 'score', target: 100 }, // Level 3
      { type: 'score', target: 120 }, // Level 4
      { type: 'score', target: 150 }, // Level 5
      { type: 'score', target: 180 }, // Level 6
      { type: 'score', target: 200 }, // Level 7
      { type: 'score', target: 220 }, // Level 8
      { type: 'score', target: 250 }, // Level 9
      { type: 'score', target: 300 }  // Level 10
    ];
    return goals[this.level];
  }
}

window.GameClass = NeonSerpent;
