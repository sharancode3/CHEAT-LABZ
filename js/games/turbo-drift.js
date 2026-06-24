import { GameShell } from './game-shell.js';

export default class TurboDrift extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas, config);
    this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };
  }

  onStart() {
    this.mods = {
      speedMult: this.config.modifiers?.includes('2x_speed') ? 1.5 : 1,
      reverse: this.config.modifiers?.includes('reverse'),
      noUI: this.config.modifiers?.includes('no_ui'),
      suddenDeath: this.config.modifiers?.includes('sudden_death'),
      limitedVision: this.config.modifiers?.includes('limited_vision')
    };

    this.car = {
      x: this.canvas.width / 2,
      y: this.canvas.height - 150,
      width: 20,
      height: 40,
      angle: -Math.PI / 2,
      velocity: 0,
      maxSpeed: 400 * this.mods.speedMult,
      acceleration: 800,
      friction: 200,
      turnSpeed: 4.5
    };

    this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };
    
    this.trackScrollY = 0;
    this.curveTime = 0;
    this.roadSegments = [];
    this.roadWidth = 200;
    this.generateInitialRoad();

    this.skidMarks = [];
    this.boostPads = [];
    this.particles = [];
    
    this.driftScore = 0;
    this.driftMultiplier = 1;
    this.isDrifting = false;
    
    this.score = 0;
    this.updateScore(0);
  }

  onInput(key, e, isDown) {
    if(this.keys.hasOwnProperty(e.key)) this.keys[e.key] = isDown;
  }

  generateInitialRoad() {
    for(let i=0; i < this.canvas.height / 20 + 20; i++) {
      this.addRoadSegment(this.canvas.height - (i * 20));
    }
  }

  addRoadSegment(y) {
    this.curveTime += 0.05;
    const offset = Math.sin(this.curveTime) * 200 + Math.sin(this.curveTime * 0.3) * 100;
    this.roadSegments.push({
      y: y,
      x: this.canvas.width / 2 + offset
    });

    if (Math.random() < 0.02) {
      this.boostPads.push({
        x: this.canvas.width / 2 + offset + (Math.random() - 0.5) * (this.roadWidth - 40),
        y: y,
        active: true
      });
    }
  }

  createExplosion(x, y, color, count=20) {
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
    const dtSec = Math.min(dtMs / 1000, 0.05);
    
    let up = this.keys.ArrowUp || this.keys.w;
    let down = this.keys.ArrowDown || this.keys.s;
    let left = this.keys.ArrowLeft || this.keys.a;
    let right = this.keys.ArrowRight || this.keys.d;

    if (this.mods.reverse) {
      let tempU = up; up = down; down = tempU;
      let tempL = left; left = right; right = tempL;
    }

    if (up) {
      this.car.velocity += this.car.acceleration * dtSec;
    } else if (down) {
      this.car.velocity -= this.car.acceleration * dtSec;
    } else {
      if (this.car.velocity > 0) this.car.velocity -= this.car.friction * dtSec;
      if (this.car.velocity < 0) this.car.velocity += this.car.friction * dtSec;
    }
    
    if (Math.abs(this.car.velocity) < 10) this.car.velocity = 0;
    
    if (this.car.velocity > this.car.maxSpeed) this.car.velocity = this.car.maxSpeed;
    if (this.car.velocity < -this.car.maxSpeed/2) this.car.velocity = -this.car.maxSpeed/2;

    const speedRatio = Math.abs(this.car.velocity) / this.car.maxSpeed;
    if (this.car.velocity !== 0) {
      const turnDir = this.car.velocity > 0 ? 1 : -1;
      if (left) this.car.angle -= this.car.turnSpeed * dtSec * speedRatio * turnDir;
      if (right) this.car.angle += this.car.turnSpeed * dtSec * speedRatio * turnDir;
    }

    this.isDrifting = (left || right) && Math.abs(this.car.velocity) > 200;

    if (this.isDrifting) {
      this.driftScore += 100 * dtSec * this.driftMultiplier;
      this.driftMultiplier = Math.min(this.driftMultiplier + dtSec * 2, 5);
      
      this.skidMarks.push({
        x: this.car.x,
        y: this.car.y,
        life: 1.0
      });

      if(Math.random() < 0.3) {
        this.particles.push({
          x: this.car.x, y: this.car.y,
          vx: Math.cos(this.car.angle + Math.PI/2) * (left ? 5 : -5),
          vy: Math.sin(this.car.angle + Math.PI/2) * (left ? 5 : -5),
          life: 0.5, color: '#FBBF24'
        });
      }
    } else {
      this.driftMultiplier = Math.max(1, this.driftMultiplier - dtSec);
      if (this.driftScore > 0) {
        this.score += Math.floor(this.driftScore);
        this.updateScore(this.score);
        this.driftScore = 0;
      }
    }

    const dx = Math.cos(this.car.angle) * this.car.velocity * dtSec;
    const dy = Math.sin(this.car.angle) * this.car.velocity * dtSec;

    this.car.x += dx;
    
    const scrollDelta = -dy;
    
    if (scrollDelta > 0) {
      this.score += Math.floor(scrollDelta * 0.1);
      this.updateScore(this.score);
    }

    this.trackScrollY += scrollDelta;
    if (this.trackScrollY > 20) {
      this.trackScrollY -= 20;
      this.roadSegments.unshift({
        y: this.roadSegments[0].y - 20,
        x: this.canvas.width / 2 + Math.sin(this.curveTime) * 200 + Math.sin(this.curveTime * 0.3) * 100
      });
      this.curveTime += 0.05;
      
      if (Math.random() < 0.02) {
        this.boostPads.push({
          x: this.roadSegments[0].x + (Math.random() - 0.5) * (this.roadWidth - 40),
          y: this.roadSegments[0].y,
          active: true
        });
      }

      this.roadSegments.pop();
    }

    this.roadSegments.forEach(seg => seg.y += scrollDelta);
    this.skidMarks.forEach(s => s.y += scrollDelta);
    this.boostPads.forEach(b => b.y += scrollDelta);
    this.particles.forEach(p => p.y += scrollDelta);

    let closestSeg = this.roadSegments.reduce((prev, curr) => 
      Math.abs(curr.y - this.car.y) < Math.abs(prev.y - this.car.y) ? curr : prev
    );

    const distFromCenter = Math.abs(this.car.x - closestSeg.x);
    if (distFromCenter > this.roadWidth / 2) {
      if (this.mods.suddenDeath) {
        this.createExplosion(this.car.x, this.car.y, '#EF4444', 100);
        this.draw();
        this.gameOver();
        return;
      } else {
        this.car.velocity *= 0.95;
        if(Math.random() < 0.2 && this.car.velocity > 50) {
          this.particles.push({
            x: this.car.x, y: this.car.y,
            vx: (Math.random() - 0.5) * 5, vy: -scrollDelta + (Math.random()-0.5)*5,
            life: 0.5, color: '#5C4033'
          });
        }
      }
    }

    this.boostPads.forEach(b => {
      if (b.active && Math.hypot(b.x - this.car.x, b.y - this.car.y) < 30) {
        b.active = false;
        this.car.velocity = this.car.maxSpeed * 1.5;
        this.createExplosion(b.x, b.y, '#06B6D4', 10);
      }
    });

    this.skidMarks = this.skidMarks.filter(s => { s.life -= 0.5 * dtSec; return s.life > 0; });
    this.boostPads = this.boostPads.filter(b => b.y < this.canvas.height + 100);
    this.particles = this.particles.filter(p => { p.x += p.vx; p.y += p.vy; p.life -= dtSec * 2; return p.life > 0; });
  }

  draw() {
    this.ctx.fillStyle = '#09090B';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#1A1A1A';
    this.ctx.beginPath();
    this.ctx.moveTo(this.roadSegments[0].x - this.roadWidth/2, this.roadSegments[0].y);
    for(let i=1; i<this.roadSegments.length; i++) {
      this.ctx.lineTo(this.roadSegments[i].x - this.roadWidth/2, this.roadSegments[i].y);
    }
    for(let i=this.roadSegments.length-1; i>=0; i--) {
      this.ctx.lineTo(this.roadSegments[i].x + this.roadWidth/2, this.roadSegments[i].y);
    }
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#8B5CF6';
    this.ctx.lineWidth = 4;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#8B5CF6';
    this.ctx.beginPath();
    for(let i=0; i<this.roadSegments.length; i++) this.ctx.lineTo(this.roadSegments[i].x - this.roadWidth/2, this.roadSegments[i].y);
    this.ctx.stroke();
    this.ctx.beginPath();
    for(let i=0; i<this.roadSegments.length; i++) this.ctx.lineTo(this.roadSegments[i].x + this.roadWidth/2, this.roadSegments[i].y);
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    this.boostPads.forEach(b => {
      if(b.active) {
        this.ctx.fillStyle = '#06B6D4';
        this.ctx.fillRect(b.x - 15, b.y - 5, 30, 10);
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.moveTo(b.x - 5, b.y + 5);
        this.ctx.lineTo(b.x + 5, b.y + 5);
        this.ctx.lineTo(b.x, b.y - 5);
        this.ctx.fill();
      }
    });

    this.skidMarks.forEach(s => {
      this.ctx.fillStyle = `rgba(0,0,0,${s.life * 0.5})`;
      this.ctx.fillRect(s.x - 5, s.y - 5, 10, 10);
    });

    this.ctx.save();
    this.ctx.translate(this.car.x, this.car.y);
    this.ctx.rotate(this.car.angle);
    
    if (this.car.velocity > this.car.maxSpeed * 0.8) {
      this.ctx.fillStyle = '#FBBF24';
      this.ctx.beginPath();
      this.ctx.moveTo(-this.car.width/2 + 5, this.car.height/2);
      this.ctx.lineTo(-this.car.width/2 + 10, this.car.height/2 + Math.random()*20 + 10);
      this.ctx.lineTo(0, this.car.height/2 + Math.random()*10);
      this.ctx.lineTo(this.car.width/2 - 10, this.car.height/2 + Math.random()*20 + 10);
      this.ctx.lineTo(this.car.width/2 - 5, this.car.height/2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = '#EF4444';
    this.ctx.shadowColor = '#EF4444';
    this.ctx.shadowBlur = 10;
    this.ctx.fillRect(-this.car.width/2, -this.car.height/2, this.car.width, this.car.height);
    this.ctx.fillStyle = '#000';
    this.ctx.shadowBlur = 0;
    this.ctx.fillRect(-this.car.width/2 + 2, -this.car.height/4, this.car.width - 4, this.car.height/2);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(-this.car.width/2 + 2, -this.car.height/2 - 2, 4, 4);
    this.ctx.fillRect(this.car.width/2 - 6, -this.car.height/2 - 2, 4, 4);
    
    this.ctx.restore();

    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 2, 0, Math.PI*2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    if (this.mods.limitedVision) {
      this.ctx.globalCompositeOperation = 'destination-in';
      const gradient = this.ctx.createRadialGradient(this.car.x, this.car.y, 100, this.car.x, this.car.y, 300);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalCompositeOperation = 'source-over';
    }

    if (!this.mods.noUI) {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = "14px 'JetBrains Mono', monospace";
      this.ctx.fillText(`SPEED: ${Math.floor(this.car.velocity)} KM/H`, 20, 30);
      
      if (this.isDrifting) {
        this.ctx.fillStyle = '#FBBF24';
        this.ctx.fillText(`DRIFT x${this.driftMultiplier.toFixed(1)} : +${Math.floor(this.driftScore)}`, 20, 50);
      }
    }
  }
}
