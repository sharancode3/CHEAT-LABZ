import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

const WORD_LIST = [
  "PULSE", "RHYTHM", "TEMPO", "BEAT", "SYNTH", "SOUND", "CYCLE", "OCTAVE",
  "CHORD", "DRUM", "SOUNDWAVE", "MELODY", "HARMONY", "TUNING", "RESONANCE"
];

export default class WordPulse extends GameBase {
  static get logicalWidth() { return 500; }
  static get logicalHeight() { return 500; }
  
  constructor(canvas, container) {
    super(canvas, container);

    this.audioCtx = null;
    this.word = "";
    this.charIndex = 0;
    
    // Rhythm config
    this.bpm = 100;
    this.beatInterval = 60 / 1000; // BPM 100 = 0.6 seconds per beat
    
    // Accumulators & timers
    this.beatAccumulator = 0;
    this.lastBeatAudioTime = 0;
    this.timePlayed = 0;

    // Visual juice lists
    this.rings = [];
    this.floatingTexts = [];
    
    // Game statistics
    this.streak = 0;
    this.maxStreak = 0;
    this.wordsCompleted = 0;
    this.isDead = false;
    this.redFlashTimer = 0;
  }

  init() {
    this.score = 0;
    this.lives = 3;
    this.timePlayed = 0;

    this.word = "";
    this.charIndex = 0;
    this.beatAccumulator = 0;
    
    this.rings = [];
    this.floatingTexts = [];
    this.streak = 0;
    this.maxStreak = 0;
    this.wordsCompleted = 0;
    this.isDead = false;
    this.redFlashTimer = 0;

    // Initialize AudioContext
    if (window.AudioContext || window.webkitAudioContext) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.lastBeatAudioTime = this.audioCtx.currentTime;
    } else {
      this.lastBeatAudioTime = performance.now() / 1000;
    }

    this.nextWord();

    let runs = Storage.get('word-pulse_runs', 0);
    Storage.set('word-pulse_runs', runs + 1);
  }

  nextWord() {
    this.word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    this.charIndex = 0;
  }

  onInput(key, event) {
    if (this.isDead) return;
    
    const k = key.toUpperCase();
    if (k.length !== 1 || k < 'A' || k > 'Z') return;

    // Read high precision time
    const hitTime = this.audioCtx ? this.audioCtx.currentTime : (performance.now() / 1000);
    
    // Find absolute difference to closest beat
    const timeSinceLast = hitTime - this.lastBeatAudioTime;
    const timeToNext = 0.6 - timeSinceLast;
    const diff = Math.min(Math.abs(timeSinceLast), Math.abs(timeToNext));

    // Verify rhythm timing window (±100ms)
    const isTimingMatch = diff <= 0.11; // 110ms leeway window

    const targetChar = this.word[this.charIndex];

    if (k === targetChar) {
      if (isTimingMatch) {
        // Correct on beat
        this.container.audio.play('blip');
        this.charIndex++;
        this.streak++;
        this.maxStreak = Math.max(this.maxStreak, this.streak);

        const cx = this.width / 2;
        const cy = this.height / 2;
        
        // Spawn radiating ripple ring
        this.rings.push({
          x: cx, y: cy,
          radius: 65,
          alpha: 1.0,
          color: '#00f0ff'
        });

        // Add float score
        let points = 10;
        if (this.streak >= 5) points *= 2; // streak multiplier
        this.score += points;

        this.floatingTexts.push({
          x: cx + (Math.random() - 0.5) * 40,
          y: cy - 60,
          text: this.streak >= 5 ? `PERFECT x2 +${points}` : `HIT +${points}`,
          life: 600,
          maxLife: 600,
          color: this.streak >= 5 ? '#ffd93d' : '#00f0ff'
        });

        if (this.charIndex >= this.word.length) {
          this.wordsCompleted++;
          this.score += 50; // word completion bonus
          this.container.audio.play('perfect');
          this.nextWord();
        }
      } else {
        // Correct letter but off-beat timing
        this.container.audio.play('damage');
        this.streak = 0;
        this.floatingTexts.push({
          x: this.width / 2,
          y: this.height / 2 - 65,
          text: "OFF BEAT!",
          life: 500,
          maxLife: 500,
          color: '#f97316'
        });
        this.lives--;
        this.redFlashTimer = 100;
        this.container.shake(120, 2.5);
      }
    } else {
      // Mistyped character
      this.container.audio.play('damage');
      this.streak = 0;
      this.floatingTexts.push({
        x: this.width / 2,
        y: this.height / 2 - 65,
        text: "MISS!",
        life: 500,
        maxLife: 500,
        color: '#ff3b30'
      });
      this.lives--;
      this.redFlashTimer = 100;
      this.container.shake(150, 3.5);
    }

    if (this.lives <= 0) {
      this.finishGame();
    }
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    this.timePlayed += deltaTime;

    if (this.redFlashTimer > 0) this.redFlashTimer -= deltaTime;

    // Decay floating texts
    this.floatingTexts = this.floatingTexts.filter(t => {
      t.life -= deltaTime;
      t.y -= dt * 25;
      return t.life > 0;
    });

    // Ripple rings updates
    this.rings.forEach(r => {
      r.radius += dt * 160;
      r.alpha -= dt * 2.2;
    });
    this.rings = this.rings.filter(r => r.alpha > 0);

    // Audio beat metronome scheduler (BPM 100 = 600ms)
    this.beatAccumulator += dt;
    if (this.beatAccumulator >= 0.6) {
      this.beatAccumulator -= 0.6;
      if (this.audioCtx) {
        this.lastBeatAudioTime = this.audioCtx.currentTime;
      } else {
        this.lastBeatAudioTime = performance.now() / 1000;
      }
      
      // Auto metronome clicks
      this.container.audio.play('blip');

      // Spawn beat ring
      this.rings.push({
        x: this.width / 2,
        y: this.height / 2,
        radius: 40,
        alpha: 0.6,
        color: 'rgba(255, 255, 255, 0.25)'
      });
    }
  }

  finishGame() {
    const coins = Math.floor(this.score / 25);

    this.scoreBreakdown = {
      rows: [
        { label: 'Words Formed', value: this.wordsCompleted, points: this.wordsCompleted * 50 },
        { label: 'Max Streak', value: `${this.maxStreak} Letters`, points: this.maxStreak * 10 }
      ],
      total: this.score,
      coinsEarned: coins
    };

    if (window.awardCoins && coins > 0) {
      window.awardCoins(coins, 'Word Pulse Score');
    }

    this.container.audio.play('gameover');
    this.gameOver();
  }

  render(ctx) {
    // 1. Clear background
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw damage flashes
    if (this.redFlashTimer > 0) {
      const alpha = this.redFlashTimer / 100;
      ctx.fillStyle = `rgba(255, 59, 48, ${alpha * 0.2})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    const cx = this.width / 2;
    const cy = this.height / 2;

    // 2. Draw radiating beat rings
    ctx.lineWidth = 2.5;
    for (let r of this.rings) {
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = r.alpha;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // 3. Visual Metronome Center Circle (Expands and contracts on beat)
    const beatProgress = this.beatAccumulator / 0.6; // 0 to 1
    const sizeScale = 1.0 + 0.35 * Math.max(0, 1.0 - beatProgress * 3.5); // expands sharp, decays
    const radius = 55 * sizeScale;
    
    // Outer timing ring guide
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 65, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#14141f';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 4. Draw Current Target Word
    const charWidth = 24;
    const startX = cx - (this.word.length * charWidth) / 2;
    ctx.font = '22px "Press Start 2P"';
    ctx.textAlign = 'center';
    
    for (let i = 0; i < this.word.length; i++) {
      const x = startX + i * charWidth + charWidth / 2;
      const y = cy + 120;

      if (i < this.charIndex) {
        // Typed: Neon blue
        ctx.fillStyle = '#00f0ff';
      } else {
        // Untyped: dim grey
        ctx.fillStyle = '#4a4a62';
      }
      ctx.fillText(this.word[i], x, y);
    }

    // 5. Drawing Floating Popups
    this.floatingTexts.forEach(t => {
      const alpha = t.life / t.maxLife;
      ctx.fillStyle = t.color || `rgba(255, 215, 0, ${alpha})`;
      ctx.font = "bold 13px 'JetBrains Mono', monospace";
      ctx.fillText(t.text, t.x, t.y);
    });

    // Streak / Score HUD
    ctx.fillStyle = '#f0f0f8';
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`STREAK: ${this.streak}`, 20, 50);
    ctx.textAlign = 'right';
    ctx.fillText(`LIVES: ${'♥'.repeat(this.lives)}`, this.width - 20, 50);

    ctx.fillStyle = '#8888a8';
    ctx.font = "bold 10px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.fillText("TYPE ON THE PULSE BEAT!", cx, cy - 100);
  }

  getControls() {
    return [
      { key: 'A-Z', action: 'Type letters on metronome beat' }
    ];
  }

  getFunStat() {
    return `Words formed: ${this.wordsCompleted} with a max streak of ${this.maxStreak} letters`;
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
