import { GameShell } from './game-shell.js';

export default class ReflexRush extends GameShell {
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

    this.colors = [
      { id: 'RED', hex: '#EF4444', key: 'ArrowLeft', label: 'LEFT' },
      { id: 'GREEN', hex: '#10B981', key: 'ArrowUp', label: 'UP' },
      { id: 'BLUE', hex: '#3B82F6', key: 'ArrowRight', label: 'RIGHT' },
      { id: 'YELLOW', hex: '#FBBF24', key: 'ArrowDown', label: 'DOWN' }
    ];
    
    if (this.mods.reverse) {
      this.colors[0].key = 'ArrowRight'; this.colors[0].label = 'RIGHT';
      this.colors[1].key = 'ArrowDown'; this.colors[1].label = 'DOWN';
      this.colors[2].key = 'ArrowLeft'; this.colors[2].label = 'LEFT';
      this.colors[3].key = 'ArrowUp'; this.colors[3].label = 'UP';
    }

    this.currentColor = null;
    this.timeLimit = 2000 / this.mods.speedMult;
    this.timeLeft = this.timeLimit;
    
    this.combo = 0;
    this.particles = [];
    this.floatingTexts = [];
    
    this.nextEventTimer = 1000;
    this.state = 'WAITING';
    
    this.score = 0;
    this.updateScore(0);
  }

  spawnEvent() {
    this.currentColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    this.timeLimit = Math.max(400, 2000 - (this.score * 2)) / this.mods.speedMult;
    this.timeLeft = this.timeLimit;
    this.state = 'ACTIVE';
    
    this.createExplosion(this.canvas.width/2, this.canvas.height/2 - 50, this.currentColor.hex, 20);
  }

  onInput(key, e, isDown) {
    if (!isDown || this.state !== 'ACTIVE') return;
    
    let mappedKey = key;
    if (key === 'a' || key === 'A') mappedKey = 'ArrowLeft';
    if (key === 'w' || key === 'W') mappedKey = 'ArrowUp';
    if (key === 'd' || key === 'D') mappedKey = 'ArrowRight';
    if (key === 's' || key === 'S') mappedKey = 'ArrowDown';

    if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(mappedKey)) {
      this.handleInput(mappedKey);
    }
  }

  handleInput(key) {
    if (key === this.currentColor.key) {
      this.combo++;
      let timeBonus = Math.floor((this.timeLeft / this.timeLimit) * 50);
      let pts = (50 + timeBonus) * (1 + Math.floor(this.combo / 10));
      this.score += pts;
      this.updateScore(this.score);
      
      this.createExplosion(this.canvas.width/2, this.canvas.height/2 - 50, '#06B6D4', 30);
      this.floatingTexts.push({ x: this.canvas.width/2, y: this.canvas.height/2 - 100, text: 'PERFECT', color: '#06B6D4', life: 1.0, vy: -2 });
      
      this.state = 'WAITING';
      this.nextEventTimer = Math.random() * 500 + 200;
    } else {
      this.handleMiss();
    }
  }

  handleMiss() {
    if (this.mods.suddenDeath) {
      this.createExplosion(this.canvas.width/2, this.canvas.height/2, '#EF4444', 100);
      this.draw();
      return this.gameOver();
    }
    
    this.combo = 0;
    this.score = Math.max(0, this.score - 50);
    this.updateScore(this.score);
    
    this.createExplosion(this.canvas.width/2, this.canvas.height/2 - 50, '#EF4444', 30);
    this.floatingTexts.push({ x: this.canvas.width/2, y: this.canvas.height/2 - 100, text: 'MISS', color: '#EF4444', life: 1.0, vy: 1 });
    
    this.state = 'WAITING';
    this.nextEventTimer = 1000;
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
    
    if (this.state === 'WAITING') {
      this.nextEventTimer -= dtMs;
      if (this.nextEventTimer <= 0) {
        this.spawnEvent();
      }
    } else if (this.state === 'ACTIVE') {
      this.timeLeft -= dtMs;
      if (this.timeLeft <= 0) {
        this.handleMiss();
      }
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

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    if (this.state === 'ACTIVE' && this.currentColor) {
      this.ctx.fillStyle = this.currentColor.hex;
      this.ctx.globalAlpha = 0.1;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalAlpha = 1.0;
      
      this.ctx.fillStyle = this.currentColor.hex;
      this.ctx.shadowBlur = 30;
      this.ctx.shadowColor = this.currentColor.hex;
      
      const size = 100 + Math.sin(performance.now()/50)*10;
      this.ctx.beginPath();
      for(let i=0; i<6; i++) {
        this.ctx.lineTo(this.canvas.width/2 + size * Math.cos(i * Math.PI / 3), this.canvas.height/2 - 50 + size * Math.sin(i * Math.PI / 3));
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
      
      const ratio = this.timeLeft / this.timeLimit;
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(this.canvas.width/2, this.canvas.height/2 - 50, size + Math.max(0, ratio * 200), 0, Math.PI*2);
      this.ctx.stroke();
      
    } else {
      this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
      this.ctx.beginPath();
      for(let i=0; i<6; i++) {
        this.ctx.lineTo(this.canvas.width/2 + 100 * Math.cos(i * Math.PI / 3), this.canvas.height/2 - 50 + 100 * Math.sin(i * Math.PI / 3));
      }
      this.ctx.closePath();
      this.ctx.fill();
    }

    const legendY = this.canvas.height - 100;
    this.ctx.font = "bold 14px 'JetBrains Mono', monospace";
    this.colors.forEach((c, i) => {
      const x = this.canvas.width/2 - 150 + i * 100;
      this.ctx.fillStyle = c.hex;
      this.ctx.fillText(c.label, x, legendY);
      
      this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
      this.ctx.fillRect(x - 40, legendY + 15, 80, 40);
      
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText(c.id, x, legendY + 35);
    });

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
      this.ctx.font = "bold 20px 'Press Start 2P', monospace";
      this.ctx.fillText(ft.text, ft.x, ft.y);
    });
    this.ctx.globalAlpha = 1.0;

    if (this.mods.limitedVision) {
      this.ctx.globalCompositeOperation = 'destination-in';
      const gradient = this.ctx.createRadialGradient(this.canvas.width/2, this.canvas.height/2, 50, this.canvas.width/2, this.canvas.height/2, 300);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalCompositeOperation = 'source-over';
    }

    if (!this.mods.noUI) {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = "14px 'JetBrains Mono', monospace";
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`COMBO: ${this.combo}`, 20, 30);
    }
  }
}
