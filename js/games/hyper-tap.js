import { GameShell } from './game-shell.js';

export default class HyperTap extends GameShell {
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

    this.nodes = [];
    this.spawnTimer = 0;
    this.spawnRate = 1000 / this.mods.speedMult;
    
    this.stats = {
      hits: 0,
      misses: 0,
      totalDist: 0
    };
    
    this.combo = 0;
    this.particles = [];
    this.floatingTexts = [];
    
    this.score = 0;
    this.updateScore(0);
  }

  spawnNode() {
    this.nodes.push({
      x: 100 + Math.random() * (this.canvas.width - 200),
      y: 100 + Math.random() * (this.canvas.height - 200),
      radius: 40,
      maxLife: 2000 / this.mods.speedMult,
      life: 2000 / this.mods.speedMult,
      color: `hsl(${Math.random() * 360}, 80%, 60%)`
    });
  }

  onClick(x, y) {
    let hitNodeIdx = -1;
    let bestDist = Infinity;
    
    // Find closest overlapping node
    for (let i = 0; i < this.nodes.length; i++) {
      let n = this.nodes[i];
      let dist = Math.hypot(n.x - x, n.y - y);
      if (dist <= n.radius && dist < bestDist) {
        bestDist = dist;
        hitNodeIdx = i;
      }
    }
    
    if (hitNodeIdx !== -1) {
      let n = this.nodes[hitNodeIdx];
      let accuracy = 1 - (bestDist / n.radius); // 0 to 1
      
      this.stats.hits++;
      this.stats.totalDist += accuracy;
      
      let pts = 0;
      let text = '';
      let color = n.color;
      
      if (accuracy > 0.8) {
        pts = 100;
        text = 'PERFECT';
        this.combo++;
      } else if (accuracy > 0.5) {
        pts = 50;
        text = 'GOOD';
        this.combo++;
      } else {
        pts = 10;
        text = 'OK';
        this.combo = 0;
      }
      
      let comboMult = 1 + Math.floor(this.combo / 5) * 0.5;
      this.score += Math.floor(pts * comboMult);
      this.updateScore(this.score);
      
      this.createExplosion(n.x, n.y, color, 20);
      this.floatingTexts.push({ x: n.x, y: n.y, text: `${text} ${Math.floor(accuracy*100)}%`, color: color, life: 1.0, vy: -2 });
      
      this.nodes.splice(hitNodeIdx, 1);
      
    } else {
      // Missed completely
      this.stats.misses++;
      this.combo = 0;
      
      if (this.mods.suddenDeath) {
        this.createExplosion(x, y, '#EF4444', 100);
        this.draw();
        return this.gameOver();
      }
      
      this.score = Math.max(0, this.score - 50);
      this.updateScore(this.score);
      
      this.createExplosion(x, y, '#EF4444', 10);
      this.floatingTexts.push({ x: x, y: y, text: 'MISS', color: '#EF4444', life: 1.0, vy: 1 });
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
    
    this.spawnTimer -= dtMs;
    if (this.spawnTimer <= 0) {
      this.spawnNode();
      this.spawnRate = Math.max(300, this.spawnRate - 10);
      this.spawnTimer = this.spawnRate;
    }
    
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      let n = this.nodes[i];
      n.life -= dtMs;
      
      if (this.mods.reverse) {
         // Nodes move erratically
         n.x += (Math.random() - 0.5) * 10;
         n.y += (Math.random() - 0.5) * 10;
      }
      
      if (n.life <= 0) {
        // Expired = miss
        this.stats.misses++;
        this.combo = 0;
        
        if (this.mods.suddenDeath) {
          this.createExplosion(n.x, n.y, '#EF4444', 100);
          this.draw();
          return this.gameOver();
        }
        
        this.score = Math.max(0, this.score - 50);
        this.updateScore(this.score);
        
        this.createExplosion(n.x, n.y, '#EF4444', 15);
        this.floatingTexts.push({ x: n.x, y: n.y, text: 'EXPIRED', color: '#EF4444', life: 1.0, vy: 1 });
        
        this.nodes.splice(i, 1);
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

    this.nodes.forEach(n => {
      // Background pulsing
      this.ctx.fillStyle = `rgba(255,255,255,0.05)`;
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, n.radius + Math.sin(performance.now()/100)*5, 0, Math.PI*2);
      this.ctx.fill();
      
      // Target Node
      this.ctx.fillStyle = n.color;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = n.color;
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, n.radius, 0, Math.PI*2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
      
      // Exact Center dot
      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, 4, 0, Math.PI*2);
      this.ctx.fill();
      
      // Closing Ring (Timing)
      let ringRadius = n.radius + (n.life / n.maxLife) * 100;
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, ringRadius, 0, Math.PI*2);
      this.ctx.stroke();
    });

    // Particles & Texts
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

    // Limited Vision Mod
    if (this.mods.limitedVision) {
      this.ctx.globalCompositeOperation = 'destination-in';
      const gradient = this.ctx.createRadialGradient(this.canvas.width/2, this.canvas.height/2, 50, this.canvas.width/2, this.canvas.height/2, 300);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalCompositeOperation = 'source-over';
    }

    // UI
    if (!this.mods.noUI) {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = "14px 'JetBrains Mono', monospace";
      this.ctx.textAlign = 'left';
      let acc = this.stats.hits === 0 ? 100 : Math.floor((this.stats.totalDist / this.stats.hits) * 100);
      this.ctx.fillText(`ACCURACY: ${acc}% | COMBO: ${this.combo}`, 20, 30);
    }
  }
}
