import { GameShell } from './game-shell.js';

export default class TileRunner extends GameShell {
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

    this.lanes = [this.canvas.width/2 - 100, this.canvas.width/2, this.canvas.width/2 + 100];
    this.laneWidth = 100;
    
    this.player = {
      lane: 1, // 0, 1, 2
      y: this.canvas.height - 100,
      radius: 15,
      z: 0, // for jumping
      vz: 0,
      isJumping: false,
      color: '#06B6D4'
    };

    this.obstacles = [];
    this.coins = [];
    
    this.scrollSpeed = 400 * this.mods.speedMult;
    this.distance = 0;
    
    this.spawnTimer = 0;
    this.spawnInterval = 800 / this.mods.speedMult;
    
    this.particles = [];
    this.floatingTexts = [];

    this.score = 0;
    this.updateScore(0);
  }

  onInput(keyLabel, e, isDown) {
    if (!isDown) return;
    
    let leftKey = 'arrowleft';
    let rightKey = 'arrowright';
    if (this.mods.reverse) {
      leftKey = 'arrowright';
      rightKey = 'arrowleft';
    }

    if (keyLabel === leftKey || keyLabel === 'a') {
      if (this.player.lane > 0) this.player.lane--;
    } else if (keyLabel === rightKey || keyLabel === 'd') {
      if (this.player.lane < 2) this.player.lane++;
    } else if (keyLabel === 'arrowup' || keyLabel === 'w' || keyLabel === ' ' || e.code === 'Space') {
      if (!this.player.isJumping) {
        this.player.isJumping = true;
        this.player.vz = 400; // Jump force
        this.createExplosion(this.lanes[this.player.lane], this.player.y, '#fff', 5);
      }
    }
  }

  spawnEntities() {
    const lane = Math.floor(Math.random() * 3);
    
    if (Math.random() < 0.2) {
      this.coins.push({
        lane: lane,
        y: -50,
        radius: 10,
        active: true
      });
    } else {
      const isHurdle = Math.random() < 0.5;
      this.obstacles.push({
        lane: lane,
        y: -50,
        width: 80,
        height: 20,
        isHurdle: isHurdle,
        color: isHurdle ? '#FBBF24' : '#EF4444'
      });
    }
  }

  // Visual game over effect before triggering GameShell game over
  gameOver() {
    this.createExplosion(this.lanes[this.player.lane], this.player.y, '#EF4444', 100);
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
    
    if (this.player.isJumping) {
      this.player.vz -= 1200 * dtSec;
      this.player.z += this.player.vz * dtSec;
      if (this.player.z <= 0) {
        this.player.z = 0;
        this.player.vz = 0;
        this.player.isJumping = false;
        this.createExplosion(this.lanes[this.player.lane], this.player.y, '#06B6D4', 10);
      }
    }

    this.scrollSpeed += 5 * dtSec * this.mods.speedMult;
    this.distance += this.scrollSpeed * dtSec;
    
    if (Math.floor(this.distance / 100) > this.score) {
      this.score = Math.floor(this.distance / 100);
      this.updateScore(this.score);
    }
    
    this.spawnTimer -= dtMs;
    if (this.spawnTimer <= 0) {
      this.spawnEntities();
      this.spawnInterval = Math.max(300, this.spawnInterval - 5);
      this.spawnTimer = this.spawnInterval;
    }
    
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      let obs = this.obstacles[i];
      obs.y += this.scrollSpeed * dtSec;
      
      if (obs.lane === this.player.lane) {
        if (Math.abs(obs.y - this.player.y) < this.player.radius + obs.height/2) {
          if (obs.isHurdle) {
            if (this.player.z < 20) {
              return this.gameOver();
            }
          } else {
            return this.gameOver();
          }
        }
      }
      
      if (obs.y > this.canvas.height + 100) this.obstacles.splice(i, 1);
    }

    for (let i = this.coins.length - 1; i >= 0; i--) {
      let c = this.coins[i];
      c.y += this.scrollSpeed * dtSec;
      
      if (c.active && c.lane === this.player.lane) {
        if (Math.abs(c.y - this.player.y) < this.player.radius + c.radius) {
          if (this.player.z < 30) {
            c.active = false;
            this.score += 50;
            this.updateScore(this.score);
            this.createExplosion(this.lanes[c.lane], c.y, '#FBBF24', 15);
            this.floatingTexts.push({ x: this.lanes[c.lane], y: c.y, text: '+50', color: '#FBBF24', life: 1.0, vy: -2 });
          }
        }
      }
      
      if (c.y > this.canvas.height + 100) this.coins.splice(i, 1);
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

    this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.lanes[0] - this.laneWidth/2, 0); this.ctx.lineTo(this.lanes[0] - this.laneWidth/2, this.canvas.height);
    this.ctx.moveTo(this.lanes[1] - this.laneWidth/2, 0); this.ctx.lineTo(this.lanes[1] - this.laneWidth/2, this.canvas.height);
    this.ctx.moveTo(this.lanes[2] - this.laneWidth/2, 0); this.ctx.lineTo(this.lanes[2] - this.laneWidth/2, this.canvas.height);
    this.ctx.moveTo(this.lanes[2] + this.laneWidth/2, 0); this.ctx.lineTo(this.lanes[2] + this.laneWidth/2, this.canvas.height);
    this.ctx.stroke();

    this.ctx.fillStyle = 'rgba(255,255,255,0.05)';
    const offset = this.distance % 200;
    for(let y = -200; y < this.canvas.height; y += 200) {
       this.ctx.fillRect(this.lanes[0] - this.laneWidth/2, y + offset, this.laneWidth*3, 10);
    }

    this.coins.forEach(c => {
      if (!c.active) return;
      this.ctx.fillStyle = '#FBBF24';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = '#FBBF24';
      this.ctx.beginPath();
      this.ctx.arc(this.lanes[c.lane], c.y, c.radius, 0, Math.PI*2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    });

    this.obstacles.forEach(obs => {
      this.ctx.fillStyle = obs.color;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = obs.color;
      if (obs.isHurdle) {
        this.ctx.fillRect(this.lanes[obs.lane] - obs.width/2, obs.y - obs.height/2, obs.width, obs.height);
        this.ctx.fillStyle = '#09090B';
        this.ctx.fillRect(this.lanes[obs.lane] - obs.width/2 + 5, obs.y - obs.height/2 + 5, obs.width - 10, obs.height - 5);
      } else {
        this.ctx.fillRect(this.lanes[obs.lane] - obs.width/2, obs.y - obs.height/2, obs.width, obs.height);
      }
      this.ctx.shadowBlur = 0;
    });

    const pX = this.lanes[this.player.lane];
    const pY = this.player.y - this.player.z;
    
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.beginPath();
    this.ctx.ellipse(pX, this.player.y, this.player.radius, this.player.radius/2, 0, 0, Math.PI*2);
    this.ctx.fill();

    this.ctx.fillStyle = this.player.color;
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = this.player.color;
    this.ctx.beginPath();
    this.ctx.arc(pX, pY, this.player.radius, 0, Math.PI*2);
    this.ctx.fill();
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
      const gradient = this.ctx.createRadialGradient(pX, pY, 50, pX, pY, 250);
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
      this.ctx.fillText(`SPEED: ${Math.floor(this.scrollSpeed/10)} | USE ARROWS/WASD`, 20, 30);
    }
  }
}
