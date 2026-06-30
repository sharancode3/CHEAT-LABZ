import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

export default class BeatDrop extends GameBase {
  static get logicalWidth() { return 600; }
  static get logicalHeight() { return 600; }
  
  constructor(canvas, container) {
    super(canvas, container);

    this.lives = 3;
    
    this.player = {
      x: 300, y: 400,
      r: 12,
      z: 0,
      vz: 0,
      isJumping: false
    };

    this.targetMouse = { x: 300, y: 400 };
    
    this.rings = [];
    this.particles = [];
    this.warnings = []; // Ring emitters warning timers
    
    this.spawnTimer = 0;
    this.baseSpawnRate = 1600; // ms
    this.ringSpeed = 120;
    
    this.redFlashTimer = 0;
  }

  init() {
    this.lives = 3;
    this.score = 0;
    
    this.player = {
      x: 300, y: 400,
      r: 12,
      z: 0,
      vz: 0,
      isJumping: false
    };

    this.targetMouse = { x: 300, y: 400 };
    this.rings = [];
    this.particles = [];
    this.warnings = [];
    this.spawnTimer = 500;
    this.ringSpeed = 120;
    this.redFlashTimer = 0;

    let runs = Storage.get('beat-drop_runs', 0);
    Storage.set('beat-drop_runs', runs + 1);
  }

  onInput(key, event) {
    const k = key.toLowerCase();
    if ((k === ' ' || k === 'enter' || k === 'arrowup' || k === 'w') && this.state === 'PLAYING') {
      this.jump();
    }
  }

  onMouseDown(x, y, event) {
    if (this.state === 'PLAYING') {
      this.jump();
    }
  }

  jump() {
    if (!this.player.isJumping) {
      this.player.isJumping = true;
      this.player.vz = 420; // Jump force
      this.container.audio.play('blip');
      
      // Initial jump ring sparks
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        this.particles.push({
          x: this.player.x, y: this.player.y,
          vx: Math.cos(a) * 45,
          vy: Math.sin(a) * 45,
          life: 200,
          maxLife: 200,
          color: 'rgba(108, 99, 255, 0.45)'
        });
      }
    }
  }

  spawnWarningEmitter() {
    // Add warning at center (which expands 0.5s later)
    this.warnings.push({
      x: this.width / 2,
      y: this.height / 2,
      timeLeft: 550 // 550ms blink warning
    });
  }

  spawnRing(x, y) {
    this.rings.push({
      x: x, y: y,
      r: 10,
      thick: 5,
      hit: false
    });
    this.container.audio.play('blip');
  }

  spawnLandingDust() {
    // 8 radial dust particles scattering outwards
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(a) * 85,
        vy: Math.sin(a) * 85,
        life: 300 + Math.random() * 150,
        maxLife: 450,
        color: '#8888a8'
      });
    }
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    
    if (this.redFlashTimer > 0) this.redFlashTimer -= deltaTime;
    this.score += deltaTime * 0.1; // slowly gain score over survival

    this.ringSpeed = 120 + this.score * 0.45;
    this.baseSpawnRate = Math.max(650, 1600 - this.score * 12);

    // Read pointer coordinate targets
    const m = this.container.input.getMousePosition();
    if (m && m.x > 0) {
      this.targetMouse.x = m.x;
      this.targetMouse.y = m.y;
    }

    // Smooth movement interpolation
    this.player.x += (this.targetMouse.x - this.player.x) * 12 * dt;
    this.player.y += (this.targetMouse.y - this.player.y) * 12 * dt;

    // Jump gravity kinematics
    if (this.player.isJumping) {
      this.player.z += this.player.vz * dt;
      this.player.vz -= 1150 * dt; // gravity deceleration

      if (this.player.z <= 0) {
        this.player.z = 0;
        this.player.isJumping = false;
        this.spawnLandingDust(); // visual landing puff
        this.container.audio.play('blip');
      }
    }

    // Warnings ticks
    for (let i = this.warnings.length - 1; i >= 0; i--) {
      const w = this.warnings[i];
      w.timeLeft -= deltaTime;
      if (w.timeLeft <= 0) {
        this.spawnRing(w.x, w.y);
        this.warnings.splice(i, 1);
      }
    }

    // Emitters spawns schedule
    this.spawnTimer -= deltaTime;
    if (this.spawnTimer <= 0) {
      this.spawnWarningEmitter();
      this.spawnTimer = this.baseSpawnRate;
    }

    // Soundwave rings expansions
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.r += this.ringSpeed * dt;

      // Check distance of player center from emitter
      const dx = this.player.x - r.x;
      const dy = this.player.y - r.y;
      const dist = Math.hypot(dx, dy);

      // Verify intersection overlap
      if (!r.hit) {
        if (Math.abs(r.r - dist) < (this.player.r + r.thick)) {
          // If player is not currently jumped over it
          if (this.player.z < 20) {
            this.loseLife();
            r.hit = true;
          }
        }
      }

      if (r.r > this.width) {
        this.rings.splice(i, 1);
      }
    }

    // Particles physics
    this.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= deltaTime;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  loseLife() {
    this.container.audio.play('damage');
    this.lives--;
    this.redFlashTimer = 100;
    this.container.shake(220, 4);

    if (this.lives <= 0) {
      this.finishGame();
    }
  }

  finishGame() {
    const finalScore = Math.floor(this.score * 10);
    const coins = Math.floor(finalScore / 40);

    this.scoreBreakdown = {
      rows: [
        { label: 'Survival Time Score', value: `${Math.floor(this.score)}s`, points: finalScore }
      ],
      total: finalScore,
      coinsEarned: coins
    };

    this.score = finalScore;

    if (window.awardCoins && coins > 0) {
      window.awardCoins(coins, 'Beat Drop Match');
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

    // Draw damage flash overlay
    if (this.redFlashTimer > 0) {
      const alpha = this.redFlashTimer / 100;
      ctx.fillStyle = `rgba(255, 59, 48, ${alpha * 0.22})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. Draw Emitter center
    ctx.fillStyle = '#14141f';
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fill();

    // 3. Draw Emitters warnings (blinking red rings)
    this.warnings.forEach(w => {
      const isBlink = Math.floor(w.timeLeft / 100) % 2 === 0;
      ctx.fillStyle = isBlink ? '#ff3b30' : 'transparent';
      ctx.beginPath();
      ctx.arc(w.x, w.y, 26, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Expanding soundwave rings
    ctx.lineWidth = 5;
    for (let r of this.rings) {
      ctx.strokeStyle = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    }

    // 5. Dust particles
    for (let p of this.particles) {
      ctx.fillStyle = p.color || '#ffffff';
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1.0;

    // 6. Draw Player Shadow on ground
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.r, 0, Math.PI * 2);
    ctx.fill();

    // 7. Draw Player (Scales and translates y slightly based on Z jump)
    const zOffset = this.player.z * 0.55;
    const scale = 1.0 + (this.player.z / 140);
    const drawRadius = this.player.r * scale;

    ctx.fillStyle = '#6c63ff'; // neon purple
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#6c63ff';
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y - zOffset, drawRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Center pilot white dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y - zOffset, drawRadius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // HUD Stats
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`LIVES: ${'♥'.repeat(this.lives)}`, 20, 50);
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${Math.floor(this.score * 10)}`, this.width - 20, 50);
  }

  getControls() {
    return [
      { key: 'SPACE / CLICK', action: 'Jump over expanding soundwaves' }
    ];
  }

  getFunStat() {
    return `Dodged speedwaves up to ${this.ringSpeed.toFixed(0)} px/s`;
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
