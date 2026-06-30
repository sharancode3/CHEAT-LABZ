import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

export default class NeonSerpent extends GameBase {
  static get logicalWidth() { return 600; }
  static get logicalHeight() { return 600; }
  
  constructor(canvas, container) {
    super(canvas, container);

    this.gridSize = 20;
    this.cols = this.width / this.gridSize;
    this.rows = this.height / this.gridSize;

    // Local assets
    this.snake = [];
    this.food = { x: 0, y: 0 };
    this.dir = { x: 1, y: 0 };
    this.inputQueue = [];

    // Timers
    this.tickAccumulator = 0;
    this.tickInterval = 150; // starts at 150ms
    this.foodPulseTime = 0;
    
    // Combo & scoring metrics
    this.foodsEaten = 0;
    this.lastFoodTime = 0;
    this.fastEatsCount = 0;

    // Visual juice
    this.isDead = false;
    this.deathTimer = 0;
    this.headScale = 1.0;
    this.headScaleTimer = 0;
    this.fasterTextTimer = 0;
    this.floatingTexts = [];
  }

  init() {
    this.snake = [
      { x: 10, y: 15 },
      { x: 9, y: 15 },
      { x: 8, y: 15 }
    ];
    this.dir = { x: 1, y: 0 };
    this.inputQueue = [];
    
    this.tickAccumulator = 0;
    this.tickInterval = 150;
    this.foodPulseTime = 0;

    this.foodsEaten = 0;
    this.lastFoodTime = performance.now();
    this.fastEatsCount = 0;
    
    this.isDead = false;
    this.deathTimer = 0;
    this.headScale = 1.0;
    this.headScaleTimer = 0;
    this.fasterTextTimer = 0;
    this.floatingTexts = [];

    this.score = 0;
    this.lives = 3;

    // Update runs
    let runs = Storage.get('neon-serpent_runs', 0);
    Storage.set('neon-serpent_runs', runs + 1);

    this.spawnFood();
  }

  spawnFood() {
    const bodySet = new Set(this.snake.map(s => `${s.x},${s.y}`));
    const availableCells = [];
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        if (!bodySet.has(`${c},${r}`)) {
          availableCells.push({ x: c, y: r });
        }
      }
    }

    if (availableCells.length === 0) {
      // Entire grid is full, player wins!
      this.gameOver();
      return;
    }

    const randIdx = Math.floor(Math.random() * availableCells.length);
    this.food = availableCells[randIdx];
  }

  onInput(key, event) {
    if (this.isDead) return;
    const k = key.toLowerCase();
    let newDir = null;

    if (k === 'arrowup' || k === 'w') newDir = { x: 0, y: -1 };
    else if (k === 'arrowdown' || k === 's') newDir = { x: 0, y: 1 };
    else if (k === 'arrowleft' || k === 'a') newDir = { x: -1, y: 0 };
    else if (k === 'arrowright' || k === 'd') newDir = { x: 1, y: 0 };

    if (newDir) {
      if (this.inputQueue.length < 2) {
        this.inputQueue.push(newDir);
      }
    }
  }

  update(deltaTime) {
    if (this.isDead) {
      this.deathTimer += deltaTime;
      if (this.deathTimer >= 700) { // 300ms flash + 400ms dissolve
        this.finishGame();
      }
      return;
    }

    this.foodPulseTime += deltaTime;

    // Timers ticks
    if (this.fasterTextTimer > 0) this.fasterTextTimer -= deltaTime;
    if (this.headScaleTimer > 0) {
      this.headScaleTimer -= deltaTime;
      if (this.headScaleTimer <= 0) this.headScale = 1.0;
    }

    // Floating text update
    this.floatingTexts = this.floatingTexts.filter(t => {
      t.life -= deltaTime;
      t.y -= (deltaTime / 1000) * 35; // float upwards
      return t.life > 0;
    });

    // Tick-based movement accumulator
    this.tickAccumulator += deltaTime;
    while (this.tickAccumulator >= this.tickInterval) {
      this.tickAccumulator -= this.tickInterval;
      this.tick();
    }
  }

  tick() {
    // Process input queue
    if (this.inputQueue.length > 0) {
      const nextDir = this.inputQueue.shift();
      const isOpposite = (nextDir.x === -this.dir.x && nextDir.y === -this.dir.y);
      if (!isOpposite) {
        this.dir = nextDir;
      }
    }

    const head = this.snake[0];
    const newHead = { x: head.x + this.dir.x, y: head.y + this.dir.y };

    // Wall collision (Evaluate before shift tail)
    if (newHead.x < 0 || newHead.x >= this.cols || newHead.y < 0 || newHead.y >= this.rows) {
      this.die();
      return;
    }

    // Self collision (Evaluate using string lookups)
    const bodySet = new Set(this.snake.map(s => `${s.x},${s.y}`));
    if (bodySet.has(`${newHead.x},${newHead.y}`)) {
      this.die();
      return;
    }

    this.snake.unshift(newHead);

    // Food collision
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.eatFood();
    } else {
      this.snake.pop(); // remove tail segment
    }
  }

  eatFood() {
    this.container.audio.play('blip');
    this.foodsEaten++;
    this.headScale = 1.25;
    this.headScaleTimer = 75;

    const fx = this.food.x * this.gridSize + this.gridSize / 2;
    const fy = this.food.y * this.gridSize + this.gridSize / 2;

    const now = performance.now();
    const timeSinceLast = now - this.lastFoodTime;
    this.lastFoodTime = now;

    let points = 10;
    if (timeSinceLast < 2000) {
      points += 5;
      this.fastEatsCount++;
    } else {
      this.fastEatsCount = 0;
    }

    if (this.fastEatsCount >= 3) {
      points *= 2;
      this.floatingTexts.push({
        x: fx, y: fy, text: `COMBO x2 +${points}`, life: 750, maxLife: 750
      });
    } else {
      this.floatingTexts.push({
        x: fx, y: fy, text: `+${points}`, life: 600, maxLife: 600
      });
    }

    this.score += points;

    // Tick speed step progression (decrease tick intervals by 5ms)
    this.tickInterval = Math.max(65, 150 - this.foodsEaten * 5);
    if (this.foodsEaten % 5 === 0) {
      this.fasterTextTimer = 1000;
    }

    this.spawnFood();
  }

  die() {
    this.container.audio.play('damage');
    this.isDead = true;
    this.deathTimer = 0;
    this.container.shake(300, 5);
  }

  finishGame() {
    const rows = [];
    rows.push({ label: 'Foods eaten', value: this.foodsEaten, points: this.foodsEaten * 10 });
    const speedBonus = Math.max(0, 150 - this.tickInterval);
    rows.push({ label: 'Speed bonus', value: `${speedBonus}ms`, points: speedBonus * 2 });
    const coinsEarned = Math.floor(this.score / 15);

    this.scoreBreakdown = {
      rows: rows,
      total: this.score,
      coinsEarned: coinsEarned
    };

    if (window.awardCoins && coinsEarned > 0) {
      window.awardCoins(coinsEarned, 'Neon Serpent Score');
    }

    this.gameOver();
  }

  render(ctx) {
    // 1. Clear background
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Draw faint intersections grid
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    for (let x = 0; x <= this.cols; x++) {
      for (let y = 0; y <= this.rows; y++) {
        ctx.fillRect(x * this.gridSize - 1, y * this.gridSize - 1, 2, 2);
      }
    }

    // 3. Draw food pulsing
    const pulseScale = 1.0 + 0.12 * Math.sin(this.foodPulseTime / 180);
    const radius = (this.gridSize / 2 - 2) * pulseScale;
    const fx = this.food.x * this.gridSize + this.gridSize / 2;
    const fy = this.food.y * this.gridSize + this.gridSize / 2;
    ctx.beginPath();
    ctx.arc(fx, fy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00f0ff';
    ctx.fill();
    ctx.shadowBlur = 0;

    // 4. Draw Snake segments (tail to head)
    const numSegments = this.snake.length;
    let isFlashing = false;
    let flashColor = '#00f0ff';
    let dissolveCutoff = -1;

    if (this.isDead) {
      if (this.deathTimer < 300) {
        const flashCycle = Math.floor(this.deathTimer / 100) % 2;
        isFlashing = true;
        flashColor = flashCycle === 0 ? '#ffffff' : '#ff3b30';
      } else {
        const dissolveProgress = (this.deathTimer - 300) / 400; // 0 to 1
        dissolveCutoff = Math.floor(numSegments * (1 - dissolveProgress));
      }
    }

    for (let i = numSegments - 1; i >= 0; i--) {
      if (dissolveCutoff !== -1 && i >= dissolveCutoff) continue;

      const seg = this.snake[i];
      const px = seg.x * this.gridSize + 1;
      const py = seg.y * this.gridSize + 1;
      const size = this.gridSize - 2;

      if (i === 0) {
        const hsOffset = (this.gridSize * (this.headScale - 1)) / 2;
        ctx.fillStyle = isFlashing ? flashColor : '#ffffff';
        ctx.beginPath();
        ctx.roundRect(px - hsOffset, py - hsOffset, size * this.headScale, size * this.headScale, 5);
        ctx.fill();
      } else {
        const ratio = i / numSegments;
        const r = Math.floor(0 + (0 - 0) * ratio);
        const g = Math.floor(240 + (45 - 240) * ratio);
        const b = Math.floor(255 + (80 - 255) * ratio);
        ctx.fillStyle = isFlashing ? flashColor : `rgb(${r}, ${g}, ${b})`;
        ctx.beginPath();
        ctx.roundRect(px, py, size, size, 4);
        ctx.fill();
      }
    }

    // 5. Draw floating score text
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    this.floatingTexts.forEach(t => {
      const alpha = t.life / t.maxLife;
      ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
      ctx.fillText(t.text, t.x, t.y);
    });

    // 6. Draw speed multiplier notices
    if (this.fasterTextTimer > 0) {
      const alpha = Math.min(1.0, this.fasterTextTimer / 300);
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.font = "bold 20px 'Press Start 2P', monospace";
      ctx.fillText("SPEED UP!", this.width / 2, this.height / 2 - 20);
    }
  }

  getControls() {
    return [
      { key: 'WASD / ARROWS', action: 'Move / Turn' },
      { key: 'P', action: 'Pause Game' }
    ];
  }

  getFunStat() {
    return `Speed level: ${Math.floor((150 - this.tickInterval) / 5) + 1} (${this.foodsEaten} eaten)`;
  }

  getScoreBreakdown() {
    if (this.scoreBreakdown && this.scoreBreakdown.rows) {
      return this.scoreBreakdown.rows;
    }
    return [
      { label: 'Score Accumulation', value: this.score }
    ];
  }
}
window.GameState = {};
