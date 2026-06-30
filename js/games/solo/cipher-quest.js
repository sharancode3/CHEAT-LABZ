import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

const WORD_LIST = [
  "ALGORITHM", "BANDWIDTH", "COMPILER", "DEBUGGER", "ENCRYPTION",
  "FIREWALL", "GATEWAY", "HACKER", "ITERATION", "JAVASCRIPT",
  "KEYBOARD", "LATENCY", "MALWARE", "NETWORK", "OVERFLOW",
  "PROTOCOL", "QUANTUM", "ROUTER", "SERVER", "TERMINAL",
  "UPLOAD", "VARIABLE", "WIRELESS", "XML", "YOTTABYTE", "ZIP"
];

export default class CipherQuest extends GameBase {
  static get logicalWidth() { return 600; }
  static get logicalHeight() { return 400; }
  
  constructor(canvas, container) {
    super(canvas, container);

    this.round = 1;
    this.maxRounds = 10;
    this.maxTime = 30000; // 30s
    this.timeLeft = 30000;

    this.word = "";
    this.encryptedWord = "";
    this.typedWord = "";
    this.wrongLetter = "";
    this.shift = 0;
    
    this.hints = {};
    this.shakeTimer = 0;
  }

  init() {
    this.round = 1;
    this.maxRounds = 10;
    this.maxTime = 30000;
    
    this.score = 0;
    this.nextRound();
    
    let runs = Storage.get('cipher-quest_runs', 0);
    Storage.set('cipher-quest_runs', runs + 1);
  }

  nextRound() {
    this.word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    this.shift = Math.floor(Math.random() * 21) + 3; // 3 to 23 shift
    this.encryptedWord = this.encrypt(this.word, this.shift);
    
    this.typedWord = "";
    this.wrongLetter = "";
    this.timeLeft = this.maxTime;
    this.hints = {};
    this.shakeTimer = 0;
  }

  encrypt(word, shift) {
    let result = "";
    for (let i = 0; i < word.length; i++) {
      const code = word.charCodeAt(i);
      // Caeser Shift caps A-Z
      const newCode = ((code - 65 + shift) % 26) + 65;
      result += String.fromCharCode(newCode);
    }
    return result;
  }

  onInput(key, event) {
    if (this.isDead || this.timeLeft <= 0) return;
    const k = key.toLowerCase();

    if (k === 'h') {
      this.useHint();
      return;
    }

    if (k.length === 1 && /[a-z]/i.test(k)) {
      const inputChar = k.toUpperCase();
      const targetChar = this.word[this.typedWord.length];
      
      if (inputChar === targetChar) {
        this.container.audio.play('blip');
        this.typedWord += inputChar;
        this.wrongLetter = "";
        
        if (this.typedWord === this.word) {
          this.roundComplete();
        }
      } else {
        this.container.audio.play('damage');
        this.wrongLetter = inputChar;
        this.shakeTimer = 250;
        this.container.shake(120, 3.5);
      }
    }
  }

  useHint() {
    let availableHints = [];
    for (let i = 0; i < this.word.length; i++) {
      if (!this.hints[this.encryptedWord[i]] && i >= this.typedWord.length) {
        availableHints.push(this.encryptedWord[i]);
      }
    }
    
    if (availableHints.length > 0) {
      this.container.audio.play('perfect');
      
      // Hint penalty cost
      this.score = Math.max(0, this.score - 15);
      
      const toHint = availableHints[Math.floor(Math.random() * availableHints.length)];
      const code = toHint.charCodeAt(0);
      const decoded = ((code - 65 - this.shift + 26) % 26) + 65;
      this.hints[toHint] = String.fromCharCode(decoded);
    }
  }

  roundComplete() {
    this.container.audio.play('coin');
    
    let points = 100;
    const timeBonus = Math.floor((this.timeLeft / this.maxTime) * 60);
    this.score += points + timeBonus;
    
    this.round++;
    if (this.round > this.maxRounds) {
      this.finishGame();
    } else {
      this.nextRound();
    }
  }

  update(deltaTime) {
    this.timeLeft -= deltaTime;

    if (this.shakeTimer > 0) {
      this.shakeTimer -= deltaTime;
      if (this.shakeTimer <= 0) {
        this.wrongLetter = "";
      }
    }

    if (this.timeLeft <= 0) {
      this.container.audio.play('damage');
      this.round++;
      if (this.round > this.maxRounds) {
        this.finishGame();
      } else {
        this.nextRound();
      }
    }
  }

  finishGame() {
    const baseScore = this.score;
    const coins = Math.floor(baseScore / 25);

    this.scoreBreakdown = {
      rows: [
        { label: 'Cipher Solves', value: `${Math.min(this.maxRounds, this.round - 1)} Rounds`, points: baseScore }
      ],
      total: baseScore,
      coinsEarned: coins
    };

    this.score = baseScore;

    if (window.awardCoins && coins > 0) {
      window.awardCoins(coins, 'Cipher Quest Score');
    }

    this.container.audio.play('gameover');
    this.gameOver();
  }

  render(ctx) {
    // 1. Clear background
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Draw top timer bar
    const ratio = Math.max(0, this.timeLeft / this.maxTime);
    ctx.fillStyle = ratio > 0.3 ? '#00f0ff' : '#ff3b30';
    ctx.fillRect(0, 0, this.width * ratio, 6);

    const cx = this.width / 2;
    const cy = this.height / 2;

    // 3. Draw Shift index key display
    ctx.fillStyle = '#fbbf24';
    ctx.font = '11px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(`KEY ENCRYPTION SHIFT: +${this.shift}`, cx, cy - 80);

    // 4. Encrypted cipher word
    ctx.fillStyle = '#8888a8';
    ctx.font = '22px "Press Start 2P"';
    ctx.fillText(this.encryptedWord, cx, cy - 35);

    // 5. Letter-by-letter decoding panel
    const charWidth = 26;
    const startX = cx - (this.word.length * charWidth) / 2;
    ctx.font = '22px "Press Start 2P"';

    for (let i = 0; i < this.word.length; i++) {
      const x = startX + i * charWidth + charWidth / 2;
      const y = cy + 25;

      // Draw bottom underline guide
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(x - charWidth / 2 + 2, y + 6, charWidth - 4, 3);

      if (i < this.typedWord.length) {
        // Correct text green
        ctx.fillStyle = '#10b981';
        ctx.fillText(this.typedWord[i], x, y);
      } else if (i === this.typedWord.length && this.wrongLetter && this.shakeTimer > 0) {
        // Incorrect character shaking in red
        const shakeX = (Math.random() - 0.5) * 5;
        ctx.fillStyle = '#ff3b30';
        ctx.fillText(this.wrongLetter, x + shakeX, y);
      }
    }

    // 6. Active hints reference
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS H FOR A DECODED LETTER HINT (-15 PTS)', cx, cy + 90);

    let hintY = cy + 120;
    const hintKeys = Object.keys(this.hints);
    if (hintKeys.length > 0) {
      ctx.fillStyle = '#8888a8';
      ctx.font = '12px "JetBrains Mono", monospace';
      const hintsText = hintKeys.map(k => `${k}→${this.hints[k]}`).join('   ');
      ctx.fillText(hintsText, cx, hintY);
    }

    // Round indicator
    ctx.fillStyle = '#f0f0f8';
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`ROUND: ${Math.min(this.maxRounds, this.round)}/${this.maxRounds}`, 20, 60);
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${this.score}`, this.width - 20, 60);
  }

  getControls() {
    return [
      { key: 'A-Z', action: 'Type decoded letter' },
      { key: 'H', action: 'Reveal letter hint' }
    ];
  }

  getFunStat() {
    return `Completed round ${this.round - 1} with total score ${this.score}`;
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
