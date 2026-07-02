import { GameBase } from '../../core/game-base.js';

const WORD_LIST = [
  "CAT", "DOG", "MAP", "KEY", "CODE", "HACK", "DATA", "LINK",
  "CYBER", "ROUTER", "SERVER", "SYSTEM", "GATEWAY", "FIREWALL",
  "ENCRYPT", "DECRYPT", "COMPILER", "DATABASE", "ALGORITHM"
];

class CipherQuest extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    this.letters = "abcdefghijklmnopqrstuvwxyz".split('');
    this.wordsSolved = 0;
    
    this.word = "";
    this.encryptedWord = "";
    this.typedWord = "";
    this.shift = 3;
    
    this.timeLimit = 30000; // ms
    this.timer = this.timeLimit;
    
    this.status = 'idle'; // 'idle', 'fail'
    this.statusTimer = 0;

    this.nextWord();
  }

  nextWord() {
    const lvl = this.level;
    // Filter word list by length based on level
    let targetLength = 3;
    if (lvl >= 3) targetLength = 4;
    if (lvl >= 5) targetLength = 5;
    if (lvl >= 7) targetLength = 7;
    if (lvl >= 9) targetLength = 9;

    const matchedWords = WORD_LIST.filter(w => Math.abs(w.length - targetLength) <= 1);
    this.word = this.randomChoice(matchedWords.length > 0 ? matchedWords : WORD_LIST);
    
    // Shift changes based on level
    this.shift = this.level <= 3 ? this.randomInt(1, 3) : this.randomInt(3, 10);
    this.encryptedWord = this.encrypt(this.word, this.shift);
    
    this.typedWord = "";
    this.timeLimit = Math.max(8000, 30000 - this.level * 2000);
    this.timer = this.timeLimit;
    this.status = 'idle';
  }

  encrypt(word, shift) {
    let result = "";
    for (let i = 0; i < word.length; i++) {
      const code = word.charCodeAt(i);
      const newCode = ((code - 65 + shift) % 26) + 65;
      result += String.fromCharCode(newCode);
    }
    return result;
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    if (this.statusTimer > 0) {
      this.statusTimer -= delta;
      if (this.statusTimer <= 0) {
        this.nextWord();
      }
      return;
    }

    this.timer -= delta;
    if (this.timer <= 0) {
      this.lives--;
      this.status = 'fail';
      this.statusTimer = 1000;
      return;
    }

    // Read input
    const inp = this.input;
    this.letters.forEach(char => {
      if (inp.wasPressed(char)) {
        const inputChar = char.toUpperCase();
        const nextTargetChar = this.word[this.typedWord.length];

        if (inputChar === nextTargetChar) {
          this.typedWord += inputChar;
          this.score += 10;
          
          if (this.typedWord === this.word) {
            this.wordsSolved++;
            
            // Check Goal
            const goal = this.getLevelGoal();
            if (this.wordsSolved >= goal.target) {
              this.levelComplete();
            } else {
              this.nextWord();
            }
          }
        } else {
          // Mistake reduces timer slightly
          this.timer = Math.max(0, this.timer - 2000);
        }
      }
    });
  }

  render() {
    this.clearCanvas();
    const ctx = this.ctx;

    // Draw timer bar
    const barWidth = (this.timer / this.timeLimit) * 400;
    ctx.fillStyle = '#ffd93d';
    ctx.fillRect(100, 100, barWidth, 10);

    // Draw Shift Info
    ctx.textAlign = 'center';
    ctx.font = '16px DM Sans';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(`CIPHER KEY SHIFT: +${this.shift}`, 300, 180);

    // Draw Ciphertext
    ctx.font = '28px JetBrains Mono';
    ctx.fillStyle = '#ef4444';
    ctx.fillText(this.encryptedWord, 300, 260);

    // Draw Decoded String Input Boxes
    ctx.font = '28px JetBrains Mono';
    this.word.split('').forEach((char, index) => {
      const x = 300 + (index - (this.word.length - 1) / 2) * 40;
      const y = 380;
      
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.strokeRect(x - 16, y - 24, 32, 40);

      if (index < this.typedWord.length) {
        ctx.fillStyle = '#00d4aa';
        ctx.fillText(this.typedWord[index], x, y + 8);
      }
    });

    if (this.status === 'fail') {
      ctx.fillStyle = '#ef4444';
      ctx.font = '18px Press Start 2P';
      ctx.fillText('TIME UP!', 300, 480);
    }
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    return [
      { label: 'Words', value: `${this.wordsSolved}/${this.getLevelGoal().target}` },
      { label: 'Level', value: this.level }
    ];
  }

  getLevelGoal() {
    const goals = [
      null,
      { type: 'words', target: 3 },
      { type: 'words', target: 3 },
      { type: 'words', target: 4 },
      { type: 'words', target: 4 },
      { type: 'words', target: 5 },
      { type: 'words', target: 5 },
      { type: 'words', target: 6 },
      { type: 'words', target: 6 },
      { type: 'words', target: 7 },
      { type: 'words', target: 8 }
    ];
    return goals[this.level];
  }
}

window.GameClass = CipherQuest;
