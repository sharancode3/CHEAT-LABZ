import { GameBase } from '../../core/game-base.js';

class PhantomCalc extends GameBase {
  static logicalWidth = 560;
  static logicalHeight = 400;

  init() {
    this.equationsSolved = 0;
    this.score = 0;
    this.lives = 3; // Strikes used as lives (3 strikes = game over)
    this.isOver = false;

    // List of active equations to solve in this round
    this.activeEqs = []; // Array of { text, answer, showTime, vanished, opacity, inputVal, solved }
    this.currentEqIdx = 0; // index of equation currently being typed

    this.vanishDuration = 1500; // ms
    this.timeLimit = 10000; // ms
    this.timer = 10000;

    this.shakeTimer = 0;
    this.correctOverlayTimer = 0; // green flash
    this.wrongRevealTimer = 0; // show correct answer brief timer
    this.revealedAnswer = "";

    this.totalTime = 0;

    this.nextRound();
  }

  nextRound() {
    this.activeEqs = [];
    this.currentEqIdx = 0;
    this.wrongRevealTimer = 0;

    const lvl = this.level;
    this.vanishDuration = lvl === 8 ? 1200 : lvl === 9 ? 1000 : lvl === 10 ? 800 : 1500;

    const eqCount = (lvl === 9 || lvl === 10) ? 2 : 1;
    const now = performance.now();

    for (let i = 0; i < eqCount; i++) {
      const eqData = this.generateEquationData();
      
      // Level 9: one equation vanishes, the other stays
      let alwaysVisible = false;
      if (lvl === 9 && i === 1) {
        alwaysVisible = true;
      }

      this.activeEqs.push({
        text: eqData.text,
        answer: eqData.answer,
        showTime: now,
        vanished: false,
        alwaysVisible,
        opacity: 1.0,
        inputVal: "",
        solved: false
      });
    }

    // Time Limit scaling
    const limits = [0, 10000, 10000, 8000, 7000, 6000, 6000, 5000, 5000, 4000, 4000];
    this.timeLimit = limits[lvl] || 4000;
    this.timer = this.timeLimit;
  }

  generateEquationData() {
    const lvl = this.level;
    let a, b, c;
    let text = "";
    let answer = 0;

    if (lvl === 1) {
      a = this.rand(1, 9);
      b = this.rand(1, 9);
      text = `${a} + ${b}`;
      answer = a + b;
    } else if (lvl === 2) {
      if (Math.random() > 0.5) {
        a = this.rand(1, 9);
        b = this.rand(1, 9);
        text = `${a} + ${b}`;
        answer = a + b;
      } else {
        a = this.rand(5, 9);
        b = this.rand(1, a);
        text = `${a} - ${b}`;
        answer = a - b;
      }
    } else if (lvl === 3) {
      if (Math.random() > 0.5) {
        a = this.rand(10, 99);
        b = this.rand(10, 99);
        text = `${a} + ${b}`;
        answer = a + b;
      } else {
        a = this.rand(50, 99);
        b = this.rand(10, a);
        text = `${a} - ${b}`;
        answer = a - b;
      }
    } else if (lvl === 4) {
      a = this.rand(2, 9);
      b = this.rand(2, 9);
      text = `${a} × ${b}`;
      answer = a * b;
    } else if (lvl === 5) {
      const type = Math.floor(Math.random() * 3);
      a = this.rand(2, 9);
      b = this.rand(2, 9);
      c = this.rand(2, 9);
      if (type === 0) {
        text = `${a} + ${b} × ${c}`;
        answer = a + b * c;
      } else if (type === 1) {
        text = `${a} × ${b} - ${c}`;
        answer = a * b - c;
      } else {
        text = `${a} × ${b} + ${c}`;
        answer = a * b + c;
      }
    } else if (lvl === 6) {
      a = this.rand(10, 99);
      b = this.rand(2, 9);
      text = `${a} × ${b}`;
      answer = a * b;
    } else {
      // L7, L8, L9, L10: three-number chains
      a = this.rand(2, 9);
      b = this.rand(2, 9);
      c = this.rand(2, 9);
      const opRoll = Math.random();
      if (opRoll < 0.33) {
        text = `${a} + ${b} × ${c}`;
        answer = a + b * c;
      } else if (opRoll < 0.66) {
        text = `${a} × ${b} - ${c}`;
        answer = a * b - c;
      } else {
        text = `${a} - ${b} × ${c}`;
        answer = a - b * c;
      }
    }

    return { text, answer };
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    this.totalTime += delta;

    // Green flash timer
    if (this.correctOverlayTimer > 0) {
      this.correctOverlayTimer = Math.max(0, this.correctOverlayTimer - delta);
    }

    // Wrong answer reveal timer
    if (this.wrongRevealTimer > 0) {
      this.wrongRevealTimer = Math.max(0, this.wrongRevealTimer - delta);
      if (this.wrongRevealTimer === 0) {
        this.nextRound();
      }
      return; // pause inputs during reveal
    }

    // Shake timer
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - delta);
    }

    // Precision Hide Timing
    const now = performance.now();
    this.activeEqs.forEach(eq => {
      if (!eq.alwaysVisible && now - eq.showTime >= this.vanishDuration) {
        eq.vanished = true;
        // lerp opacity to 0
        eq.opacity = Math.max(0, eq.opacity - delta / 200);
      }
    });

    // General timer
    this.timer -= delta;
    if (this.timer <= 0) {
      this.lives--;
      this.shakeTimer = 200;
      this.revealedAnswer = `TIMEOUT! ANSWER: ${this.activeEqs[this.currentEqIdx]?.answer}`;
      this.wrongRevealTimer = 1000;
      return;
    }

    // Read digits and minus sign inputs
    const inp = this.input;
    const cw = this.activeEqs[this.currentEqIdx];
    if (!cw) return;

    // Accept Backspace
    if (inp.wasPressed('Backspace')) {
      cw.inputVal = cw.inputVal.slice(0, -1);
    }

    // Read valid chars
    const validKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-'];
    validKeys.forEach(k => {
      if (inp.wasPressed(k)) {
        // Prevent duplicate minus signs or minus inside text
        if (k === '-' && cw.inputVal.length > 0) return;
        cw.inputVal += k;
      }
    });

    // Enter submits
    if (inp.wasPressed('Enter')) {
      const parsedAns = parseInt(cw.inputVal);
      if (parsedAns === cw.answer) {
        // Correct!
        this.correctOverlayTimer = 80; // 80ms flash
        cw.solved = true;
        
        // Add score + speed bonus
        const basePoints = 20;
        const speedBonus = Math.floor((this.timer / this.timeLimit) * 20);
        this.score += (basePoints + speedBonus) * this.level;

        // Proceed to next active equation in dual set or next round
        if (this.currentEqIdx < this.activeEqs.length - 1) {
          this.currentEqIdx++;
        } else {
          this.equationsSolved++;
          if (this.equationsSolved >= 10) {
            this.levelComplete();
          } else {
            this.nextRound();
          }
        }
      } else {
        // Wrong!
        this.lives--;
        this.shakeTimer = 200;
        this.revealedAnswer = `WRONG! ANSWER: ${cw.answer}`;
        this.wrongRevealTimer = 1000;
      }
    }
  }

  render(ctx) {
    this.clear();

    const cx = this.W / 2;

    // Correct overlay green flash
    if (this.correctOverlayTimer > 0) {
      ctx.fillStyle = 'rgba(0, 212, 170, 0.25)';
      ctx.fillRect(0, 0, this.W, this.H);
    }

    // Shake translation offset
    let shakeOffset = 0;
    if (this.shakeTimer > 0) {
      const step = Math.floor(this.shakeTimer / 40) % 2;
      shakeOffset = step === 0 ? -4 : 4;
    }

    // Timer bar across top
    const progress = Math.max(0, this.timer / this.timeLimit);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, 0, this.W, 4);
    ctx.fillStyle = progress < 0.3 ? '#ff6b6b' : '#74b9ff';
    ctx.fillRect(0, 0, this.W * progress, 4);

    // Display equation center screen (offset if two equations simultaneously)
    ctx.textAlign = 'center';
    
    if (this.wrongRevealTimer > 0) {
      // Display correct answer popup
      ctx.fillStyle = '#ff6b6b';
      ctx.font = "bold 24px 'DM Sans', sans-serif";
      ctx.fillText(this.revealedAnswer, cx, this.H / 2);
    } else {
      // Draw Equations
      this.activeEqs.forEach((eq, idx) => {
        const isCurrent = (idx === this.currentEqIdx);
        const yPos = this.activeEqs.length === 1 ? this.H / 2 - 20 : this.H / 2 - 70 + idx * 80;

        ctx.save();
        ctx.globalAlpha = eq.opacity;
        ctx.fillStyle = isCurrent ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
        ctx.font = "bold 44px 'JetBrains Mono', monospace";
        ctx.fillText(eq.text, cx + (isCurrent ? shakeOffset : 0), yPos);
        ctx.restore();
      });

      // Terminal input line at bottom third
      const cw = this.activeEqs[this.currentEqIdx];
      if (cw) {
        const inputY = this.H - 100;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(20, inputY - 30, this.W - 40, 50);

        ctx.fillStyle = '#74b9ff';
        ctx.font = "bold 24px 'JetBrains Mono', monospace";
        ctx.textAlign = 'left';
        
        let displayStr = `> ${cw.inputVal}`;
        const blink = Math.floor(this.totalTime / 250) % 2 === 0;
        if (blink) {
          displayStr += "_";
        }
        
        ctx.fillText(displayStr, 40 + shakeOffset, inputY + 4);
      }
    }

    // Small equations completed indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(`EQUATIONS: ${this.equationsSolved}/10`, 24, this.H - 24);
  }

  destroy() {
    super.destroy();
  }
}

window.GameClass = PhantomCalc;
export default PhantomCalc;
