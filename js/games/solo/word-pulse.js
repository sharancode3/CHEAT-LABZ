import { GameBase } from '../../core/game-base.js';

const WORD_LIST = [
  "BEAT", "TEMPO", "PULSE", "RHYTHM", "SYNTH", "SOUND", "CYCLE", "OCTAVE",
  "CHORD", "DRUM", "MELODY", "HARMONY", "TUNING", "RESONANCE", "FREQUENCY"
];

class WordPulse extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    this.letters = "abcdefghijklmnopqrstuvwxyz".split('');
    this.wordsSolved = 0;
    this.word = "";
    this.charIndex = 0;

    // BPM config
    this.bpm = 60 + this.level * 7; // BPM scales from 67 to 130
    this.beatInterval = 60 / this.bpm; // Seconds per beat
    this.beatTimer = 0;
    this.pulseScale = 1.0;

    this.nextWord();
    
    this.score = 0;
    this.lives = 3;
  }

  nextWord() {
    const lvl = this.level;
    let targetLen = 4;
    if (lvl >= 3) targetLen = 5;
    if (lvl >= 5) targetLen = 6;
    if (lvl >= 7) targetLen = 8;
    if (lvl >= 9) targetLen = 10;

    const matched = WORD_LIST.filter(w => Math.abs(w.length - targetLen) <= 1);
    this.word = this.randomChoice(matched.length > 0 ? matched : WORD_LIST);
    this.charIndex = 0;
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    const dt = delta / 1000;

    // Pulse Timer
    this.beatTimer += dt;
    if (this.beatTimer >= this.beatInterval) {
      this.beatTimer -= this.beatInterval;
      this.pulseScale = 1.25; // Visual beat bounce
    }
    this.pulseScale = this.lerp(this.pulseScale, 1.0, 10 * dt);

    // Timing window: generous at lvl 1 (±200ms), tight at lvl 10 (±80ms)
    const windowLeeway = Math.max(0.08, 0.20 - this.level * 0.012);

    // Read input
    const inp = this.input;
    this.letters.forEach(char => {
      if (inp.wasPressed(char)) {
        const inputChar = char.toUpperCase();
        const nextChar = this.word[this.charIndex];

        // Check if hit timing was close to a beat
        const offset = Math.min(this.beatTimer, this.beatInterval - this.beatTimer);
        const onBeat = offset <= windowLeeway;

        if (inputChar === nextChar && onBeat) {
          this.charIndex++;
          this.score += 15;
          if (this.charIndex >= this.word.length) {
            this.wordsSolved++;
            
            const goal = this.getLevelGoal();
            if (this.wordsSolved >= goal.target) {
              this.levelComplete();
            } else {
              this.nextWord();
            }
          }
        } else {
          // Missed or off-beat reduces lives
          this.lives--;
        }
      }
    });
  }

  render() {
    this.clearCanvas();
    const ctx = this.ctx;

    // Draw Pulse Ring
    ctx.strokeStyle = `rgba(108, 99, 255, ${0.1 + (this.pulseScale - 1) * 2})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(300, 300, 100 * this.pulseScale, 0, Math.PI * 2);
    ctx.stroke();

    // Draw Word
    ctx.textAlign = 'center';
    ctx.font = '32px DM Sans';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(this.word, 300, 300);

    // Highlight typed characters
    const typedText = this.word.slice(0, this.charIndex);
    ctx.fillStyle = '#00d4aa';
    ctx.fillText(typedText, 300 - (ctx.measureText(this.word).width - ctx.measureText(typedText).width) / 2, 300);

    // BPM Indicator
    ctx.font = '14px JetBrains Mono';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(`${this.bpm} BPM`, 300, 420);
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    return [
      { label: 'Words Solved', value: `${this.wordsSolved}/${this.getLevelGoal().target}` },
      { label: 'BPM', value: this.bpm }
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

window.GameClass = WordPulse;
