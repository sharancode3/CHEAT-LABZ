import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

export default class KeyFrenzy extends GameBase {
  static get logicalWidth() { return 600; }
  static get logicalHeight() { return 400; }
  
  constructor(canvas, container) {
    super(canvas, container);
    this.letters = "abcdefghijklmnopqrstuvwxyz".split('');
    
    // Game variables
    this.currentKey = '';
    this.lastKey = '';
    this.timer = 0;
    this.timePerKey = 1200; // start at 1.2s
    this.minTimePerKey = 450;
    
    this.correctCount = 0;
    this.keyState = 'idle'; // 'idle', 'hit', 'miss'
    this.stateTimer = 0;

    // Blind round timers
    this.isBlind = false;
    this.blindTimer = 0;

    // Beep tracker
    this.lastBeepSec = -1;

    // UI Juice
    this.floatingTexts = [];
    this.shakeOffset = { x: 0, y: 0 };
    this.successFlash = 0;
  }

  init() {
    this.score = 0;
    this.lives = 3;
    this.correctCount = 0;
    this.timePerKey = 1200;
    
    this.currentKey = '';
    this.lastKey = '';
    this.timer = 0;
    this.keyState = 'idle';
    this.stateTimer = 0;
    
    this.isBlind = false;
    this.blindTimer = 0;
    this.lastBeepSec = -1;
    this.floatingTexts = [];
    this.shakeOffset = { x: 0, y: 0 };
    this.successFlash = 0;

    this.nextKey();
    
    let runs = Storage.get('key-frenzy_runs', 0);
    Storage.set('key-frenzy_runs', runs + 1);
  }

  nextKey() {
    // Prevent duplicates
    let pick = '';
    do {
      pick = this.letters[Math.floor(Math.random() * this.letters.length)];
    } while (pick === this.lastKey);

    this.lastKey = this.currentKey;
    this.currentKey = pick;
    this.timer = this.timePerKey;
    
    // Every 5th key is a blind round
    this.isBlind = (this.correctCount + 1) % 5 === 0;
    this.blindTimer = this.isBlind ? 800 : 0; // 500ms display + 300ms fade

    this.keyState = 'idle';
    this.shakeOffset = { x: 0, y: 0 };
    this.lastBeepSec = -1;
  }

  onInput(key, event) {
    if (this.keyState !== 'idle') return;
    const k = key.toLowerCase();
    
    if (k.length > 1 || !this.letters.includes(k)) return;

    if (k === this.currentKey) {
      this.handleHit();
    } else {
      this.handleMiss();
    }
  }

  handleHit() {
    this.keyState = 'hit';
    this.stateTimer = 220;
    this.correctCount++;
    this.successFlash = 150;

    let points = 10;
    const ratio = this.timer / this.timePerKey;
    
    // Speed bonus
    if (ratio > 0.6) points += 5;

    // Check blind round correct
    if (this.isBlind) {
      points *= 2;
      this.container.audio.play('perfect');
      this.floatingTexts.push({
        x: this.width / 2,
        y: this.height / 2 - 50,
        text: `BLIND HIT! +${points}`,
        life: 1000,
        maxLife: 1000,
        color: '#ffd93d'
      });
    } else {
      this.container.audio.play('coin');
      this.floatingTexts.push({
        x: this.width / 2,
        y: this.height / 2 - 40,
        text: `+${points}`,
        life: 600,
        maxLife: 600,
        color: '#00f0ff'
      });
    }

    this.score += points;

    // Speed up every 5 hits
    if (this.correctCount % 5 === 0 && this.timePerKey > this.minTimePerKey) {
      this.timePerKey -= 60;
    }
  }

  handleMiss() {
    this.container.audio.play('damage');
    this.keyState = 'miss';
    this.stateTimer = 350;
    this.lives--;

    this.container.shake(200, 4.5);
  }

  update(deltaTime) {
    // Floating texts update
    const dt = deltaTime / 1000;
    this.floatingTexts = this.floatingTexts.filter(t => {
      t.life -= deltaTime;
      t.y -= dt * 30; // float up
      return t.life > 0;
    });

    if (this.successFlash > 0) this.successFlash -= deltaTime;

    if (this.keyState === 'idle') {
      this.timer -= deltaTime;
      if (this.isBlind && this.blindTimer > 0) {
        this.blindTimer -= deltaTime;
      }

      // Beep sound ticking when timer is low (under 35%)
      const ratio = this.timer / this.timePerKey;
      if (ratio < 0.35) {
        const secTick = Math.floor(this.timer / 150); // beep every 150ms
        if (secTick !== this.lastBeepSec) {
          this.lastBeepSec = secTick;
          this.container.audio.play('blip');
        }
      }

      if (this.timer <= 0) {
        this.handleMiss();
      }
    } else {
      // Waiting for hit/miss animations
      this.stateTimer -= deltaTime;
      
      if (this.keyState === 'miss') {
        // Red shake offsets
        this.shakeOffset.x = (Math.random() - 0.5) * 6;
        this.shakeOffset.y = (Math.random() - 0.5) * 6;
      }

      if (this.stateTimer <= 0) {
        if (this.lives <= 0) {
          this.finishGame();
        } else {
          this.nextKey();
        }
      }
    }
  }

  finishGame() {
    const hits = this.correctCount;
    const misses = Math.max(0, 3 - this.lives);
    const accuracy = Math.floor((hits / (hits + misses)) * 100) || 0;

    const baseScore = this.score;
    const accuracyBonus = hits * 15;
    const totalScore = baseScore + accuracyBonus;
    const coins = Math.floor(totalScore / 30);

    this.scoreBreakdown = {
      rows: [
        { label: 'Keys Typed', value: hits, points: baseScore },
        { label: 'Accuracy Rating', value: `${accuracy}%`, points: accuracyBonus }
      ],
      total: totalScore,
      coinsEarned: coins
    };

    this.score = totalScore;
    if (window.awardCoins && coins > 0) {
      window.awardCoins(coins, 'Key Frenzy Score');
    }

    this.gameOver();
  }

  render(ctx) {
    // 1. Clear background
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    const cy = this.height / 2;

    // Draw correct green overlay flash
    if (this.successFlash > 0) {
      const alpha = this.successFlash / 150;
      ctx.fillStyle = `rgba(16, 185, 129, ${alpha * 0.15})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. Draw Arc Timer Ring (Canvas Arc)
    if (this.keyState === 'idle') {
      const radius = 64;
      const ratio = Math.max(0, this.timer / this.timePerKey);
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * ratio);
      
      // Determine outline thickness based on time warning
      let lineWidth = 6;
      if (ratio < 0.1) {
        // Oscillation between 6px and 10px under 10%
        lineWidth = 6 + 4 * Math.abs(Math.sin(performance.now() / 60));
      }

      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle, false);
      ctx.strokeStyle = ratio > 0.3 ? '#fbbf24' : '#ff3b30'; // yellow to red
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // 3. Draw Keycap Card
    let scale = 1.0;
    let bgColor = '#1a1a24';
    let textColor = '#8888a8';
    let text = '?';
    let isErrorOutline = false;

    if (this.keyState === 'hit') {
      scale = 1.15;
      bgColor = '#10b981'; // green
      textColor = '#060608';
      text = this.currentKey.toUpperCase();
    } else if (this.keyState === 'miss') {
      scale = 0.9;
      bgColor = '#ff3b30'; // red
      textColor = '#ffffff';
      text = this.currentKey.toUpperCase();
      isErrorOutline = true;
    } else {
      // Idle state
      text = this.currentKey.toUpperCase();
      if (this.isBlind) {
        if (this.blindTimer > 300) {
          textColor = '#f0f0f8';
        } else if (this.blindTimer > 0) {
          const alpha = this.blindTimer / 300;
          textColor = `rgba(240, 240, 248, ${alpha})`;
        } else {
          text = '?';
          textColor = '#4a4a62';
        }
      } else {
        textColor = '#f0f0f8';
      }
    }

    const kw = 90 * scale;
    const kh = 90 * scale;
    const kx = cx - kw / 2 + this.shakeOffset.x;
    const ky = cy - kh / 2 + this.shakeOffset.y;

    // Card Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(kx + 3, ky + 7, kw, kh, 8);
    ctx.fill();

    // Cap fill
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(kx, ky, kw, kh, 8);
    ctx.fill();

    // Outline
    ctx.strokeStyle = isErrorOutline ? '#ff3b30' : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw key letter
    ctx.fillStyle = textColor;
    ctx.font = `bold ${34 * scale}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx + this.shakeOffset.x, cy + this.shakeOffset.y);

    // 4. Draw Floating Score Texts
    this.floatingTexts.forEach(t => {
      const alpha = t.life / t.maxLife;
      ctx.fillStyle = t.color || `rgba(255, 215, 0, ${alpha})`;
      ctx.font = "bold 13px 'JetBrains Mono', monospace";
      ctx.fillText(t.text, t.x, t.y);
    });

    // Beep warning indicators
    if (this.keyState === 'idle' && (this.timer / this.timePerKey) < 0.3) {
      ctx.fillStyle = 'rgba(255,59,48,0.15)';
      ctx.font = "bold 10px 'Press Start 2P', monospace";
      ctx.fillText("HURRY!", cx, cy + 90);
    }
  }

  getControls() {
    return [
      { key: 'A-Z', action: 'Press Matching Key' }
    ];
  }

  getFunStat() {
    return `Correct keystrokes: ${this.correctCount} (Difficulty level: ${Math.floor((1200 - this.timePerKey) / 60) + 1})`;
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
