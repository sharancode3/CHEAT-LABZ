import { GameShell } from './game-shell.js';

export default class ChainBurst extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas, config);
    this.clickHandler = (e) => {
      if (!this.isRunning) return;
      if (this.energy < 20) {
        this.floatingTexts.push({ x: this.canvas.width/2, y: this.canvas.height/2, text: 'INSUFFICIENT ENERGY', color: '#EF4444', life: 1.0, vy: -1 });
        return;
      }
      
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      this.energy -= 20;
      this.currentChain = 0;
      
      this.createBurst(x, y, '#fff', 0); // initial burst
    };
    this.canvas.addEventListener('mousedown', this.clickHandler);
  }

  destroy() {
    this.canvas.removeEventListener('mousedown', this.clickHandler);
    super.destroy();
  }

  onStart() {
    this.mods = {
      speedMult: this.config.modifiers?.includes('2x_speed') ? 1.5 : 1,
      reverse: this.config.modifiers?.includes('reverse'),
      noUI: this.config.modifiers?.includes('no_ui'),
      suddenDeath: this.config.modifiers?.includes('sudden_death'),
      limitedVision: this.config.modifiers?.includes('limited_vision')
    };

    this.nodes = [];
    this.explosions = [];
    
    this.spawnTimer = 0;
    this.spawnRate = 1000 / this.mods.speedMult;
    
    this.maxNodes = 50;
    this.energy = 100;
    
    this.currentChain = 0;
    this.maxChain = 0;
    
    this.particles = [];
    this.floatingTexts = [];

    this.score = 0;
    this.updateScore(0);
    
    for(let i=0; i<10; i++) this.spawnNode(); // Initial state
  }

  spawnNode() {
    this.nodes.push({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * 100 * this.mods.speedMult,
      vy: (Math.random() - 0.5) * 100 * this.mods.speedMult,
      radius: 8,
      color: `hsl(${Math.random() * 360}, 80%, 60%)`
    });
  }

  createBurst(x, y, color, chainLevel) {
    this.explosions.push({
      x: x,
      y: y,
      radius: 0,
      maxRadius: 60 + Math.min(chainLevel * 5, 40),
      life: 2000 / this.mods.speedMult,
      color: color,
      chainLevel: chainLevel
    });
    
    if (this.mods.reverse) {
      this.nodes.forEach(n => {
        let dx = n.x - x;
        let dy = n.y - y;
        let dist = Math.hypot(dx, dy);
        if (dist < 200) {
          n.vx += (dx / dist) * 200;
          n.vy += (dy / dist) * 200;
        }
      });
    }
  }

  gameOver() {
    this.createExplosion(this.canvas.width/2, this.canvas.height/2, '#EF4444', 100);
    super.gameOver();
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
    let dtSec = dtMs / 1000;
    
    this.spawnTimer -= dtMs;
    if (this.spawnTimer <= 0) {
      this.spawnNode();
      this.spawnRate = Math.max(200, this.spawnRate - 5);
      this.spawnTimer = this.spawnRate;
    }
    
    if (this.nodes.length >= this.maxNodes) {
      if (this.mods.suddenDeath) return this.gameOver();
      return this.gameOver();
    }
    
    this.energy = Math.min(100, this.energy + 5 * dtSec);
    
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      let exp = this.explosions[i];
      exp.life -= dtMs;
      
      if (exp.radius < exp.maxRadius) {
        exp.radius += 200 * dtSec;
      }
      
      if (exp.life <= 0) {
        this.explosions.splice(i, 1);
        continue;
      }
      
      for (let j = this.nodes.length - 1; j >= 0; j--) {
        let n = this.nodes[j];
        if (Math.hypot(exp.x - n.x, exp.y - n.y) < exp.radius + n.radius) {
          this.currentChain++;
          if (this.currentChain > this.maxChain) this.maxChain = this.currentChain;
          
          this.energy = Math.min(100, this.energy + 2);
          
          let comboMult = 1 + Math.floor(this.currentChain / 5) * 0.5;
          let pts = Math.floor(10 * comboMult);
          this.score += pts;
          this.updateScore(this.score);
          
          this.createBurst(n.x, n.y, n.color, exp.chainLevel + 1);
          
          if (this.currentChain % 5 === 0) {
            this.floatingTexts.push({ x: n.x, y: n.y - 20, text: `${this.currentChain} CHAIN!`, color: '#8B5CF6', life: 1.0, vy: -2 });
          }
          
          this.nodes.splice(j, 1);
        }
      }
    }
    
    this.nodes.forEach(n => {
      n.x += n.vx * dtSec;
      n.y += n.vy * dtSec;
      
      if (n.x < n.radius) { n.x = n.radius; n.vx *= -1; }
      if (n.x > this.canvas.width - n.radius) { n.x = this.canvas.width - n.radius; n.vx *= -1; }
      if (n.y < n.radius) { n.y = n.radius; n.vy *= -1; }
      if (n.y > this.canvas.height - n.radius) { n.y = this.canvas.height - n.radius; n.vy *= -1; }
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

    this.ctx.globalCompositeOperation = 'lighter';
    this.explosions.forEach(exp => {
      this.ctx.fillStyle = exp.color;
      this.ctx.globalAlpha = Math.max(0, (exp.life / (2000 / this.mods.speedMult)) * 0.5);
      this.ctx.beginPath();
      this.ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI*2);
      this.ctx.fill();
    });
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1.0;

    this.nodes.forEach(n => {
      this.ctx.fillStyle = n.color;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = n.color;
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, n.radius, 0, Math.PI*2);
      this.ctx.fill();
    });
    this.ctx.shadowBlur = 0;

    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    this.ctx.textAlign = 'center';
    this.floatingTexts.forEach(ft => {
      this.ctx.fillStyle = ft.color;
      this.ctx.globalAlpha = Math.max(0, ft.life);
      this.ctx.font = "bold 14px 'Press Start 2P', monospace";
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
      this.ctx.fillText(`NODES: ${this.nodes.length}/${this.maxNodes}`, 20, 30);
      
      this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
      this.ctx.fillRect(20, 50, 200, 10);
      this.ctx.fillStyle = this.energy >= 20 ? '#06B6D4' : '#EF4444';
      this.ctx.fillRect(20, 50, this.energy * 2, 10);
    }
  }
}
