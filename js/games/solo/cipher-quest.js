import { GameBase } from '../../core/game-base.js';

class CipherQuest extends GameBase {
  static logicalWidth = 600;
  static logicalHeight = 440;

  init() {
    this.wordsSolved = 0;
    this.score = 0;
    this.lives = 3;
    this.isOver = false;

    this.words = {
      3: ["cat", "dog", "map", "key", "web", "dns", "api", "git", "hex"],
      4: ["code", "hack", "data", "link", "port", "ping", "node", "host"],
      5: ["cyber", "virus", "cloud", "pixel", "logic", "cache", "token", "stack"],
      6: ["server", "router", "kernel", "binary", "system", "cipher", "matrix"],
      7: ["gateway", "encrypt", "decrypt", "network", "console", "compile"],
      8: ["firewall", "database", "compiler", "protocol", "software", "terminal"],
      9: ["algorithm", "bandwidth", "interface", "directory", "framework"],
      10: ["hypervisor", "repository", "connection", "javascript", "encryption"],
      12: ["cybersecurity", "supercomputer", "cryptography", "microservices"]
    };

    // Current word state
    this.currentWords = []; // Array of { word, encrypted, typedIndex, shakeTimer, correctTimers: [] }
    this.currentWordIdx = 0; // for dual words (Level 9 / 10)
    
    this.shift = 3;
    this.wordTimer = 0;
    this.wordTimeLimit = 20000;
    this.totalTime = 0;

    this.hintsUsed = 0;
    this.decoyWord = ""; // Level 8 decoy

    this.nextWordSet();
  }

  nextWordSet() {
    this.currentWords = [];
    this.currentWordIdx = 0;
    this.hintsUsed = 0;
    this.decoyWord = "";

    const lvl = this.level;

    // Determine shift
    if (lvl === 10) {
      this.shift = 0; // L10: no shift
    } else if (lvl >= 3) {
      // Shift changes every 3 words starting level 3
      if (this.wordsSolved % 3 === 0) {
        this.shift = this.rand(1, lvl >= 7 ? 12 : 8);
      }
    } else {
      this.shift = this.rand(1, lvl === 1 ? 5 : 8);
    }

    // Determine word lengths
    let len = 3;
    if (lvl === 2) len = 4;
    else if (lvl === 3) len = 5;
    else if (lvl === 4) len = 6;
    else if (lvl === 5) len = 7;
    else if (lvl === 6) len = 8;
    else if (lvl === 7) len = 8;
    else if (lvl === 8) len = 9;
    else if (lvl === 9) len = 10;
    else if (lvl === 10) len = 12;

    const list = this.words[len] || this.words[3];
    const pickedWordA = this.randomChoice(list);

    // Encrypt
    const encA = this.caesarCipher(pickedWordA, this.shift);
    this.currentWords.push({
      word: pickedWordA,
      encrypted: encA,
      typedIndex: 0,
      shakeTimer: 0,
      correctTimers: Array(pickedWordA.length).fill(0)
    });

    // Dual words simultaneously (Level 9 & 10)
    if (lvl === 9 || lvl === 10) {
      const pickedWordB = this.randomChoice(list);
      const encB = this.caesarCipher(pickedWordB, this.shift);
      this.currentWords.push({
        word: pickedWordB,
        encrypted: encB,
        typedIndex: 0,
        shakeTimer: 0,
        correctTimers: Array(pickedWordB.length).fill(0)
      });
    }

    // Level 8 Decoy encrypted word shown above
    if (lvl === 8) {
      this.decoyWord = this.caesarCipher(this.randomChoice(this.words[len]), this.rand(2, 9));
    }

    // Timer limit
    const limits = [0, 20000, 17000, 15000, 13000, 11000, 10000, 9000, 8000, 7000, 6000];
    this.wordTimeLimit = limits[lvl] || 6000;
    this.wordTimer = this.wordTimeLimit;
  }

  caesarCipher(word, shift) {
    let res = "";
    for (let i = 0; i < word.length; i++) {
      const code = word.charCodeAt(i);
      // rotate a-z only
      if (code >= 97 && code <= 122) {
        res += String.fromCharCode(((code - 97 + shift) % 26) + 97);
      } else {
        res += word[i];
      }
    }
    return res;
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    this.totalTime += delta;
    this.wordTimer -= delta;

    // Expiry check
    if (this.wordTimer <= 0) {
      this.lives--;
      this.nextWordSet();
      return;
    }

    // Update shake timers and reveal scaling timers
    this.currentWords.forEach(w => {
      if (w.shakeTimer > 0) w.shakeTimer = Math.max(0, w.shakeTimer - delta);
      w.correctTimers.forEach((t, i) => {
        if (t > 0) w.correctTimers[i] = Math.max(0, t - delta);
      });
    });

    // Read single character pressed from inputs
    const inp = this.input;
    let typedChar = null;
    for (const key of inp.pressed) {
      if (key.length === 1 && key.toLowerCase() >= 'a' && key.toLowerCase() <= 'z') {
        typedChar = key.toLowerCase();
        break;
      }
    }

    // Check hint key press 'h' or 'H' (Level 5 & 6)
    if ((this.level === 5 || this.level === 6) && inp.wasPressed('h')) {
      const maxHints = this.level === 6 ? 2 : 999;
      if (this.hintsUsed < maxHints) {
        const cw = this.currentWords[this.currentWordIdx];
        if (cw && cw.typedIndex < cw.word.length) {
          // auto fill correct char
          const correct = cw.word[cw.typedIndex];
          cw.typedIndex++;
          this.hintsUsed++;
          this.checkWordClear();
        }
      }
    }

    if (typedChar) {
      const cw = this.currentWords[this.currentWordIdx];
      if (cw) {
        const correctChar = cw.word[cw.typedIndex];
        if (typedChar === correctChar) {
          // Correct!
          cw.correctTimers[cw.typedIndex] = 120; // 120ms scale reveal
          cw.typedIndex++;
          this.score += 10;
          this.checkWordClear();
        } else {
          // Miss!
          cw.shakeTimer = 150; // 150ms shake
        }
      }
    }
  }

  checkWordClear() {
    const cw = this.currentWords[this.currentWordIdx];
    if (cw && cw.typedIndex >= cw.word.length) {
      // Current word completed
      if (this.currentWordIdx < this.currentWords.length - 1) {
        this.currentWordIdx++; // proceed to next word in set
      } else {
        // All words in set completed
        this.wordsSolved++;
        
        // Add time speed bonus points
        const speedBonus = Math.floor((this.wordTimer / this.wordTimeLimit) * 50);
        this.score += speedBonus;

        const targetWords = this.level === 10 ? 15 : 10;
        if (this.wordsSolved >= targetWords) {
          this.levelComplete();
        } else {
          this.nextWordSet();
        }
      }
    }
  }

  render(ctx) {
    this.clear();

    const cx = this.W / 2;
    const isShiftVisible = this.level <= 6 && this.level !== 10;

    // Draw Shift key info at top right
    if (isShiftVisible) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = "12px 'DM Sans', sans-serif";
      ctx.textAlign = 'right';
      ctx.fillText(`SHIFT: +${this.shift}`, this.W - 24, 30);
    }

    // Draw Hint Info (Level 5 & 6)
    if (this.level === 5 || this.level === 6) {
      ctx.fillStyle = 'rgba(162, 155, 254, 0.6)';
      ctx.font = "11px 'DM Sans', sans-serif";
      ctx.textAlign = 'right';
      ctx.fillText(`Press 'H' for Hint`, this.W - 24, 48);
    }

    // Render decoy word (Level 8)
    if (this.decoyWord) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.font = "bold 20px 'JetBrains Mono', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(`DECOY: ${this.decoyWord.toUpperCase()}`, cx, 65);
    }

    // Render each word in set
    this.currentWords.forEach((cw, wordOffsetIdx) => {
      const isWordActive = (wordOffsetIdx === this.currentWordIdx);
      const startY = this.currentWords.length === 1 ? 160 : 120 + wordOffsetIdx * 140;

      // 1. Draw encrypted word
      ctx.fillStyle = isWordActive ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.2)';
      ctx.font = "bold 32px 'JetBrains Mono', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(cw.encrypted.toUpperCase(), cx, startY);

      // 2. Draw decoded letter slots below
      const letterSpacing = 28;
      const totalW = (cw.word.length - 1) * letterSpacing;
      const startX = cx - totalW / 2;

      ctx.font = "bold 24px 'JetBrains Mono', monospace";
      ctx.textAlign = 'center';

      // Shake animation translations offset
      let shakeX = 0;
      if (cw.shakeTimer > 0) {
        const step = Math.floor(cw.shakeTimer / 25) % 2;
        shakeX = step === 0 ? -6 : 6;
      }

      for (let i = 0; i < cw.word.length; i++) {
        const lx = startX + i * letterSpacing + shakeX;
        const ly = startY + 60;

        if (i < cw.typedIndex) {
          // Correct revealed letter (scale animation)
          let scale = 1.0;
          if (cw.correctTimers[i] > 0) {
            // scale 1.0 -> 1.2 -> 1.0
            const progress = cw.correctTimers[i] / 120; // 1 to 0
            scale = 1.0 + Math.sin(progress * Math.PI) * 0.2;
          }
          ctx.save();
          ctx.translate(lx, ly - 8);
          ctx.scale(scale, scale);
          ctx.fillStyle = '#a29bfe';
          ctx.fillText(cw.word[i].toUpperCase(), 0, 0);
          ctx.restore();
        } else if (i === cw.typedIndex && isWordActive) {
          // Blink cursor underscore block
          ctx.fillStyle = '#a29bfe';
          const blink = Math.floor(this.totalTime / 300) % 2 === 0;
          if (blink) {
            ctx.fillRect(lx - 8, ly - 4, 16, 4);
          } else {
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(lx - 8, ly - 4, 16, 2);
          }
        } else {
          // Unrevealed dash
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fillRect(lx - 8, ly - 4, 16, 2);
        }
      }
    });

    // Draw timer bar depleting
    const progress = Math.max(0, this.wordTimer / this.wordTimeLimit);
    const barW = 400;
    const barH = 3;
    const bx = cx - barW / 2;
    const by = this.H - 50;

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(bx, by, barW, barH);

    ctx.fillStyle = progress < 0.3 ? '#ff6b6b' : '#a29bfe';
    ctx.fillRect(bx, by, barW * progress, barH);

    // Draw Word solved counter indicator bottom left
    const targetWords = this.level === 10 ? 15 : 10;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(`WORD ${this.wordsSolved + 1}/${targetWords}`, 24, this.H - 24);
  }

  destroy() {
    super.destroy();
  }
}

window.GameClass = CipherQuest;
export default CipherQuest;
