import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

export default class PixelDodge extends GameBase {
  static get logicalWidth() { return 600; }
  static get logicalHeight() { return 600; }
  
  constructor(canvas, container) {
    super(canvas, container);

    this.playerSize = 10;
    this.player = { x: 300, y: 300 };

    this.dots = [];
    this.warnings = []; // Active warnings scheduled to spawn bullets

    this.timePlayed = 0;
    this.difficultyLevel = 1;
    this.spawnTimer = 0;
    this.spawnRate = 1800; // ms between warning alerts
    this.patternIndex = 0;
  }

  init() {
    this.score = 0;
    this.timePlayed = 0;
    
    this.player.x = 300;
    this.player.y = 300;

    this.dots = [];
    this.warnings = [];
    
    this.difficultyLevel = 1;
    this.spawnTimer = 500; // spawn first warning soon
    this.spawnRate = 1800;
    this.patternIndex = 0;

    let runs = Storage.get('pixel-dodge_runs', 0);
    Storage.set('pixel-dodge_runs', runs + 1);
  }

  onInput(key, event) {}

  update(deltaTime) {
    const dt = deltaTime / 1000;
    this.timePlayed += deltaTime;
    this.score = Math.floor(this.timePlayed);

    // Speed / difficulty ramp every 12 seconds
    const targetDifficulty = Math.floor(this.timePlayed / 12000) + 1;
    if (targetDifficulty !== this.difficultyLevel) {
      this.difficultyLevel = targetDifficulty;
      this.spawnRate = Math.max(750, 1800 - this.difficultyLevel * 120);
      this.container.audio.play('coin'); // cue level up
    }

    // Move player based on sandbox pointer coordinates
    const m = this.container.input.getMousePosition();
    if (m && m.x > 0) {
      this.player.x = m.x;
      this.player.y = m.y;
    }
    
    // Bounds check
    this.player.x = Math.max(10, Math.min(this.width - 10, this.player.x));
    this.player.y = Math.max(10, Math.min(this.height - 10, this.player.y));

    // Update Warnings: when timer reaches 0, spawn bullets
    for (let i = this.warnings.length - 1; i >= 0; i--) {
      const w = this.warnings[i];
      w.timeRemaining -= deltaTime;
      if (w.timeRemaining <= 0) {
        // Spawn the bullets
        w.bullets.forEach(b => {
          this.dots.push({
            x: b.x, y: b.y,
            vx: b.vx, vy: b.vy,
            r: b.r,
            trail: []
          });
        });
        this.container.audio.play('blip');
        this.warnings.splice(i, 1);
      }
    }

    // Schedule Warning spawns
    this.spawnTimer -= deltaTime;
    if (this.spawnTimer <= 0) {
      this.queueNextWarning();
      this.spawnTimer = this.spawnRate;
    }

    // Update dots and evaluate player hit tests
    const hitRadius = this.playerSize * 0.7; // 70% reduced hit box size
    
    for (let i = this.dots.length - 1; i >= 0; i--) {
      const d = this.dots[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;

      d.trail.push({ x: d.x, y: d.y });
      if (d.trail.length > 5) d.trail.shift();

      // Circle-Circle collision hit evaluation
      const dx = d.x - this.player.x;
      const dy = d.y - this.player.y;
      const distance = Math.hypot(dx, dy);

      if (distance < (d.r + hitRadius)) {
        this.die();
        return;
      }

      // Cleanup offscreen dots
      if (d.x < -80 || d.x > this.width + 80 || d.y < -80 || d.y > this.height + 80) {
        this.dots.splice(i, 1);
      }
    }
  }

  queueNextWarning() {
    this.patternIndex++;
    const type = this.patternIndex % 4;
    const speed = 130 + this.difficultyLevel * 18;
    const r = 5.5;

    const bullets = [];
    const lines = []; // for rendering dashed warnings

    if (type === 0) {
      // 1. RAIN PATTERN
      // Set warning lines vertically
      const colsCount = 12;
      const gapCol = Math.floor(Math.random() * (colsCount - 2)) + 1; // leave 2 columns safe gap
      for (let i = 0; i < colsCount; i++) {
        if (i === gapCol || i === gapCol + 1) continue;
        const x = i * (this.width / colsCount) + (this.width / colsCount) / 2;
        bullets.push({ x, y: -10, vx: 0, vy: speed, r });
        lines.push({ x1: x, y1: 0, x2: x, y2: this.height });
      }
    } else if (type === 1) {
      // 2. CROSS PATTERN
      // Horizontals flying from left and right
      const lanes = 6;
      for (let i = 0; i < lanes; i++) {
        const y = 80 + i * (this.height - 120) / lanes;
        if (i % 2 === 0) {
          bullets.push({ x: -10, y, vx: speed * 1.3, vy: 0, r });
          lines.push({ x1: 0, y1: y, x2: this.width, y2: y });
        } else {
          bullets.push({ x: this.width + 10, y, vx: -speed * 1.3, vy: 0, r });
          lines.push({ x1: this.width, y1: y, x2: 0, y2: y });
        }
      }
    } else if (type === 2) {
      // 3. SPIRAL WAVE
      // Outward spirals from the center
      const points = 16;
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        bullets.push({ x: this.width / 2, y: this.height / 2, vx, vy, r });
        lines.push({ x1: this.width / 2, y1: this.height / 2, x2: this.width / 2 + vx * 2, y2: this.height / 2 + vy * 2 });
      }
    } else {
      // 4. CONVERGING PATTERN
      // Spawns bullets at corners aiming toward player's current position
      const px = this.player.x;
      const py = this.player.y;
      const corners = [
        { x: 0, y: 0 },
        { x: this.width, y: 0 },
        { x: 0, y: this.height },
        { x: this.width, y: this.height }
      ];

      corners.forEach(c => {
        const angle = Math.atan2(py - c.y, px - c.x);
        bullets.push({
          x: c.x, y: c.y,
          vx: Math.cos(angle) * speed * 1.2,
          vy: Math.sin(angle) * speed * 1.2,
          r
        });
        lines.push({ x1: c.x, y1: c.y, x2: px, y2: py });
      });
    }

    this.warnings.push({
      timeRemaining: 500, // 500ms warning duration
      bullets,
      lines
    });
  }

  die() {
    this.container.audio.play('damage');
    this.finishGame();
  }

  finishGame() {
    const survivalSec = (this.timePlayed / 1000).toFixed(2);
    const coins = Math.floor(this.score / 250);

    this.scoreBreakdown = {
      rows: [
        { label: 'Time Dodged', value: `${survivalSec}s`, points: this.score }
      ],
      total: this.score,
      coinsEarned: coins
    };

    if (window.awardCoins && coins > 0) {
      window.awardCoins(coins, 'Pixel Dodge Score');
    }

    this.container.audio.play('gameover');
    this.gameOver();
  }

  render(ctx) {
    // 1. Clear background
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Draw warning lines (blinking red dashes)
    ctx.strokeStyle = 'rgba(255, 59, 48, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    
    this.warnings.forEach(w => {
      w.lines.forEach(l => {
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
      });
    });
    ctx.setLineDash([]); // reset

    // 3. Draw dots and trails
    for (let d of this.dots) {
      // Trail
      for (let i = 0; i < d.trail.length; i++) {
        const pos = d.trail[i];
        const alpha = ((i + 1) / d.trail.length) * 0.35;
        ctx.fillStyle = `rgba(255, 59, 48, ${alpha})`; // red trail
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, d.r * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ball core
      ctx.fillStyle = '#ff3b30'; // neon red
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ff3b30';
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 4. Draw Player Pixel (Neon Green)
    ctx.fillStyle = '#10b981';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#10b981';
    ctx.fillRect(this.player.x - this.playerSize / 2, this.player.y - this.playerSize / 2, this.playerSize, this.playerSize);
    ctx.shadowBlur = 0;

    // Draw player hitbox ring guide (70% scale)
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.playerSize * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // HUD Stats
    ctx.fillStyle = '#f0f0f8';
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`DODGE LEVEL: ${this.difficultyLevel}`, 20, 50);
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${this.score}`, this.width - 20, 50);
  }

  getControls() {
    return [
      { key: 'MOUSE', action: 'Move pixel indicator' }
    ];
  }

  getFunStat() {
    return `Survived for ${(this.timePlayed / 1000).toFixed(2)} seconds at difficulty ${this.difficultyLevel}`;
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
