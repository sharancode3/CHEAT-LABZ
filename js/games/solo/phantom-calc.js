import { GameBase } from '../../core/game-base.js';

class PhantomCalc extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    this.equation = "";
    this.answer = 0;
    this.typedAnswer = "";
    
    this.correctAnswers = 0;
    this.timeLimit = 10000; // ms
    this.timer = this.timeLimit;
    
    this.status = 'idle'; // 'idle', 'fail'
    this.statusTimer = 0;

    this.nextEquation();
  }

  nextEquation() {
    const lvl = this.level;
    let a, b, c;
    
    if (lvl === 1) {
      // Single digit addition
      a = this.randomInt(1, 9);
      b = this.randomInt(1, 9);
      this.equation = `${a} + ${b} = ?`;
      this.answer = a + b;
    } else if (lvl === 2) {
      // Single digit subtraction
      a = this.randomInt(5, 9);
      b = this.randomInt(1, a - 1);
      this.equation = `${a} - ${b} = ?`;
      this.answer = a - b;
    } else if (lvl === 3) {
      // Double digit addition/subtraction
      a = this.randomInt(10, 50);
      b = this.randomInt(10, 50);
      if (Math.random() > 0.5) {
        this.equation = `${a} + ${b} = ?`;
        this.answer = a + b;
      } else {
        this.equation = `${a + b} - ${a} = ?`;
        this.answer = b;
      }
    } else if (lvl === 4) {
      // Multiplication table (1-9)
      a = this.randomInt(2, 9);
      b = this.randomInt(2, 9);
      this.equation = `${a} * ${b} = ?`;
      this.answer = a * b;
    } else if (lvl === 5) {
      // Division
      a = this.randomInt(2, 9);
      b = this.randomInt(2, 9);
      this.equation = `${a * b} / ${a} = ?`;
      this.answer = b;
    } else if (lvl <= 8) {
      // Basic algebra: e.g., 3x + 5 = 20
      const x = this.randomInt(2, 7);
      const coeff = this.randomInt(2, 5);
      const constVal = this.randomInt(1, 15);
      this.equation = `${coeff}x + ${constVal} = ${coeff * x + constVal}. Solve for x: ?`;
      this.answer = x;
    } else {
      // Multi-step equations (Level 9-10)
      a = this.randomInt(2, 8);
      b = this.randomInt(2, 8);
      c = this.randomInt(1, 10);
      this.equation = `(${a} * ${b}) - ${c} = ?`;
      this.answer = (a * b) - c;
    }

    this.typedAnswer = "";
    this.timeLimit = Math.max(4000, 12000 - lvl * 800);
    this.timer = this.timeLimit;
    this.status = 'idle';
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    if (this.statusTimer > 0) {
      this.statusTimer -= delta;
      if (this.statusTimer <= 0) {
        this.nextEquation();
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

    // Read Key Inputs for numbers
    const inp = this.input;
    
    // Check digits 0-9
    for (let i = 0; i <= 9; i++) {
      if (inp.wasPressed(i.toString())) {
        this.typedAnswer += i.toString();
      }
    }

    // Backspace
    if (inp.wasPressed('Backspace')) {
      this.typedAnswer = this.typedAnswer.slice(0, -1);
    }

    // Enter submission
    if (inp.wasPressed('Enter') && this.typedAnswer.length > 0) {
      const userVal = parseInt(this.typedAnswer, 10);
      if (userVal === this.answer) {
        this.correctAnswers++;
        this.score += 20;
        
        const goal = this.getLevelGoal();
        if (this.correctAnswers >= goal.target) {
          this.levelComplete();
        } else {
          this.nextEquation();
        }
      } else {
        this.lives--;
        this.status = 'fail';
        this.statusTimer = 1000;
      }
    }
  }

  render() {
    this.clearCanvas();
    const ctx = this.ctx;

    // Draw timer bar
    const barWidth = (this.timer / this.timeLimit) * 400;
    ctx.fillStyle = '#ffd93d';
    ctx.fillRect(100, 100, barWidth, 10);

    // Draw equation
    ctx.textAlign = 'center';
    ctx.font = '24px DM Sans';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.equation, 300, 250);

    // Draw typed answer
    ctx.font = '36px JetBrains Mono';
    ctx.fillStyle = '#6c63ff';
    ctx.fillText(this.typedAnswer || '_', 300, 350);

    if (this.status === 'fail') {
      ctx.fillStyle = '#ef4444';
      ctx.font = '18px Press Start 2P';
      ctx.fillText('WRONG / TIME OUT!', 300, 450);
    }
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    return [
      { label: 'Equations', value: `${this.correctAnswers}/${this.getLevelGoal().target}` },
      { label: 'Level', value: this.level }
    ];
  }

  getLevelGoal() {
    const goals = [
      null,
      { type: 'equations', target: 5 },
      { type: 'equations', target: 6 },
      { type: 'equations', target: 7 },
      { type: 'equations', target: 8 },
      { type: 'equations', target: 9 },
      { type: 'equations', target: 10 },
      { type: 'equations', target: 11 },
      { type: 'equations', target: 12 },
      { type: 'equations', target: 13 },
      { type: 'equations', target: 15 }
    ];
    return goals[this.level];
  }
}

window.GameClass = PhantomCalc;
