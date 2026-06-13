import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

class GravityFlip extends GameShell {
  constructor() {
    super('game-canvas', {
      name: 'gravity-flip',
      description: 'Avoid spikes. Flip gravity to survive.',
      width: 700,
      height: 400
    });

    this.scoreEl = document.getElementById('game-score');

    this.canvas.addEventListener('mousedown', () => {
      if (this.state === 'PLAYING') this.flipGravity();
    });

    this.init();
  }

  onStart() {
    this.player = {
      x: 100,
      y: 200,
      w: 30,
      h: 30,
      vy: 0,
      gravity: 2000,
      jumpForce: 0, // not used, we just reverse gravity
      dir: 1, // 1 = down, -1 = up
      angle: 0,
      isGrounded: false
    };

    this.baseSpeed = 300; // pixels per second scrolling
    this.speed = this.baseSpeed;
    this.distance = 0;
    
    this.spikes = [];
    this.particles = [];
    
    this.spawnTimer = 0;
    
    // Initial floor/ceiling
    this.groundH = 40;
    
    this.updateUI();
    
    let runs = Storage.get('gravity-flip_runs', 0);
    Storage.set('gravity-flip_runs', runs + 1);
  }

  onInput(key, event) {
    if (key === ' ' && this.state === 'PLAYING') {
      this.flipGravity();
    }
  }

  flipGravity() {
    this.player.dir *= -1;
    this.player.isGrounded = false;
    Sound.playBlip();
  }

  spawnSpike() {
    // 0 = bottom, 1 = top
    const side = Math.random() > 0.5 ? 1 : 0;
    const isCluster = Math.random() > 0.7; // spawn 2-3 together
    
    const num = isCluster ? Math.floor(Math.random() * 2) + 2 : 1;
    
    for (let i = 0; i < num; i++) {
      this.spikes.push({
        x: this.canvas.width + i * 40,
        y: side === 0 ? this.canvas.height - this.groundH : this.groundH,
        w: 30,
        h: 40,
        side: side // 0=points up, 1=points down
      });
    }
  }

  createDust() {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: this.player.x + this.player.w/2 + (Math.random()-0.5)*10,
        y: this.player.dir === 1 ? this.player.y + this.player.h : this.player.y,
        vx: -this.speed * 0.5 + (Math.random()-0.5)*50,
        vy: -this.player.dir * (Math.random() * 50),
        life: 200 + Math.random() * 200,
        maxLife: 400
      });
    }
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    
    // Distance & Speed
    this.distance += (this.speed * dt) / 10; // score metric
    this.score = Math.floor(this.distance);
    this.speed = this.baseSpeed + this.distance * 0.5; // slow ramp up
    
    // Physics
    if (!this.player.isGrounded) {
      this.player.vy += this.player.gravity * this.player.dir * dt;
      
      // Rotation while falling
      this.player.angle += this.player.dir * 5 * dt;
    } else {
      this.player.vy = 0;
      // Snap rotation
      this.player.angle = Math.round(this.player.angle / (Math.PI/2)) * (Math.PI/2);
    }
    
    // Terminal velocity
    if (this.player.vy > 1000) this.player.vy = 1000;
    if (this.player.vy < -1000) this.player.vy = -1000;
    
    this.player.y += this.player.vy * dt;
    
    // Ground collision
    this.player.isGrounded = false;
    
    if (this.player.y + this.player.h >= this.canvas.height - this.groundH) {
      this.player.y = this.canvas.height - this.groundH - this.player.h;
      this.player.vy = 0;
      if (this.player.dir === 1) {
        if (!this.player.wasGrounded) this.createDust();
        this.player.isGrounded = true;
      }
    } else if (this.player.y <= this.groundH) {
      this.player.y = this.groundH;
      this.player.vy = 0;
      if (this.player.dir === -1) {
        if (!this.player.wasGrounded) this.createDust();
        this.player.isGrounded = true;
      }
    }
    
    this.player.wasGrounded = this.player.isGrounded;

    // Spikes
    this.spawnTimer -= deltaTime;
    // Spawn rate depends on speed
    if (this.spawnTimer <= 0) {
      this.spawnSpike();
      this.spawnTimer = 1000 + Math.random() * 1500 - (this.speed * 0.5); // ranges ~800 to 2000
      if (this.spawnTimer < 500) this.spawnTimer = 500;
    }
    
    // Update spikes
    for (let i = this.spikes.length - 1; i >= 0; i--) {
      let s = this.spikes[i];
      s.x -= this.speed * dt;
      
      // Collision (triangle approx as rect)
      const shrink = 8; // generous hitbox
      if (this.player.x < s.x + s.w - shrink &&
          this.player.x + this.player.w > s.x + shrink) {
          
        let hit = false;
        if (s.side === 0) {
          // bottom spike
          if (this.player.y + this.player.h > s.y + shrink) hit = true;
        } else {
          // top spike
          if (this.player.y < s.y + s.h - shrink) hit = true;
        }
        
        if (hit) {
          this.die();
          return;
        }
      }
      
      if (s.x < -50) this.spikes.splice(i, 1);
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= deltaTime;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    this.updateUI();
  }

  die() {
    Sound.playDamage();
    Sound.playGameOver();
    this.gameOver();
  }

  updateUI() {
    if (this.scoreEl) this.scoreEl.innerText = this.score;
  }

  draw() {
    this.ctx.fillStyle = '#1e1e2a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw floor / ceiling
    this.ctx.fillStyle = '#2a2a3a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.groundH);
    this.ctx.fillRect(0, this.canvas.height - this.groundH, this.canvas.width, this.groundH);
    
    // Draw scrolling grid lines on ground for speed illusion
    this.ctx.strokeStyle = '#555570';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    const offset = -(this.distance * 10) % 40;
    for (let x = offset; x < this.canvas.width; x += 40) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.groundH);
      this.ctx.moveTo(x, this.canvas.height - this.groundH);
      this.ctx.lineTo(x, this.canvas.height);
    }
    this.ctx.stroke();

    // Spikes
    this.ctx.fillStyle = '#ff6b6b';
    for (let s of this.spikes) {
      this.ctx.beginPath();
      if (s.side === 0) {
        // points up
        this.ctx.moveTo(s.x, s.y + s.h);
        this.ctx.lineTo(s.x + s.w/2, s.y);
        this.ctx.lineTo(s.x + s.w, s.y + s.h);
      } else {
        // points down
        this.ctx.moveTo(s.x, s.y);
        this.ctx.lineTo(s.x + s.w/2, s.y + s.h);
        this.ctx.lineTo(s.x + s.w, s.y);
      }
      this.ctx.fill();
    }

    // Particles
    this.ctx.fillStyle = '#f0f0f8';
    for (let p of this.particles) {
      this.ctx.globalAlpha = p.life / p.maxLife;
      this.ctx.fillRect(p.x, p.y, 4, 4);
    }
    this.ctx.globalAlpha = 1.0;

    // Player
    this.ctx.save();
    this.ctx.translate(this.player.x + this.player.w/2, this.player.y + this.player.h/2);
    this.ctx.rotate(this.player.angle);
    
    this.ctx.fillStyle = '#00d4aa';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#00d4aa';
    this.ctx.fillRect(-this.player.w/2, -this.player.h/2, this.player.w, this.player.h);
    
    // Little eye to show orientation
    this.ctx.fillStyle = '#05050a';
    this.ctx.shadowBlur = 0;
    this.ctx.fillRect(4, -8, 6, 6);
    this.ctx.fillRect(4, 2, 6, 6);
    
    this.ctx.restore();
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
  new GravityFlip();
});
