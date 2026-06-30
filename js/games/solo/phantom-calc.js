import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

export default class PhantomCalc extends GameBase {
  static get logicalWidth() { return 600; }
  static get logicalHeight() { return 450; }
  
  constructor(canvas, container) {
    super(canvas, container);

    this.lives = 3;
    this.level = 1;
    this.correctAnswers = 0;
    this.timeLeft = 10000;
    this.maxTime = 10000;

    this.equation = "";
    this.answer = 0;
    this.typedAnswer = "";
    this.equationStartTime = 0;
    
    // UI Visuals
    this.cursorBlinkTimer = 0;
    this.shakeTimer = 0;
    this.redFlashTimer = 0;
    this.floatingTexts = [];
  }

  init() {
    this.lives = 3;
    this.level = 1;
    this.correctAnswers = 0;
    this.score = 0;

    this.floatingTexts = [];
    this.shakeTimer = 0;
    this.redFlashTimer = 0;
    
    this.generateEquation();

    let runs = Storage.get('phantom-calc_runs', 0);
    Storage.set('phantom-calc_runs', runs + 1);
  }

  generateEquation() {
    let a, b, ans;
    let opStr = "";
    
    // Set parameters based on level progression difficulty
    if (this.level <= 4) {
      // Add / Sub under 20
      a = Math.floor(Math.random() * 15) + 1;
      b = Math.floor(Math.random() * 15) + 1;
      if (Math.random() > 0.5) {
        opStr = "+";
        ans = a + b;
      } else {
        opStr = "-";
        if (a < b) { const tmp = a; a = b; b = tmp; }
        ans = a - b;
      }
    } else if (this.level <= 8) {
      // Multiplication under 10
      a = Math.floor(Math.random() * 9) + 2;
      b = Math.floor(Math.random() * 9) + 2;
      opStr = "x";
      ans = a * b;
    } else {
      // Hard mode: mix addition/subtraction up to 100 and mult up to 12
      if (Math.random() > 0.4) {
        a = Math.floor(Math.random() * 45) + 5;
        b = Math.floor(Math.random() * 45) + 5;
        if (Math.random() > 0.5) {
          opStr = "+";
          ans = a + b;
        } else {
          opStr = "-";
          if (a < b) { const tmp = a; a = b; b = tmp; }
          ans = a - b;
        }
      } else {
        a = Math.floor(Math.random() * 11) + 2;
        b = Math.floor(Math.random() * 11) + 2;
        opStr = "x";
        ans = a * b;
      }
    }

    // Hide one element randomly: 0=a, 1=b, 2=ans
    const hideMode = Math.floor(Math.random() * 3);
    if (hideMode === 0) {
      this.equation = `? ${opStr} ${b} = ${ans}`;
      this.answer = a;
    } else if (hideMode === 1) {
      this.equation = `${a} ${opStr} ? = ${ans}`;
      this.answer = b;
    } else {
      this.equation = `${a} ${opStr} ${b} = ?`;
      this.answer = ans;
    }

    this.typedAnswer = "";
    this.timeLeft = this.maxTime;
    this.equationStartTime = performance.now();
  }

  onInput(key, event) {
    if (this.isDead || this.timeLeft <= 0) return;
    
    const k = key.toLowerCase();

    // Check numerical key entries (only allow digits 0-9 and minus sign)
    if ((k >= '0' && k <= '9') || k === '-') {
      // Enforce max 4 digits
      if (this.typedAnswer.length < 4) {
        this.container.audio.play('blip');
        this.typedAnswer += key;
      }
    } else if (k === 'backspace') {
      if (this.typedAnswer.length > 0) {
        this.container.audio.play('blip');
        this.typedAnswer = this.typedAnswer.slice(0, -1);
      }
    } else if (k === 'enter') {
      if (this.typedAnswer.length > 0) {
        this.submitAnswer();
      }
    }
  }

  submitAnswer() {
    const val = parseInt(this.typedAnswer);
    if (val === this.answer) {
      this.container.audio.play('coin');
      
      let points = 100;
      // Add speed timing bonuses
      const elapsed = performance.now() - this.equationStartTime;
      if (elapsed < 3000) points += 30; // quick solve
      
      this.score += points;
      this.correctAnswers++;
      
      // Floating points popups
      this.floatingTexts.push({
        x: this.width / 2,
        y: this.height / 2 - 40,
        text: `+${points}`,
        life: 700,
        maxLife: 700
      });

      if (this.correctAnswers % 3 === 0) {
        this.level++;
      }
      this.generateEquation();
    } else {
      this.loseLife();
    }
  }

  loseLife() {
    this.container.audio.play('damage');
    this.lives--;
    this.redFlashTimer = 100;
    this.shakeTimer = 300;
    
    this.container.shake(200, 4);

    if (this.lives <= 0) {
      this.finishGame();
    } else {
      this.generateEquation();
    }
  }

  update(deltaTime) {
    this.cursorBlinkTimer += deltaTime;
    if (this.redFlashTimer > 0) this.redFlashTimer -= deltaTime;
    if (this.shakeTimer > 0) this.shakeTimer -= deltaTime;

    // Decay floating points
    const dt = deltaTime / 1000;
    this.floatingTexts = this.floatingTexts.filter(t => {
      t.life -= deltaTime;
      t.y -= dt * 30;
      return t.life > 0;
    });

    const elapsed = performance.now() - this.equationStartTime;
    
    // Equation fades out for first 1.5s
    this.timeLeft -= deltaTime;
    if (this.timeLeft <= 0) {
      this.loseLife();
    }
  }

  finishGame() {
    const baseScore = this.score;
    const coins = Math.floor(baseScore / 30);

    this.scoreBreakdown = {
      rows: [
        { label: 'Equations Solved', value: this.correctAnswers, points: baseScore }
      ],
      total: baseScore,
      coinsEarned: coins
    };

    this.score = baseScore;

    if (window.awardCoins && coins > 0) {
      window.awardCoins(coins, 'Phantom Calc Match');
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

    const elapsed = performance.now() - this.equationStartTime;
    const isEquationVisible = elapsed < 1500;
    
    // Draw red hit indicators
    if (this.redFlashTimer > 0) {
      const alpha = this.redFlashTimer / 100;
      ctx.fillStyle = `rgba(255, 59, 48, ${alpha * 0.25})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 3. Draw Equation with fading opacity
    if (isEquationVisible) {
      const opacity = Math.max(0.0, 1.0 - (elapsed / 1500));
      ctx.fillStyle = `rgba(240, 240, 248, ${opacity})`;
      ctx.font = '22px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText(this.equation, cx, cy - 30);
    } else {
      // Equation hidden display banner
      ctx.fillStyle = '#4a4a62';
      ctx.font = '10px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText("EQUATION HIDDEN", cx, cy - 65);
    }

    // 4. Drawing User Typing Input panel
    let shakeX = 0;
    if (this.shakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * 8;
      ctx.strokeStyle = '#ff3b30';
      ctx.fillStyle = '#ff3b30';
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.fillStyle = '#00f0ff';
    }

    // Centered typing box
    const boxW = 160;
    const boxH = 50;
    const bx = cx - boxW / 2 + shakeX;
    const by = cy + 10;
    ctx.fillStyle = '#14141f';
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    // Render active digits inside box
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let displayInput = this.typedAnswer;
    const isCursorBlinking = Math.floor(this.cursorBlinkTimer / 450) % 2 === 0;
    
    // Blinking cursor appender
    if (!isEquationVisible && isCursorBlinking && this.typedAnswer.length < 4) {
      displayInput += "_";
    }
    
    ctx.fillText(displayInput, cx + shakeX, by + boxH / 2);

    // Enter submit helper label
    if (this.typedAnswer.length > 0) {
      ctx.fillStyle = '#8888a8';
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.fillText("PRESS ENTER TO SUBMIT", cx, by + boxH + 20);
    }

    // 5. Draw Floating point popups
    this.floatingTexts.forEach(t => {
      const alpha = t.life / t.maxLife;
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.font = "bold 13px 'JetBrains Mono', monospace";
      ctx.fillText(t.text, t.x, t.y);
    });

    // Score stats
    ctx.fillStyle = '#f0f0f8';
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`LEVEL: ${this.level}`, 20, 50);
    ctx.textAlign = 'right';
    ctx.fillText(`LIVES: ${'♥'.repeat(this.lives)}`, this.width - 20, 50);
  }

  getControls() {
    return [
      { key: '0-9 / -', action: 'Type digit or minus' },
      { key: 'BACKSPACE', action: 'Delete character' },
      { key: 'ENTER', action: 'Submit answer' }
    ];
  }

  getFunStat() {
    return `Correct equations: ${this.correctAnswers} (Level ${this.level})`;
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
