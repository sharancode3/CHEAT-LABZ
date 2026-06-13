import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

const WORD_LIST = [
  "ALGORITHM", "BANDWIDTH", "COMPILER", "DEBUGGER", "ENCRYPTION",
  "FIREWALL", "GATEWAY", "HACKER", "ITERATION", "JAVASCRIPT",
  "KEYBOARD", "LATENCY", "MALWARE", "NETWORK", "OVERFLOW",
  "PROTOCOL", "QUANTUM", "ROUTER", "SERVER", "TERMINAL",
  "UPLOAD", "VARIABLE", "WIRELESS", "XML", "YOTTABYTE", "ZIP"
];

export default class CipherQuest extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas || 'game-canvas', { ...config, 
      name: 'cipher-quest',
      description: 'Decode the Caesar-cipher word. Type your answer. Hints cost points.',
      width: 600,
      height: 400
    });

    this.scoreEl = document.getElementById('game-score');
    this.roundEl = document.getElementById('game-round');

    this.init();
  }

  onStart() {
    this.round = 1;
    this.maxRounds = 10;
    this.maxTime = 30000; // 30 seconds
    
    this.alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    
    this.nextRound();
    
    let runs = Storage.get('cipher-quest_runs', 0);
    Storage.set('cipher-quest_runs', runs + 1);
  }

  nextRound() {
    this.word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    this.shift = Math.floor(Math.random() * 25) + 1; // 1 to 25
    this.encryptedWord = this.encrypt(this.word, this.shift);
    
    this.typedWord = "";
    this.timeLeft = this.maxTime;
    
    this.hints = {}; // Tracks which letters have been revealed as hints
    
    this.shakeTimer = 0;
    
    this.updateUI();
  }

  encrypt(word, shift) {
    let result = "";
    for (let i = 0; i < word.length; i++) {
      let charCode = word.charCodeAt(i);
      let newCode = ((charCode - 65 + shift) % 26) + 65;
      result += String.fromCharCode(newCode);
    }
    return result;
  }

  onInput(key, event) {
    if (this.state !== 'PLAYING') return;

    if (key === 'h') {
      this.useHint();
      return;
    }

    // Only accept alphabet
    if (key.length === 1 && /[a-z]/i.test(key)) {
      const inputChar = key.toUpperCase();
      const targetChar = this.word[this.typedWord.length];
      
      if (inputChar === targetChar) {
        // Correct
        Sound.playBlip();
        this.typedWord += inputChar;
        
        if (this.typedWord === this.word) {
          this.roundComplete();
        }
      } else {
        // Incorrect
        Sound.playDamage();
        this.shakeTimer = 300; // shake the input display
      }
    }
  }

  useHint() {
    // Find an unhinted letter that also hasn't been typed yet
    let availableHints = [];
    for (let i = 0; i < this.word.length; i++) {
      if (!this.hints[this.encryptedWord[i]] && i >= this.typedWord.length) {
        availableHints.push(this.encryptedWord[i]);
      }
    }
    
    if (availableHints.length > 0) {
      Sound.playCoin();
      // Cost 20 points
      this.score = Math.max(0, this.score - 20);
      this.updateUI();
      
      const toHint = availableHints[Math.floor(Math.random() * availableHints.length)];
      // calculate correct decoded letter
      const charCode = toHint.charCodeAt(0);
      const decodedCode = ((charCode - 65 - this.shift + 26) % 26) + 65;
      this.hints[toHint] = String.fromCharCode(decodedCode);
    }
  }

  roundComplete() {
    Sound.playCoin();
    
    let roundScore = 100;
    // Time bonus
    const timeBonus = Math.floor((this.timeLeft / this.maxTime) * 50);
    this.score += roundScore + timeBonus;
    
    this.round++;
    if (this.round > this.maxRounds) {
      Sound.playGameOver();
      this.gameOver();
    } else {
      this.nextRound();
    }
  }

  update(deltaTime) {
    if (this.shakeTimer > 0) this.shakeTimer -= deltaTime;
    
    this.timeLeft -= deltaTime;
    if (this.timeLeft <= 0) {
      // Time out -> Next round, no score, just penalize or next
      Sound.playDamage();
      this.round++;
      if (this.round > this.maxRounds) {
        Sound.playGameOver();
        this.gameOver();
      } else {
        this.nextRound();
      }
    }
  }

  updateUI() {
    if (this.scoreEl) this.scoreEl.innerText = this.score;
    if (this.roundEl) this.roundEl.innerText = `ROUND ${this.round}/${this.maxRounds}`;
  }

  draw() {
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw timer bar
    const ratio = Math.max(0, this.timeLeft / this.maxTime);
    this.ctx.fillStyle = ratio > 0.25 ? '#00d4aa' : '#ff6b6b';
    this.ctx.fillRect(0, 0, this.canvas.width * ratio, 6);

    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    // Encrypted word
    this.ctx.fillStyle = '#555570';
    this.ctx.font = '24px "Press Start 2P"';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.encryptedWord, cx, cy - 40);

    // Typed word
    let shakeX = 0;
    if (this.shakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * 10;
      this.ctx.fillStyle = '#ff6b6b';
    } else {
      this.ctx.fillStyle = '#00d4aa';
    }
    
    // Draw typed part and underscores for rest
    let displayStr = "";
    for (let i = 0; i < this.word.length; i++) {
      if (i < this.typedWord.length) {
        displayStr += this.typedWord[i];
      } else {
        displayStr += "_";
      }
    }
    
    this.ctx.fillText(displayStr, cx + shakeX, cy + 20);

    // Draw active hints
    this.ctx.fillStyle = '#f0f0f8';
    this.ctx.font = '10px "DM Sans"';
    this.ctx.textAlign = 'left';
    let hintY = cy + 80;
    this.ctx.fillText('HINTS (Press H):', cx - 100, hintY);
    hintY += 20;
    for (let k in this.hints) {
      this.ctx.fillText(`${k} → ${this.hints[k]}`, cx - 100, hintY);
      hintY += 15;
    }
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
});
