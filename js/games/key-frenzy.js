import { GameShell } from './game-shell.js';

export default class KeyFrenzy extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas, config);
    this.layoutRows = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
    ];
  }

  onStart() {
    this.mods = {
      speedMult: this.config.modifiers?.includes('2x_speed') ? 1.5 : 1,
      reverse: this.config.modifiers?.includes('reverse'),
      noUI: this.config.modifiers?.includes('no_ui'),
      suddenDeath: this.config.modifiers?.includes('sudden_death'),
      limitedVision: this.config.modifiers?.includes('limited_vision')
    };

    this.keys = [];
    this.initKeyboard();

    this.targetKey = null;
    this.targetTimer = 0;
    this.maxTime = 3000 / this.mods.speedMult;
    
    this.combo = 0;
    this.comboMultiplier = 1;
    this.round = 1;
    
    this.particles = [];
    this.floatingTexts = [];
    
    this.score = 0;
    this.updateScore(0);
    this.pickNextKey();
  }

  initKeyboard() {
    this.keys = [];
    const keySize = 50;
    const gap = 10;
    
    let startY = this.canvas.height / 2;
    
    this.layoutRows.forEach((row, rIdx) => {
      let rowWidth = row.length * keySize + (row.length - 1) * gap;
      let startX = (this.canvas.width - rowWidth) / 2;
      
      let actualRow = this.mods.reverse ? [...row].reverse() : row;

      actualRow.forEach((char, cIdx) => {
        this.keys.push({
          char: char,
          actualChar: row[cIdx],
          x: startX + cIdx * (keySize + gap),
          y: startY + rIdx * (keySize + gap),
          size: keySize,
          state: 'idle',
          scale: 1,
          alpha: 1
        });
      });
    });
  }

  pickNextKey() {
    this.targetKey = this.keys[Math.floor(Math.random() * this.keys.length)];
    this.targetKey.state = 'target';
    this.targetTimer = this.maxTime;
    
    this.maxTime = Math.max(800, 3000 - (this.round * 100));
  }

  onInput(key, e, isDown) {
    if (!isDown) return;
    
    const pressed = key.toUpperCase();
    if (pressed.length !== 1 || !/[A-Z]/.test(pressed)) return;
    
    e.preventDefault();

    let targetChar = this.targetKey.actualChar;

    if (pressed === targetChar) {
      this.handleHit();
    } else {
      this.targetTimer -= 500;
      let wrongKey = this.keys.find(k => k.actualChar === pressed);
      if(wrongKey) {
        wrongKey.state = 'miss';
        this.createExplosion(wrongKey.x + wrongKey.size/2, wrongKey.y + wrongKey.size/2, '#EF4444', 5);
        setTimeout(() => { if(wrongKey.state === 'miss') wrongKey.state = 'idle'; }, 200);
      }
    }
  }

  handleHit() {
    this.createExplosion(this.targetKey.x + this.targetKey.size/2, this.targetKey.y + this.targetKey.size/2, '#06B6D4');
    this.floatingTexts.push({
      x: this.targetKey.x + this.targetKey.size/2,
      y: this.targetKey.y,
      text: 'PERFECT',
      color: '#06B6D4',
      life: 1.0,
      vy: -2
    });

    this.targetKey.state = 'idle';
    
    this.combo++;
    if (this.combo > 10) this.comboMultiplier = 4;
    else if (this.combo > 5) this.comboMultiplier = 2;
    
    let timeBonus = Math.floor((this.targetTimer / this.maxTime) * 50);
    this.score += (50 + timeBonus) * this.comboMultiplier;
    this.updateScore(this.score);
    
    this.round++;
    this.pickNextKey();
  }

  handleMiss() {
    if (this.mods.suddenDeath) {
      this.createExplosion(this.targetKey.x + this.targetKey.size/2, this.targetKey.y + this.targetKey.size/2, '#EF4444', 50);
      this.draw();
      return this.gameOver();
    }
    
    this.createExplosion(this.targetKey.x + this.targetKey.size/2, this.targetKey.y + this.targetKey.size/2, '#EF4444');
    this.floatingTexts.push({
      x: this.targetKey.x + this.targetKey.size/2,
      y: this.targetKey.y,
      text: 'MISS',
      color: '#EF4444',
      life: 1.0,
      vy: 1
    });

    this.targetKey.state = 'idle';
    this.combo = 0;
    this.comboMultiplier = 1;
    this.score = Math.max(0, this.score - 100);
    this.updateScore(this.score);

    this.round++;
    this.pickNextKey();
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
    this.targetTimer -= dtMs;
    if (this.targetTimer <= 0) {
      this.handleMiss();
    }

    this.keys.forEach(k => {
      if (k.state === 'target') {
        k.scale = 1 + Math.sin(performance.now() * 0.01) * 0.1;
      } else {
        k.scale += (1 - k.scale) * 0.1;
      }
    });

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

    const isBlindRound = this.round % 5 === 0;

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    this.keys.forEach(k => {
      this.ctx.save();
      this.ctx.translate(k.x + k.size/2, k.y + k.size/2);
      this.ctx.scale(k.scale, k.scale);

      this.ctx.lineWidth = 2;
      if (k.state === 'target') {
        this.ctx.fillStyle = 'rgba(6,182,212,0.2)';
        this.ctx.strokeStyle = '#06B6D4';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#06B6D4';
      } else if (k.state === 'miss') {
        this.ctx.fillStyle = 'rgba(239,68,68,0.5)';
        this.ctx.strokeStyle = '#EF4444';
        this.ctx.shadowBlur = 0;
      } else {
        this.ctx.fillStyle = 'rgba(255,255,255,0.05)';
        this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        this.ctx.shadowBlur = 0;
      }

      this.ctx.beginPath();
      this.ctx.roundRect(-k.size/2, -k.size/2, k.size, k.size, 8);
      this.ctx.fill();
      this.ctx.stroke();

      if (!isBlindRound || k.state === 'target') {
        this.ctx.fillStyle = k.state === 'target' ? '#06B6D4' : '#fff';
        this.ctx.font = "bold 20px 'Inter', sans-serif";
        this.ctx.shadowBlur = k.state === 'target' ? 10 : 0;
        this.ctx.fillText(k.char, 0, 0);
      }

      this.ctx.restore();
    });

    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;
    this.ctx.shadowBlur = 0;

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
      const timerRatio = Math.max(0, this.targetTimer / this.maxTime);
      this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
      this.ctx.fillRect(this.canvas.width/2 - 200, 100, 400, 10);
      this.ctx.fillStyle = timerRatio > 0.3 ? '#06B6D4' : '#EF4444';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = this.ctx.fillStyle;
      this.ctx.fillRect(this.canvas.width/2 - 200, 100, 400 * timerRatio, 10);
      this.ctx.shadowBlur = 0;

      this.ctx.fillStyle = '#fff';
      this.ctx.font = "24px 'Press Start 2P', monospace";
      this.ctx.fillText(`PRESS: ${this.targetKey ? this.targetKey.actualChar : ''}`, this.canvas.width/2, 60);

      if (this.combo > 0) {
        this.ctx.fillStyle = '#8B5CF6';
        this.ctx.font = "bold 24px 'JetBrains Mono', monospace";
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#8B5CF6';
        this.ctx.fillText(`${this.combo} STREAK (${this.comboMultiplier}x)`, this.canvas.width/2, 140);
        this.ctx.shadowBlur = 0;
      }

      if (isBlindRound) {
        this.ctx.fillStyle = '#EF4444';
        this.ctx.font = "bold 16px 'Press Start 2P', monospace";
        this.ctx.fillText(`BLIND ROUND`, this.canvas.width/2, this.canvas.height - 100);
      }
    }
  }
}
