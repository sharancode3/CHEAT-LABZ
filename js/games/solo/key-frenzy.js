import { GameBase } from '../../core/game-base.js';

class KeyFrenzy extends GameBase {
  static logicalWidth = 560;
  static logicalHeight = 420;

  init() {
    this.currentIndex = 0;
    this.score = 0;
    this.lives = 3;
    this.isOver = false;

    this.combo = 0;
    this.shakeTime = 0;
    this.feedbackType = null; // 'correct', 'miss', 'expired'
    this.feedbackTimer = 0;

    this.keyTimer = 0; // time this key has been active

    this.sequence = [];
    this.blindRounds = new Set();
    this.generateSequence();

    this.resetTimerLimit();
    this.timeRemaining = this.timeLimit;
  }

  generateSequence() {
    // Pools
    const letters = "abcdefghijklmnopqrstuvwxyz";
    const digits = "0123456789";
    const symbols = "!@#$";
    const capitals = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    let pool = letters;
    if (this.level >= 4) pool += digits;
    if (this.level >= 7) pool += symbols;
    if (this.level === 10) pool += capitals;

    const poolArr = pool.split('');
    this.sequence = [];

    let prevChar = '';
    for (let i = 0; i < 30; i++) {
      let char = this.randomChoice(poolArr);
      while (char === prevChar) {
        char = this.randomChoice(poolArr);
      }
      this.sequence.push(char);
      prevChar = char;
    }

    // Set blind rounds
    this.blindRounds.clear();
    const lvl = this.level;
    for (let i = 0; i < 30; i++) {
      if (lvl >= 4 && lvl <= 6 && (i + 1) % 7 === 0) {
        this.blindRounds.add(i);
      } else if (lvl >= 7 && lvl <= 9 && (i + 1) % 5 === 0) {
        this.blindRounds.add(i);
      } else if (lvl === 10 && (i + 1) % 3 === 0) {
        this.blindRounds.add(i);
      }
    }
  }

  randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  resetTimerLimit() {
    const limits = [0, 3000, 2500, 2200, 2000, 1800, 1600, 1400, 1200, 1000, 800];
    this.timeLimit = limits[this.level] || 800;
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    this.keyTimer += delta;

    // Feedback visual timer
    if (this.feedbackTimer > 0) {
      this.feedbackTimer = Math.max(0, this.feedbackTimer - delta);
      if (this.feedbackTimer === 0) {
        this.feedbackType = null;
      }
    }

    // Key cap horizontal shake timer
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - delta);
    }

    // Timer rings
    this.timeRemaining -= delta;
    if (this.timeRemaining <= 0) {
      // Key expired
      this.lives--;
      this.combo = 0;
      this.feedbackType = 'expired';
      this.feedbackTimer = 300;
      this.timeRemaining = this.timeLimit;
      this.keyTimer = 0;
      return;
    }

    // Read Input
    const inp = this.input;
    let printableKey = null;
    for (const key of inp.pressed) {
      if (key.length === 1) {
        printableKey = key;
        break;
      }
    }

    if (printableKey) {
      const correctKey = this.sequence[this.currentIndex];
      if (printableKey === correctKey) {
        // Hit!
        this.combo++;
        let basePoints = 10;
        const isBlind = this.blindRounds.has(this.currentIndex);
        const blindHit = isBlind && (this.keyTimer >= 600); // hit after it faded!

        if (blindHit) {
          basePoints = 25; // Blind hit bonus
        }

        const timeBonus = Math.floor((this.timeRemaining / this.timeLimit) * 20);
        this.score += (basePoints + timeBonus) * this.level;

        // Feedback
        this.feedbackType = 'correct';
        this.feedbackTimer = 120;

        // Advance sequence
        this.currentIndex++;
        if (this.currentIndex >= 30) {
          this.levelComplete();
        } else {
          this.resetTimerLimit();
          this.timeRemaining = this.timeLimit;
          this.keyTimer = 0;
        }
      } else {
        // Miss!
        this.combo = 0;
        this.shakeTime = 150;
        this.feedbackType = 'miss';
        this.feedbackTimer = 150;
      }
    }
  }

  render(ctx) {
    this.clear();

    const cx = this.W / 2;
    const cy = this.H / 2;

    // Draw correct/miss screen flashes
    if (this.feedbackType === 'correct') {
      ctx.fillStyle = 'rgba(0, 255, 100, 0.15)';
      ctx.fillRect(0, 0, this.W, this.H);
    } else if (this.feedbackType === 'miss' || this.feedbackType === 'expired') {
      ctx.fillStyle = 'rgba(255, 50, 50, 0.15)';
      ctx.fillRect(0, 0, this.W, this.H);
    }

    // Key Cap Shake Horizontal Offset
    let shakeOffset = 0;
    if (this.shakeTime > 0) {
      // oscillate ±8px
      const stage = Math.floor(this.shakeTime / 25) % 2;
      shakeOffset = stage === 0 ? -8 : 8;
    }

    // Draw Key Cap
    const size = 160;
    const rx = cx - size / 2 + shakeOffset;
    const ry = cy - size / 2;

    ctx.save();
    // Key bottom shadow border (physical key)
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    this.drawRoundedRect(ctx, rx, ry + 4, size, size, 16);
    ctx.fill();

    // Key surface face
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    this.drawRoundedRect(ctx, rx, ry, size, size, 16);
    ctx.fill();
    ctx.stroke();

    // Scale feedback pulse on correct hit
    let drawScale = 1.0;
    if (this.feedbackType === 'correct' && this.feedbackTimer > 0) {
      drawScale = 0.92;
    }

    // Centered Key text representation
    ctx.translate(cx + shakeOffset, cy);
    ctx.scale(drawScale, drawScale);

    const isBlind = this.blindRounds.has(this.currentIndex);
    const correctKey = this.sequence[this.currentIndex] || '';
    
    let charOpacity = 1.0;
    if (isBlind) {
      if (this.keyTimer < 600) {
        charOpacity = 1.0;
      } else if (this.keyTimer < 800) {
        charOpacity = 1.0 - (this.keyTimer - 600) / 200;
      } else {
        charOpacity = 0.0;
      }
    }

    ctx.font = "bold 64px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (charOpacity > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${charOpacity})`;
      ctx.fillText(correctKey, 0, 0);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillText('?', 0, 0);
    }
    ctx.restore();

    // Draw timer ring around keycap
    const radius = 80;
    const progress = Math.max(0, this.timeRemaining / this.timeLimit);
    
    // Ring thickness oscillates when < 10%
    let ringWidth = 6;
    if (progress <= 0.1) {
      const pulseMag = Math.sin(this.totalTime / 80);
      ringWidth = 6 + pulseMag * 2;
    }

    ctx.strokeStyle = progress > 0.5 ? '#ff6b6b' : progress > 0.25 ? '#ffd93d' : '#ff4757';
    ctx.lineWidth = ringWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 20, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * progress);
    ctx.stroke();

    // Thin progress bar at bottom of canvas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, this.H - 4, this.W, 4);

    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(0, this.H - 4, (this.currentIndex / 30) * this.W, 4);

    // Draw combo multiplier indicator
    if (this.combo >= 5) {
      ctx.fillStyle = '#ff6b6b';
      ctx.font = "bold 14px 'DM Sans', sans-serif";
      ctx.textAlign = 'center';
      
      let comboPulse = 1.0;
      if (this.feedbackType === 'correct') {
        comboPulse = 1.15;
      }
      
      ctx.save();
      ctx.translate(cx, cy - 120);
      ctx.scale(comboPulse, comboPulse);
      ctx.fillText(`×${this.combo} COMBO`, 0, 0);
      ctx.restore();
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

window.GameClass = KeyFrenzy;
export default KeyFrenzy;
