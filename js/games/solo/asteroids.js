import { GameBase } from '../../core/game-base.js';

export class Asteroids extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.ship = {
      x: this.W / 2,
      y: this.H / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2, // Facing up
      thrust: 300, // px/s^2
      drag: 0.985,
      r: 15,
      invulnerable: 2.0 // seconds of invulnerability on spawn
    };
    
    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    
    this.keys = { up: false, left: false, right: false, space: false };
    this.lastShot = 0;
    
    // Initial spawn
    for (let i = 0; i < 4; i++) {
      this.spawnAsteroid('LARGE');
    }
    
    this.setupInput();
  }

  setupInput() {
    this.input.onKeyDown = (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keys.up = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = true;
      if (e.code === 'Space') this.keys.space = true;
    };
    
    this.input.onKeyUp = (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keys.up = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = false;
      if (e.code === 'Space') this.keys.space = false;
    };
    
    this.input.onMouseDown = (e) => {
      this.keys.space = true;
    };
    this.input.onMouseUp = (e) => {
      this.keys.space = false;
    };
  }

  wrap(pos, max) {
    if (pos < 0) return pos + max;
    if (pos >= max) return pos - max;
    return pos;
  }

  spawnAsteroid(sizeStr, x, y, baseVx, baseVy) {
    let r, speed;
    let type;
    if (sizeStr === 'LARGE') { r = 40; speed = 40 + Math.random()*30; type = 'LARGE'; }
    else if (sizeStr === 'MEDIUM') { r = 20; speed = 80 + Math.random()*40; type = 'MEDIUM'; }
    else { r = 10; speed = 120 + Math.random()*50; type = 'SMALL'; }
    
    let ax = x !== undefined ? x : Math.random() * this.W;
    let ay = y !== undefined ? y : Math.random() * this.H;
    
    // Avoid spawning on top of ship if random
    if (x === undefined && y === undefined) {
      while (Math.hypot(ax - this.ship.x, ay - this.ship.y) < 150) {
        ax = Math.random() * this.W;
        ay = Math.random() * this.H;
      }
    }
    
    let angle;
    if (baseVx !== undefined && baseVy !== undefined) {
      // Diverge slightly from base trajectory
      angle = Math.atan2(baseVy, baseVx) + (Math.random() - 0.5) * Math.PI / 2;
    } else {
      angle = Math.random() * Math.PI * 2;
    }
    
    // Generate random polygon points
    const points = [];
    const numPoints = sizeStr === 'LARGE' ? 10 : (sizeStr === 'MEDIUM' ? 8 : 6);
    for (let i = 0; i < numPoints; i++) {
      const a = (i / numPoints) * Math.PI * 2;
      const dist = r * (0.7 + Math.random() * 0.3);
      points.push({ x: Math.cos(a) * dist, y: Math.sin(a) * dist });
    }
    
    this.asteroids.push({
      x: ax,
      y: ay,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: r,
      type: type,
      points: points,
      rot: 0,
      rotSpeed: (Math.random() - 0.5) * 2 // radians per sec
    });
  }

  shoot() {
    if (this.isPaused || this.isOver || this.ship.invulnerable > 0) return;
    
    const now = Date.now();
    if (now - this.lastShot < 200) return; // 200ms cooldown
    this.lastShot = now;
    
    // Tip of ship
    const tipX = this.ship.x + Math.cos(this.ship.angle) * this.ship.r;
    const tipY = this.ship.y + Math.sin(this.ship.angle) * this.ship.r;
    
    this.bullets.push({
      x: tipX,
      y: tipY,
      vx: Math.cos(this.ship.angle) * 800,
      vy: Math.sin(this.ship.angle) * 800,
      life: 1.2
    });
    
    if (window.Sound) window.Sound.playTone(600, 'square', 0.05);
  }

  explodeAsteroid(ast) {
    if (ast.type === 'LARGE') {
      this.score += 20;
      this.spawnAsteroid('MEDIUM', ast.x, ast.y, ast.vx, ast.vy);
      this.spawnAsteroid('MEDIUM', ast.x, ast.y, ast.vx, ast.vy);
      if (window.Sound) window.Sound.playTone(150, 'sawtooth', 0.1);
    } else if (ast.type === 'MEDIUM') {
      this.score += 50;
      this.spawnAsteroid('SMALL', ast.x, ast.y, ast.vx, ast.vy);
      this.spawnAsteroid('SMALL', ast.x, ast.y, ast.vx, ast.vy);
      if (window.Sound) window.Sound.playTone(200, 'sawtooth', 0.05);
    } else {
      this.score += 100;
      if (window.Sound) window.Sound.playTone(300, 'square', 0.05);
    }
    
    // Particles
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = Math.random() * 100;
      this.particles.push({
        x: ast.x,
        y: ast.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.5 + Math.random() * 0.5
      });
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    if (this.ship.invulnerable > 0) {
      this.ship.invulnerable -= delta;
    }

    // Ship Input
    if (this.keys.left) this.ship.angle -= 4.0 * delta;
    if (this.keys.right) this.ship.angle += 4.0 * delta;
    
    if (this.keys.up) {
      this.ship.vx += Math.cos(this.ship.angle) * this.ship.thrust * delta;
      this.ship.vy += Math.sin(this.ship.angle) * this.ship.thrust * delta;
      
      // Thrust particles
      if (Math.random() < 0.5) {
        const backX = this.ship.x - Math.cos(this.ship.angle) * this.ship.r;
        const backY = this.ship.y - Math.sin(this.ship.angle) * this.ship.r;
        this.particles.push({
          x: backX,
          y: backY,
          vx: -Math.cos(this.ship.angle) * 200 + (Math.random()-0.5)*50,
          vy: -Math.sin(this.ship.angle) * 200 + (Math.random()-0.5)*50,
          life: 0.3
        });
      }
    }
    
    if (this.keys.space) {
      this.shoot();
    }

    // Drag
    this.ship.vx *= Math.pow(this.ship.drag, delta * 60);
    this.ship.vy *= Math.pow(this.ship.drag, delta * 60);
    
    // Move Ship
    this.ship.x += this.ship.vx * delta;
    this.ship.y += this.ship.vy * delta;
    
    // Wrap Ship
    this.ship.x = this.wrap(this.ship.x, this.W);
    this.ship.y = this.wrap(this.ship.y, this.H);

    // Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      let b = this.bullets[i];
      b.x += b.vx * delta;
      b.y += b.vy * delta;
      b.x = this.wrap(b.x, this.W);
      b.y = this.wrap(b.y, this.H);
      
      b.life -= delta;
      if (b.life <= 0) {
        this.bullets.splice(i, 1);
      }
    }

    // Update Asteroids
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      let ast = this.asteroids[i];
      ast.x += ast.vx * delta;
      ast.y += ast.vy * delta;
      ast.x = this.wrap(ast.x, this.W);
      ast.y = this.wrap(ast.y, this.H);
      ast.rot += ast.rotSpeed * delta;
      
      // Bullet Collision
      let hit = false;
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        let b = this.bullets[j];
        if (Math.hypot(ast.x - b.x, ast.y - b.y) <= ast.r) {
          hit = true;
          this.bullets.splice(j, 1);
          break;
        }
      }
      
      if (hit) {
        this.explodeAsteroid(ast);
        this.asteroids.splice(i, 1);
        continue;
      }
      
      // Ship Collision
      if (this.ship.invulnerable <= 0) {
        if (Math.hypot(ast.x - this.ship.x, ast.y - this.ship.y) <= ast.r + this.ship.r * 0.7) {
          // Crash!
          this.lives -= 1;
          if (window.Sound) window.Sound.playTone(100, 'sawtooth', 0.5);
          
          if (this.lives > 0) {
            this.ship.x = this.W / 2;
            this.ship.y = this.H / 2;
            this.ship.vx = 0;
            this.ship.vy = 0;
            this.ship.invulnerable = 2.0;
          } else {
            this.isOver = true;
          }
        }
      }
    }
    
    // Level Complete check
    if (this.asteroids.length === 0 && !this.isOver) {
      this.levelComplete();
      for (let i = 0; i < 4 + this.level; i++) {
        this.spawnAsteroid('LARGE');
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.life -= delta;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx) {
    this.clear();
    
    // Particles
    for (let p of this.particles) {
      ctx.fillStyle = `rgba(239, 68, 68, ${p.life})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI*2);
      ctx.fill();
    }
    
    // Bullets
    ctx.fillStyle = '#fff';
    for (let b of this.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI*2);
      ctx.fill();
    }
    
    // Asteroids
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    for (let ast of this.asteroids) {
      ctx.save();
      ctx.translate(ast.x, ast.y);
      ctx.rotate(ast.rot);
      
      ctx.beginPath();
      ctx.moveTo(ast.points[0].x, ast.points[0].y);
      for (let i = 1; i < ast.points.length; i++) {
        ctx.lineTo(ast.points[i].x, ast.points[i].y);
      }
      ctx.closePath();
      
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.stroke();
      
      ctx.restore();
    }
    
    // Ship
    if (this.ship.invulnerable <= 0 || Math.floor(Date.now() / 100) % 2 === 0) {
      ctx.save();
      ctx.translate(this.ship.x, this.ship.y);
      ctx.rotate(this.ship.angle);
      
      ctx.strokeStyle = '#38bdf8';
      ctx.fillStyle = '#0f172a';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.moveTo(this.ship.r, 0); // Nose
      ctx.lineTo(-this.ship.r, this.ship.r * 0.8); // Bottom Right
      ctx.lineTo(-this.ship.r * 0.5, 0); // Engine indent
      ctx.lineTo(-this.ship.r, -this.ship.r * 0.8); // Bottom Left
      ctx.closePath();
      
      ctx.fill();
      
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Draw flame
      if (this.keys.up) {
        ctx.strokeStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(-this.ship.r * 0.5, 0);
        ctx.lineTo(-this.ship.r * 1.5, 0);
        ctx.stroke();
      }
      
      ctx.restore();
    }
  }
}

export default Asteroids;
