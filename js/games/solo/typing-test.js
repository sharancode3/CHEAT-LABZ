import { GameBase } from '../../core/game-base.js';

export class TypingTest extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    // A sample corpus. We'll pick a paragraph randomly.
    const corpus = [
      "The quick brown fox jumps over the lazy dog.",
      "Typing tests are a fun way to measure your keystroke velocity and accuracy.",
      "In the vast expanse of the cosmos, humanity seeks to understand its place.",
      "Algorithms dictate the flow of data across global networks in milliseconds.",
      "Programming requires both logical deduction and creative problem solving skills."
    ];
    
    // For a longer test, repeat and shuffle or combine
    let text = corpus[Math.floor(Math.random() * corpus.length)] + " " + corpus[Math.floor(Math.random() * corpus.length)];
    if (this.level > 1) {
       text += " " + corpus[Math.floor(Math.random() * corpus.length)];
    }
    
    this.targetText = text;
    this.charStates = new Array(this.targetText.length).fill('PENDING'); // PENDING, CORRECT, INCORRECT
    
    this.charIndex = 0;
    this.errors = 0; // lifetime uncorrected errors
    this.totalKeystrokes = 0;
    
    this.startTime = null;
    this.elapsedTime = 0; // seconds
    this.maxTime = 60.0;
    
    this.wpmGross = 0;
    this.wpmNet = 0;
    this.accuracy = 100;
    
    this.backlogErrors = 0;
    
    this.started = false;
    this.setupInput();
  }

  setupInput() {
    // Using a hidden input or raw key events. Raw key events are easier in canvas.
    this.input.onKeyDown = (e) => {
      if (this.isPaused || this.isOver) return;
      
      // Ignore meta keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || e.key === 'CapsLock' || e.key === 'Tab') {
        return;
      }
      
      if (!this.started) {
        this.started = true;
        this.startTime = Date.now();
      }
      
      if (e.code === 'Backspace') {
        if (this.charIndex > 0) {
          this.charIndex--;
          if (this.charStates[this.charIndex] === 'INCORRECT') {
            this.backlogErrors--;
          }
          this.charStates[this.charIndex] = 'PENDING';
          if (window.Sound) window.Sound.playTone(600, 'square', 0.02);
        }
        return;
      }
      
      // If soft-locked (too many uncorrected errors), ignore forward typing
      if (this.backlogErrors >= 10) {
        if (window.Sound) window.Sound.playTone(150, 'sawtooth', 0.1);
        return;
      }
      
      // Process printable char
      if (e.key.length === 1 && this.charIndex < this.targetText.length) {
        this.totalKeystrokes++;
        
        const expected = this.targetText[this.charIndex];
        
        if (e.key === expected) {
          this.charStates[this.charIndex] = 'CORRECT';
          if (window.Sound) window.Sound.playTone(400, 'sine', 0.02);
        } else {
          this.charStates[this.charIndex] = 'INCORRECT';
          this.errors++;
          this.backlogErrors++;
          if (window.Sound) window.Sound.playTone(200, 'square', 0.05);
        }
        
        this.charIndex++;
        
        // Recalculate metrics
        this.calcMetrics();
        
        // Win condition
        if (this.charIndex === this.targetText.length && this.backlogErrors === 0) {
           this.endTest();
        }
      }
    };
  }

  calcMetrics() {
    if (!this.startTime) return;
    
    const minutes = Math.max(0.01, this.elapsedTime / 60.0);
    
    // (Total Keystrokes / 5) / Time Elapsed (Minutes)
    this.wpmGross = (this.totalKeystrokes / 5.0) / minutes;
    
    // WPM_net = max(0, WPM_gross - (UncorrectedErrors / TimeElapsed(Minutes)))
    // Here we use total lifetime errors for the standard WPM penalty, not just backlog
    this.wpmNet = Math.max(0, this.wpmGross - (this.errors / minutes));
    
    // Accuracy = (Total Keystrokes - Errors) / Total Keystrokes
    if (this.totalKeystrokes > 0) {
      this.accuracy = ((this.totalKeystrokes - this.errors) / this.totalKeystrokes) * 100;
    }
  }

  endTest() {
    this.isOver = true;
    this.score += Math.floor(this.wpmNet * 10 * (this.accuracy / 100));
    
    if (window.Sound) window.Sound.playTone(800, 'sine', 0.2);
    
    setTimeout(() => this.levelComplete(), 2000);
  }

  update(delta) {
    if (this.isPaused || this.isOver || !this.started) return;
    
    this.elapsedTime += delta;
    this.calcMetrics();
    
    if (this.elapsedTime >= this.maxTime) {
      this.endTest(); // Time's up! Force end and score what they have.
    }
  }

  render(ctx) {
    this.clear();
    
    // Draw Metrics Header
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.W, 100);
    
    ctx.font = '20px "JetBrains Mono"';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    
    ctx.fillText(`TIME`, this.W * 0.15, 40);
    ctx.fillStyle = this.elapsedTime >= this.maxTime - 10 ? '#ef4444' : '#38bdf8';
    ctx.fillText(`${(this.maxTime - this.elapsedTime).toFixed(1)}s`, this.W * 0.15, 70);
    
    ctx.fillStyle = '#fff';
    ctx.fillText(`NET WPM`, this.W * 0.38, 40);
    ctx.fillStyle = '#10b981';
    ctx.fillText(`${Math.round(this.wpmNet)}`, this.W * 0.38, 70);
    
    ctx.fillStyle = '#fff';
    ctx.fillText(`GROSS WPM`, this.W * 0.62, 40);
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${Math.round(this.wpmGross)}`, this.W * 0.62, 70);
    
    ctx.fillStyle = '#fff';
    ctx.fillText(`ACCURACY`, this.W * 0.85, 40);
    ctx.fillStyle = this.accuracy < 90 ? '#facc15' : '#10b981';
    ctx.fillText(`${this.accuracy.toFixed(1)}%`, this.W * 0.85, 70);
    
    // Lockout Warning
    if (this.backlogErrors >= 10) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(0, 100, this.W, this.H - 100);
      
      ctx.fillStyle = '#ef4444';
      ctx.font = '30px "Press Start 2P"';
      ctx.fillText("FIX ERRORS!", this.W / 2, this.H / 2 - 150);
    }
    
    // Render Text
    // We need a simple word wrapper to draw characters correctly
    ctx.font = '30px "JetBrains Mono"';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    const marginX = 60;
    let x = marginX;
    let y = 150;
    const lineHeight = 45;
    const maxW = this.W - marginX * 2;
    
    for (let i = 0; i < this.targetText.length; i++) {
      const char = this.targetText[i];
      const state = this.charStates[i];
      
      // Wrapping logic (very simple, character based)
      let charW = ctx.measureText(char).width;
      
      // If it's a space and we are at the end of a line, wrap
      if (char === ' ' && x > marginX) {
        // Peek ahead to next word length to see if we should wrap
        let nextSpace = this.targetText.indexOf(' ', i + 1);
        if (nextSpace === -1) nextSpace = this.targetText.length;
        const nextWord = this.targetText.substring(i + 1, nextSpace);
        const nextWordW = ctx.measureText(nextWord).width;
        if (x + charW + nextWordW > this.W - marginX) {
           x = marginX;
           y += lineHeight;
           continue; // Skip drawing space at start of line
        }
      }
      
      if (x + charW > this.W - marginX) {
        x = marginX;
        y += lineHeight;
      }
      
      // Draw Cursor
      if (i === this.charIndex && !this.isOver) {
        ctx.fillStyle = Math.floor(Date.now() / 300) % 2 === 0 ? '#38bdf8' : 'transparent';
        ctx.fillRect(x, y + 35, charW, 4);
      }
      
      if (state === 'PENDING') {
        ctx.fillStyle = '#64748b';
      } else if (state === 'CORRECT') {
        ctx.fillStyle = '#f8fafc'; // White
      } else if (state === 'INCORRECT') {
        ctx.fillStyle = '#ef4444'; // Red
        // Draw red background for spaces that are wrong
        if (char === ' ') {
          ctx.fillRect(x, y + 10, charW, 25);
        }
      }
      
      ctx.fillText(char, x, y);
      x += charW;
    }
    
    // Cursor if at very end
    if (this.charIndex === this.targetText.length && !this.isOver) {
       ctx.fillStyle = Math.floor(Date.now() / 300) % 2 === 0 ? '#38bdf8' : 'transparent';
       ctx.fillRect(x, y + 35, 18, 4); // Estimated charW
    }
    
    if (!this.started) {
       ctx.fillStyle = 'rgba(0,0,0,0.5)';
       ctx.fillRect(0, 100, this.W, this.H - 100);
       ctx.fillStyle = '#fff';
       ctx.font = '24px "JetBrains Mono"';
       ctx.textAlign = 'center';
       ctx.fillText("START TYPING TO BEGIN", this.W / 2, this.H / 2);
    }
  }
}
