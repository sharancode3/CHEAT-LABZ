import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

export default class ReflexRush extends GameBase {
  static get logicalWidth() { return 500; }
  static get logicalHeight() { return 500; }
  
  constructor(canvas, container) {
    super(canvas, container);

    this.lives = 3;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;

    this.targetDirection = ''; // 'UP', 'DOWN', 'LEFT', 'RIGHT'
    this.timeLeft = 0;
    this.maxTime = 1600; // starts at 1.6s

    // Input swipe vectors
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.swipeTrail = [];

    this.redFlashTimer = 0;
    this.successFlash = 0;
    this.floatingTexts = [];
  }

  init() {
    this.lives = 3;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.maxTime = 1600;

    this.isDragging = false;
    this.swipeTrail = [];
    this.floatingTexts = [];
    this.redFlashTimer = 0;
    this.successFlash = 0;

    this.spawnArrow();

    let runs = Storage.get('reflex-rush_runs', 0);
    Storage.set('reflex-rush_runs', runs + 1);
  }

  spawnArrow() {
    const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    let nextDir = '';
    do {
      nextDir = directions[Math.floor(Math.random() * directions.length)];
    } while (nextDir === this.targetDirection);

    this.targetDirection = nextDir;
    // Speed scales based on current combo hits
    this.timeLeft = Math.max(480, this.maxTime - this.combo * 45);
    this.swipeTrail = [];
  }

  onInput(key, event) {
    if (this.isDead) return;
    const k = key.toLowerCase();
    
    // Support keyboard arrows as fallbacks
    let swipedDir = '';
    if (k === 'arrowup' || k === 'w') swipedDir = 'UP';
    if (k === 'arrowdown' || k === 's') swipedDir = 'DOWN';
    if (k === 'arrowleft' || k === 'a') swipedDir = 'LEFT';
    if (k === 'arrowright' || k === 'd') swipedDir = 'RIGHT';

    if (swipedDir !== '') {
      this.evaluateSwipe(swipedDir);
    }
  }

  onMouseDown(x, y, event) {
    if (this.isDead) return;
    this.isDragging = true;
    this.startX = x;
    this.startY = y;
    this.swipeTrail = [{ x, y }];
  }

  onMouseMove(x, y, event) {
    if (!this.isDragging || this.isDead) return;
    this.swipeTrail.push({ x, y });
    if (this.swipeTrail.length > 8) this.swipeTrail.shift();
  }

  onMouseUp(x, y, event) {
    if (!this.isDragging || this.isDead) return;
    this.isDragging = false;

    const dx = x - this.startX;
    const dy = y - this.startY;
    const distance = Math.hypot(dx, dy);

    // Min swipe threshold (35px)
    if (distance >= 35) {
      let swipedDir = '';
      if (Math.abs(dx) > Math.abs(dy)) {
        swipedDir = dx > 0 ? 'RIGHT' : 'LEFT';
      } else {
        swipedDir = dy > 0 ? 'DOWN' : 'UP';
      }
      this.evaluateSwipe(swipedDir);
    }
    
    this.swipeTrail = [];
  }

  evaluateSwipe(dir) {
    if (dir === this.targetDirection) {
      // 1. Correct Swipe action
      this.container.audio.play('coin');
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      
      let points = 100;
      if (this.combo >= 5) points += 50; // combo bonuses
      this.score += points;
      this.successFlash = 120;

      this.floatingTexts.push({
        x: this.width / 2,
        y: this.height / 2 - 50,
        text: `PERFECT! +${points}`,
        life: 600,
        maxLife: 600,
        color: '#10b981'
      });

      this.spawnArrow();
    } else {
      // 2. Incorrect Swipe direction
      this.triggerMiss("WRONG!");
    }
  }

  triggerMiss(reason) {
    this.container.audio.play('damage');
    this.lives--;
    this.combo = 0;
    this.redFlashTimer = 100;

    this.container.shake(250, 4.5);

    this.floatingTexts.push({
      x: this.width / 2,
      y: this.height / 2 - 50,
      text: reason,
      life: 700,
      maxLife: 700,
      color: '#ff3b30'
    });

    if (this.lives <= 0) {
      this.finishGame();
    } else {
      this.spawnArrow();
    }
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;

    if (this.redFlashTimer > 0) this.redFlashTimer -= deltaTime;
    if (this.successFlash > 0) this.successFlash -= deltaTime;

    // Decay floating texts
    this.floatingTexts = this.floatingTexts.filter(t => {
      t.life -= deltaTime;
      t.y -= dt * 25;
      return t.life > 0;
    });

    // Time decay check
    if (!this.isDead) {
      this.timeLeft -= deltaTime;
      if (this.timeLeft <= 0) {
        this.triggerMiss("TIMEOUT!");
      }
    }
  }

  finishGame() {
    const baseScore = this.score;
    const coins = Math.floor(baseScore / 70);

    this.scoreBreakdown = {
      rows: [
        { label: 'Swipe Score', value: baseScore, points: baseScore },
        { label: 'Max Combo', value: `x${this.maxCombo} Streak`, points: this.maxCombo * 20 }
      ],
      total: baseScore + this.maxCombo * 20,
      coinsEarned: coins
    };

    this.score = baseScore + this.maxCombo * 20;

    if (window.awardCoins && coins > 0) {
      window.awardCoins(coins, 'Reflex Rush Match');
    }

    this.container.audio.play('gameover');
    this.gameOver();
  }

  render(ctx) {
    // 1. Clear background
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    const cy = this.height / 2;

    // Success flash overlay
    if (this.successFlash > 0) {
      const alpha = this.successFlash / 120;
      ctx.fillStyle = `rgba(16, 185, 129, ${alpha * 0.14})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // Damage flash overlay
    if (this.redFlashTimer > 0) {
      const alpha = this.redFlashTimer / 100;
      ctx.fillStyle = `rgba(255, 59, 48, ${alpha * 0.2})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. Draw circular countdown warning bar
    const ratio = Math.max(0, this.timeLeft / (this.maxTime - this.combo * 45));
    ctx.strokeStyle = ratio > 0.3 ? '#00f0ff' : '#ff3b30';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 75, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.stroke();

    // Inner grey guide
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 75, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Draw Target Arrow Symbol in center
    ctx.fillStyle = ratio > 0.3 ? '#f0f0f8' : '#ff3b30';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "bold 44px 'Press Start 2P', monospace";
    
    let arrowText = '';
    if (this.targetDirection === 'UP') arrowText = '↑';
    if (this.targetDirection === 'DOWN') arrowText = '↓';
    if (this.targetDirection === 'LEFT') arrowText = '←';
    if (this.targetDirection === 'RIGHT') arrowText = '→';

    ctx.fillText(arrowText, cx, cy);

    // 4. Draw drag swipe trails (neon blue line)
    if (this.swipeTrail.length > 1) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(this.swipeTrail[0].x, this.swipeTrail[0].y);
      for (let i = 1; i < this.swipeTrail.length; i++) {
        ctx.lineTo(this.swipeTrail[i].x, this.swipeTrail[i].y);
      }
      ctx.stroke();
    }

    // 5. Draw floating pops
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    this.floatingTexts.forEach(t => {
      const alpha = t.life / t.maxLife;
      ctx.fillStyle = t.color || `rgba(255, 215, 0, ${alpha})`;
      ctx.fillText(t.text, t.x, t.y);
    });

    // Score HUD indicators
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`STREAK: ${this.combo}`, 20, 50);
    ctx.textAlign = 'right';
    ctx.fillText(`LIVES: ${'♥'.repeat(this.lives)}`, this.width - 20, 50);

    ctx.fillStyle = '#8888a8';
    ctx.font = "bold 10px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.fillText("SWIPE IN DIRECTION OF THE ARROW!", cx, cy + 120);
  }

  getControls() {
    return [
      { key: 'DRAG & SWIPE', action: 'Drag mouse in direction of arrow' },
      { key: 'W/A/S/D / ARROWS', action: 'Keyboard arrows shortcuts' }
    ];
  }

  getFunStat() {
    return `Max swipe streak combo: x${this.maxCombo}`;
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
