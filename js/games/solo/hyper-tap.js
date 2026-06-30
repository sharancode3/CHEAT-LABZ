import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

export default class HyperTap extends GameBase {
  static get logicalWidth() { return 500; }
  static get logicalHeight() { return 500; }
  
  constructor(canvas, container) {
    super(canvas, container);

    this.lives = 3;
    this.level = 1;
    
    this.tapTimes = [];
    this.targetRate = 3.0; // Target taps per second (180 BPM)
    this.actualRate = 0.0;
    
    // Hold progression matching variables
    this.holdTimer = 0;
    this.targetHoldTime = 2200; // Must hold for 2.2s
    
    // Metronome timer guides
    this.metronomeTimer = 0;
    this.visualScale = 1.0;
    this.rings = [];
    this.successFlash = 0;
  }

  init() {
    this.lives = 3;
    this.level = 1;
    this.score = 0;
    this.tapTimes = [];
    
    this.targetRate = 3.0;
    this.actualRate = 0.0;
    this.holdTimer = 0;
    this.metronomeTimer = 0;
    this.visualScale = 1.0;
    this.rings = [];
    this.successFlash = 0;

    let runs = Storage.get('hyper-tap_runs', 0);
    Storage.set('hyper-tap_runs', runs + 1);
  }

  onInput(key, event) {
    const k = key.toLowerCase();
    if (k === ' ' || k === 'enter') {
      this.registerTap();
    }
  }

  onMouseDown(x, y, event) {
    if (this.state === 'PLAYING') {
      this.registerTap();
    }
  }

  registerTap() {
    const now = performance.now();
    this.tapTimes.push(now);

    this.visualScale = 1.35; // Expands on tap click
    this.container.audio.play('coin');

    // Spawn a quick accent ring
    this.rings.push({
      radius: 45,
      alpha: 1.0
    });
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    const now = performance.now();

    // Fade visual scale back to normal
    if (this.visualScale > 1.0) {
      this.visualScale -= 2.0 * dt;
      if (this.visualScale < 1.0) this.visualScale = 1.0;
    }

    if (this.successFlash > 0) this.successFlash -= deltaTime;

    // Prune tap times older than 1.5 seconds
    this.tapTimes = this.tapTimes.filter(t => now - t < 1500);
    // Rate is size of tap history / time window
    this.actualRate = this.tapTimes.length / 1.5;

    // Evaluate matching deviation window (±0.45 taps per sec)
    const deviation = Math.abs(this.actualRate - this.targetRate);
    const isMatching = deviation <= 0.45;

    if (isMatching && this.tapTimes.length > 0) {
      this.holdTimer += deltaTime;
      if (this.holdTimer >= this.targetHoldTime) {
        this.levelCompleted();
      }
    } else {
      // Hold decays if not matching
      this.holdTimer = Math.max(0, this.holdTimer - deltaTime * 0.6);
    }

    // Metronome guide ticks sound at target BPM
    this.metronomeTimer += deltaTime;
    const metronomeInterval = 1000 / this.targetRate;
    if (this.metronomeTimer >= metronomeInterval) {
      this.metronomeTimer -= metronomeInterval;
      this.container.audio.play('blip');
      // Visual indicator expands metronome dot
      this.rings.push({
        radius: 40,
        alpha: 0.55
      });
    }

    // Update rings ripples
    this.rings.forEach(r => {
      r.radius += dt * 180;
      r.alpha -= dt * 2.2;
    });
    this.rings = this.rings.filter(r => r.alpha > 0);
  }

  levelCompleted() {
    this.container.audio.play('perfect');
    this.score += 150;
    this.level++;
    this.successFlash = 250;
    
    // Increment speed target rate (capping at 7.0 taps per second)
    this.targetRate = Math.min(7.0, 3.0 + this.level * 0.4);
    
    this.holdTimer = 0;
    this.tapTimes = [];
  }

  finishGame() {
    const baseScore = this.score;
    const coins = Math.floor(baseScore / 30);

    this.scoreBreakdown = {
      rows: [
        { label: 'Levels Cleared', value: `${this.level - 1} Rates`, points: baseScore }
      ],
      total: baseScore,
      coinsEarned: coins
    };

    if (window.awardCoins && coins > 0) {
      window.awardCoins(coins, 'Hyper Tap Run');
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

    // Draw success flashes
    if (this.successFlash > 0) {
      const alpha = this.successFlash / 250;
      ctx.fillStyle = `rgba(16, 185, 129, ${alpha * 0.15})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. Draw metronome pulse rings
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.0;
    for (let r of this.rings) {
      ctx.globalAlpha = r.alpha;
      ctx.beginPath();
      ctx.arc(cx, cy, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // 3. Central metronome dot
    const baseRad = 40;
    const drawR = baseRad * this.visualScale;
    
    // Determine matching indicator ring color
    const deviation = Math.abs(this.actualRate - this.targetRate);
    const isMatching = deviation <= 0.45;
    
    ctx.fillStyle = isMatching ? '#10b981' : '#ff3b30'; // green if matching, red otherwise
    ctx.beginPath();
    ctx.arc(cx, cy, drawR, 0, Math.PI * 2);
    ctx.shadowBlur = 12;
    ctx.shadowColor = isMatching ? '#10b981' : '#ff3b30';
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, drawR * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // 4. Circular Timing progress holds bar
    const progress = Math.min(1.0, this.holdTimer / this.targetHoldTime);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, 60, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();

    // 5. Draw Timing deviation pointer / gauge
    ctx.fillStyle = '#8888a8';
    ctx.font = '10px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(`TARGET: ${this.targetRate.toFixed(2)} taps/s`, cx, cy - 90);
    ctx.fillText(`ACTUAL: ${this.actualRate.toFixed(2)} taps/s`, cx, cy + 90);

    // Accuracy helper
    if (this.tapTimes.length > 0) {
      if (isMatching) {
        ctx.fillStyle = '#10b981';
        ctx.fillText("KEEP IT UP!", cx, cy + 120);
      } else {
        ctx.fillStyle = this.actualRate < this.targetRate ? '#ff9f0a' : '#ff3b30';
        ctx.fillText(this.actualRate < this.targetRate ? "TAP FASTER!" : "TAP SLOWER!", cx, cy + 120);
      }
    }

    // HUD Level / Score
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`STAGE: ${this.level}`, 20, 50);
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${this.score}`, this.width - 20, 50);
  }

  getControls() {
    return [
      { key: 'SPACE / CLICK', action: 'Tap to match target rate' }
    ];
  }

  getFunStat() {
    return `Completed rate targets at speed: ${this.targetRate.toFixed(2)}`;
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
