import { GameShell } from './game-shell.js';

export default class PhantomCalc extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas, config);
  }

  onStart() {
    this.mods = {
      speedMult: this.config.modifiers?.includes('2x_speed') ? 1.5 : 1,
      reverse: this.config.modifiers?.includes('reverse'),
      noUI: this.config.modifiers?.includes('no_ui'),
      suddenDeath: this.config.modifiers?.includes('sudden_death'),
      limitedVision: this.config.modifiers?.includes('limited_vision')
    };

    this.equation = "";
    this.answer = 0;
    this.playerInput = "";
    
    this.equationAlpha = 1.0;
    this.fadeTime = 3000 / this.mods.speedMult;
    this.timeLimit = 8000 / this.mods.speedMult;
    this.timeLeft = this.timeLimit;
    
    this.combo = 0;
    this.particles = [];
    this.floatingTexts = [];
    
    this.difficultyLevel = 1;
    this.score = 0;
    this.updateScore(0);
    
    this.generateEquation();
  }

  generateEquation() {
    this.difficultyLevel = Math.floor(this.score / 500) + 1;
    
    const ops = ['+', '-', '*'];
    let op = ops[Math.floor(Math.random() * (this.difficultyLevel > 2 ? 3 : 2))];
    
    let a, b;
    if (op === '+') {
      a = Math.floor(Math.random() * 20 * this.difficultyLevel) + 1;
      b = Math.floor(Math.random() * 20 * this.difficultyLevel) + 1;
      this.answer = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 20 * this.difficultyLevel) + 10;
      b = Math.floor(Math.random() * a);
      this.answer = a - b;
    } else if (op === '*') {
      a = Math.floor(Math.random() * (5 + this.difficultyLevel)) + 2;
      b = Math.floor(Math.random() * 10) + 2;
      this.answer = a * b;
    }
    
    this.equation = `${a} ${op} ${b}`;
    
    if (this.mods.reverse) {
      this.equation = this.equation.split('').reverse().join('');
    }

    this.playerInput = "";
    
    this.equationAlpha = 1.0;
    this.timeLeft = this.timeLimit;
  }

  onInput(keyLabel, e, isDown) {
    if (!isDown) return;
    
    const key = e.key;
    
    if (key === 'Backspace') {
      this.playerInput = this.playerInput.slice(0, -1);
    } else if (key === 'Enter') {
      this.checkAnswer();
    } else if (key === '-' && this.playerInput === "") {
      this.playerInput += key;
    } else if (/[0-9]/.test(key)) {
      if (this.playerInput.length < 5) {
        this.playerInput += key;
      }
    }
  }

  checkAnswer() {
    if (this.playerInput === "") return;
    
    if (parseInt(this.playerInput) === this.answer) {
      this.combo++;
      let basePoints = 50 * this.difficultyLevel;
      let timeBonus = Math.floor((this.timeLeft / this.timeLimit) * 50);
      let phantomBonus = this.equationAlpha <= 0 ? 100 : 0;
      
      let points = (basePoints + timeBonus + phantomBonus) * (1 + (this.combo * 0.1));
      points = Math.floor(points);
      
      this.score += points;
      this.updateScore(this.score);
      
      this.createExplosion(this.canvas.width/2, this.canvas.height/2, '#06B6D4', 50);
      
      let text = phantomBonus > 0 ? `PHANTOM CLEAR! +${points}` : `CORRECT +${points}`;
      this.floatingTexts.push({ x: this.canvas.width/2, y: this.canvas.height/2, text: text, color: '#06B6D4', life: 1.0, vy: -2 });
      
      this.generateEquation();
    } else {
      if (this.mods.suddenDeath) return this.gameOver();
      
      this.combo = 0;
      this.score = Math.max(0, this.score - 50);
      this.updateScore(this.score);
      
      this.createExplosion(this.canvas.width/2, this.canvas.height/2, '#EF4444', 30);
      this.floatingTexts.push({ x: this.canvas.width/2, y: this.canvas.height/2, text: 'INCORRECT', color: '#EF4444', life: 1.0, vy: 1 });
      this.playerInput = "";
      
      this.equationAlpha = 1.0;
    }
  }

  createExplosion(x, y, color, count=30) {
    for(let i=0; i<count; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        life: 1.0,
        color: color
      });
    }
  }

  update(dtMs) {
    const dtSec = dtMs / 1000;
    this.timeLeft -= dtMs;
    if (this.timeLeft <= 0) {
      if (this.mods.suddenDeath) return this.gameOver();
      this.combo = 0;
      this.score = Math.max(0, this.score - 50);
      this.updateScore(this.score);
      this.generateEquation();
    }

    if (this.equationAlpha > 0) {
      this.equationAlpha -= dtSec * (1000 / this.fadeTime);
      if (this.equationAlpha < 0) this.equationAlpha = 0;
    }

    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dtSec * 2;
      return p.life > 0;
    });

    this.floatingTexts = this.floatingTexts.filter(ft => {
      ft.y += ft.vy;
      ft.life -= dtSec;
      return ft.life > 0;
    });
  }

  draw() {
    this.ctx.fillStyle = '#09090B';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = 'rgba(139, 92, 246, 0.05)';
    this.ctx.font = "20px 'JetBrains Mono', monospace";
    for(let i=0; i<30; i++) {
      const syms = ['+', '-', '*', '/', '=', '%'];
      this.ctx.fillText(syms[Math.floor(Math.random()*syms.length)], Math.random() * this.canvas.width, Math.random() * this.canvas.height);
    }

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    if (this.equationAlpha > 0) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${this.equationAlpha})`;
      this.ctx.font = "bold 64px 'JetBrains Mono', monospace";
      this.ctx.shadowBlur = 20 * this.equationAlpha;
      this.ctx.shadowColor = '#fff';
      this.ctx.fillText(this.equation + " = ?", this.canvas.width/2, this.canvas.height/2 - 60);
      this.ctx.shadowBlur = 0;
    } else {
      this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.canvas.height/2 - 60);
      this.ctx.lineTo(this.canvas.width, this.canvas.height/2 - 60);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.strokeStyle = '#8B5CF6';
    this.ctx.beginPath();
    this.ctx.roundRect(this.canvas.width/2 - 150, this.canvas.height/2 + 40, 300, 60, 8);
    this.ctx.fill();
    this.ctx.stroke();
    
    this.ctx.fillStyle = '#8B5CF6';
    this.ctx.font = "bold 32px 'JetBrains Mono', monospace";
    this.ctx.fillText(this.playerInput + (Math.floor(performance.now() / 500) % 2 === 0 ? '_' : ''), this.canvas.width/2, this.canvas.height/2 + 70);

    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    this.floatingTexts.forEach(ft => {
      this.ctx.fillStyle = ft.color;
      this.ctx.globalAlpha = Math.max(0, ft.life);
      this.ctx.font = "bold 16px 'Press Start 2P', monospace";
      this.ctx.fillText(ft.text, ft.x, ft.y);
    });
    this.ctx.globalAlpha = 1.0;

    if (this.mods.limitedVision) {
      this.ctx.globalCompositeOperation = 'destination-in';
      const gradient = this.ctx.createRadialGradient(this.canvas.width/2, this.canvas.height/2, 100, this.canvas.width/2, this.canvas.height/2, 350);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalCompositeOperation = 'source-over';
    }

    if (!this.mods.noUI) {
      const timerRatio = this.timeLeft / this.timeLimit;
      this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
      this.ctx.fillRect(0, 0, this.canvas.width, 5);
      this.ctx.fillStyle = timerRatio > 0.3 ? '#8B5CF6' : '#EF4444';
      this.ctx.fillRect(0, 0, this.canvas.width * timerRatio, 5);
      
      this.ctx.fillStyle = '#fff';
      this.ctx.font = "12px 'JetBrains Mono', monospace";
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`LEVEL ${this.difficultyLevel} | COMBO x${this.combo}`, 20, 30);
    }
  }
}
