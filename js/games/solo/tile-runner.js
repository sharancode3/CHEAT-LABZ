import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

export default class TileRunner extends GameBase {
  static get logicalWidth() { return 400; }
  static get logicalHeight() { return 600; }
  
  constructor(canvas, container) {
    super(canvas, container);

    this.lives = 3;
    this.keys = ['d', 'f', 'j', 'k'];
    this.laneCount = 4;
    this.laneWidth = this.width / this.laneCount;
    this.tileHeight = 130;
    
    this.hitZoneY = this.height - 160;
    this.hitZoneH = 160;
    
    this.tiles = [];
    this.speed = 340; // pixels per sec
    this.tapCount = 0;
    
    this.spawnY = this.height - 200;
    this.laneFlashes = [0, 0, 0, 0];
    this.ripples = [];
  }

  init() {
    this.lives = 3;
    this.score = 0;
    this.speed = 340;
    this.tapCount = 0;
    
    this.tiles = [];
    this.ripples = [];
    this.laneFlashes = [0, 0, 0, 0];
    
    this.spawnY = this.height - 200;
    
    // Pre-populate starting buffer of rows
    for (let i = 0; i < 15; i++) {
      this.spawnTile();
    }
    
    let runs = Storage.get('tile-runner_runs', 0);
    Storage.set('tile-runner_runs', runs + 1);
  }

  spawnTile() {
    const lane = Math.floor(Math.random() * this.laneCount);
    const isGold = Math.random() < 0.08; // 8% gold power tiles

    this.tiles.push({
      lane: lane,
      y: this.spawnY,
      hit: false,
      isGold: isGold,
      flashTimer: 0
    });
    
    this.spawnY -= this.tileHeight; // Stack continuous row buffer
  }

  onInput(key, event) {
    if (this.state !== 'PLAYING') return;

    const laneIndex = this.keys.indexOf(key.toLowerCase());
    if (laneIndex !== -1) {
      this.tapLane(laneIndex);
    }
  }

  onMouseDown(x, y, event) {
    if (this.state !== 'PLAYING') return;

    // Detect clicked lane based on pointer x
    const lane = Math.floor(x / this.laneWidth);
    if (lane >= 0 && lane < this.laneCount) {
      this.tapLane(lane);
    }
  }

  tapLane(lane) {
    this.laneFlashes[lane] = 1.0; // Flash lane columns

    // Spawn tap ripple visual
    this.ripples.push({
      x: lane * this.laneWidth + this.laneWidth / 2,
      y: this.hitZoneY + this.hitZoneH / 2,
      radius: 12,
      alpha: 1.0
    });

    // Find lowest unhit tile in the selected lane
    let targetTile = null;
    for (let t of this.tiles) {
      if (t.lane === lane && !t.hit) {
        // Must overlap hit zone boundary
        const bottomY = t.y + this.tileHeight;
        if (bottomY >= this.hitZoneY - 30 && t.y <= this.height) {
          if (!targetTile || t.y > targetTile.y) {
            targetTile = t;
          }
        }
      }
    }

    if (targetTile) {
      targetTile.hit = true;
      targetTile.flashTimer = 180;
      this.container.audio.play('coin');

      const points = targetTile.isGold ? 50 : 15;
      this.score += points;
      this.tapCount++;

      // Slowly increment speed per correct tile hit
      if (this.tapCount % 12 === 0) {
        this.speed += 35;
      }
    } else {
      // Miss tap
      this.loseLife();
    }
  }

  loseLife() {
    this.container.audio.play('damage');
    this.lives--;
    this.container.shake(200, 3.5);

    if (this.lives <= 0) {
      this.finishGame();
    }
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;

    // Shift row spawn anchor downwards
    this.spawnY += this.speed * dt;

    // Constantly verify buffers size
    while (this.tiles.length < 15) {
      this.spawnTile();
    }

    // Update active tiles
    for (let i = this.tiles.length - 1; i >= 0; i--) {
      const t = this.tiles[i];
      if (t.hit) {
        t.flashTimer -= deltaTime;
        if (t.flashTimer <= 0) {
          this.tiles.splice(i, 1);
        }
      } else {
        t.y += this.speed * dt;
        
        // Pass bottom baseline completely -> miss penalty
        if (t.y > this.height) {
          this.tiles.splice(i, 1);
          this.loseLife();
        }
      }
    }

    // Ripple decay updates
    this.ripples.forEach(r => {
      r.radius += dt * 140;
      r.alpha -= dt * 2.5;
    });
    this.ripples = this.ripples.filter(r => r.alpha > 0);

    // Columns flashes fade
    for (let i = 0; i < this.laneCount; i++) {
      if (this.laneFlashes[i] > 0) {
        this.laneFlashes[i] -= dt * 4;
        if (this.laneFlashes[i] < 0) this.laneFlashes[i] = 0;
      }
    }
  }

  finishGame() {
    const baseScore = this.score;
    const coins = Math.floor(baseScore / 35);

    this.scoreBreakdown = {
      rows: [
        { label: 'Score Accumulation', value: baseScore, points: baseScore }
      ],
      total: baseScore,
      coinsEarned: coins
    };

    if (window.awardCoins && coins > 0) {
      window.awardCoins(coins, 'Tile Runner Match');
    }

    this.container.audio.play('gameover');
    this.gameOver();
  }

  render(ctx) {
    // 1. Clear background
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Draw Lanes & Flashes
    for (let i = 0; i < this.laneCount; i++) {
      const x = i * this.laneWidth;

      // Divider lines
      ctx.strokeStyle = '#14141f';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();

      // Column flashes
      if (this.laneFlashes[i] > 0) {
        ctx.fillStyle = `rgba(0, 240, 255, ${this.laneFlashes[i] * 0.15})`;
        ctx.fillRect(x, 0, this.laneWidth, this.height);
      }

      // Keys shortcut label inside bottom target zone
      ctx.fillStyle = '#8888a8';
      ctx.font = '14px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText(this.keys[i].toUpperCase(), x + this.laneWidth / 2, this.height - 35);
    }

    // 3. Draw Target Hit Zone boundary
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(0, this.hitZoneY, this.width, this.hitZoneH);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, this.hitZoneY);
    ctx.lineTo(this.width, this.hitZoneY);
    ctx.stroke();

    // 4. Draw falling piano tiles
    const shimmer = Math.abs(Math.sin(performance.now() / 140)) * 0.35 + 0.65;
    
    for (let t of this.tiles) {
      const x = t.lane * this.laneWidth;

      if (t.hit) {
        // Flash glow white on hit
        ctx.fillStyle = `rgba(255, 255, 255, ${t.flashTimer / 180})`;
        ctx.fillRect(x + 2, t.y, this.laneWidth - 4, this.tileHeight);
      } else {
        // Normal tile or shimmery gold power tile
        ctx.fillStyle = t.isGold ? `rgba(251, 191, 36, ${shimmer})` : '#161622';
        
        ctx.shadowBlur = t.isGold ? 15 : 6;
        ctx.shadowColor = t.isGold ? '#fbbf24' : '#000';
        ctx.beginPath();
        ctx.roundRect(x + 3, t.y + 2, this.laneWidth - 6, this.tileHeight - 4, 4);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner outline sheen
        ctx.strokeStyle = t.isGold ? '#ffffff' : '#2c2c3e';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 6, t.y + 5, this.laneWidth - 12, this.tileHeight - 10);
      }
    }

    // 5. Draw active tap ripples
    ctx.lineWidth = 3;
    for (let r of this.ripples) {
      ctx.strokeStyle = `rgba(0, 240, 255, ${r.alpha})`;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // HUD Stats
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`SPEED: ${Math.floor(this.speed)} px/s`, 20, 50);
    ctx.textAlign = 'right';
    ctx.fillText(`LIVES: ${'♥'.repeat(this.lives)}`, this.width - 20, 50);
  }

  getControls() {
    return [
      { key: 'D / F / J / K', action: 'Tap corresponding lane tile' },
      { key: 'MOUSE CLICK', action: 'Click lanes directly' }
    ];
  }

  getFunStat() {
    return `Cleared notes at speed ${this.speed} px/s`;
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
