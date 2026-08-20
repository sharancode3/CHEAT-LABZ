import { GameBase } from '../../core/game-base.js';

export class MultiplayerTank extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.scoreP1 = 0;
    this.scoreP2 = 0;
    
    // Tank properties
    this.tankSpeed = 150;
    this.rotSpeed = Math.PI; // 180 degrees per sec
    this.bulletSpeed = 300;
    this.maxBounces = 4;
    
    // Arena boundaries (slightly padded from edges)
    this.arena = {
      x: 50, y: 150, w: 700, h: 600
    };
    
    // Internal walls (just a few simple rects for an arena)
    this.walls = [
      { x: 380, y: 300, w: 40, h: 300 }, // Center pillar
      { x: 200, y: 250, w: 150, h: 40 }, // Top Left Horizontal
      { x: 450, y: 600, w: 150, h: 40 }, // Bottom Right Horizontal
    ];
    
    this.p1 = this.createTank(100, 450, 0, '#38bdf8');
    this.p2 = this.createTank(700, 450, Math.PI, '#fb7185');
    
    this.bullets = [];
    
    this.roundState = 'PLAYING';
    this.roundDelay = 0;
    
    this.setupInput();
  }

  createTank(x, y, angle, color) {
    return {
      x, y, angle, color,
      r: 15,
      isDead: false,
      cooldown: 0
    };
  }

  setupInput() {
    this.input.onKeyDown = (e) => {
      if (this.isPaused || this.isOver || this.roundState !== 'PLAYING') return;
      
      if (e.key === ' ' && !this.p1.isDead && this.p1.cooldown <= 0) {
        this.fireBullet(this.p1);
      }
      
      if (e.key === 'Enter' && !this.p2.isDead && this.p2.cooldown <= 0) {
        this.fireBullet(this.p2);
      }
    };
  }

  fireBullet(tank) {
    tank.cooldown = 0.5; // Half second between shots
    
    // Spawn slightly ahead of barrel
    const barrelL = 25;
    const bx = tank.x + Math.cos(tank.angle) * barrelL;
    const by = tank.y + Math.sin(tank.angle) * barrelL;
    
    this.bullets.push({
      x: bx,
      y: by,
      vX: Math.cos(tank.angle) * this.bulletSpeed,
      vY: Math.sin(tank.angle) * this.bulletSpeed,
      bounces: 0,
      r: 4,
      ownerColor: tank.color
    });
    
    if (window.Sound) window.Sound.playTone(300, 'sawtooth', 0.1);
  }

  rectIntersectCircle(rx, ry, rw, rh, cx, cy, cr) {
    let testX = cx;
    let testY = cy;
    
    if (cx < rx) testX = rx;
    else if (cx > rx + rw) testX = rx + rw;
    
    if (cy < ry) testY = ry;
    else if (cy > ry + rh) testY = ry + rh;
    
    let distX = cx - testX;
    let distY = cy - testY;
    let distance = Math.sqrt((distX*distX) + (distY*distY));
    
    return distance <= cr;
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    
    if (this.roundState === 'ROUND_OVER') {
      this.roundDelay -= delta;
      if (this.roundDelay <= 0) {
        this.resetRound();
      }
      return;
    }
    
    // P1 Movement (WASD)
    if (!this.p1.isDead) {
      if (this.input.keys['a'] || this.input.keys['A']) this.p1.angle -= this.rotSpeed * delta;
      if (this.input.keys['d'] || this.input.keys['D']) this.p1.angle += this.rotSpeed * delta;
      
      let moveDir = 0;
      if (this.input.keys['w'] || this.input.keys['W']) moveDir = 1;
      if (this.input.keys['s'] || this.input.keys['S']) moveDir = -1;
      
      if (moveDir !== 0) {
        const nx = this.p1.x + Math.cos(this.p1.angle) * this.tankSpeed * moveDir * delta;
        const ny = this.p1.y + Math.sin(this.p1.angle) * this.tankSpeed * moveDir * delta;
        if (!this.checkWallCollision(nx, ny, this.p1.r)) {
          this.p1.x = nx;
          this.p1.y = ny;
        }
      }
      if (this.p1.cooldown > 0) this.p1.cooldown -= delta;
    }
    
    // P2 Movement (Arrows)
    if (!this.p2.isDead) {
      if (this.input.keys['ArrowLeft']) this.p2.angle -= this.rotSpeed * delta;
      if (this.input.keys['ArrowRight']) this.p2.angle += this.rotSpeed * delta;
      
      let moveDir = 0;
      if (this.input.keys['ArrowUp']) moveDir = 1;
      if (this.input.keys['ArrowDown']) moveDir = -1;
      
      if (moveDir !== 0) {
        const nx = this.p2.x + Math.cos(this.p2.angle) * this.tankSpeed * moveDir * delta;
        const ny = this.p2.y + Math.sin(this.p2.angle) * this.tankSpeed * moveDir * delta;
        if (!this.checkWallCollision(nx, ny, this.p2.r)) {
          this.p2.x = nx;
          this.p2.y = ny;
        }
      }
      if (this.p2.cooldown > 0) this.p2.cooldown -= delta;
    }
    
    // Bullet Update & Collision
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      let b = this.bullets[i];
      let nx = b.x + b.vX * delta;
      let ny = b.y + b.vY * delta;
      
      let bounced = false;
      
      // Arena bounds
      if (nx - b.r < this.arena.x || nx + b.r > this.arena.x + this.arena.w) {
        b.vX *= -1; nx = b.x; bounced = true;
      }
      if (ny - b.r < this.arena.y || ny + b.r > this.arena.y + this.arena.h) {
        b.vY *= -1; ny = b.y; bounced = true;
      }
      
      // Internal walls
      for (let w of this.walls) {
        if (this.rectIntersectCircle(w.x, w.y, w.w, w.h, nx, ny, b.r)) {
          // Simple AABB response: flip the velocity axis of deepest penetration
          // For simplicity in a small game, flip both if hitting a corner, otherwise just the approaching axis.
          // Since this is basic vector ricochet:
          let hitLeft = b.x < w.x;
          let hitRight = b.x > w.x + w.w;
          let hitTop = b.y < w.y;
          let hitBottom = b.y > w.y + w.h;
          
          if (hitLeft || hitRight) b.vX *= -1;
          if (hitTop || hitBottom) b.vY *= -1;
          
          nx = b.x; ny = b.y; // step back
          bounced = true;
        }
      }
      
      b.x = nx;
      b.y = ny;
      
      if (bounced) {
        b.bounces++;
        if (window.Sound) window.Sound.playTone(600, 'square', 0.05);
        if (b.bounces > this.maxBounces) {
          this.bullets.splice(i, 1);
          continue;
        }
      }
      
      // Hit Tanks?
      if (!this.p1.isDead && this.dist(b.x, b.y, this.p1.x, this.p1.y) < this.p1.r + b.r) {
        this.p1.isDead = true;
        this.bullets.splice(i, 1);
        if (window.Sound) window.Sound.playTone(100, 'sawtooth', 0.5); // Explosion
        this.checkRoundEnd();
        continue;
      }
      if (!this.p2.isDead && this.dist(b.x, b.y, this.p2.x, this.p2.y) < this.p2.r + b.r) {
        this.p2.isDead = true;
        this.bullets.splice(i, 1);
        if (window.Sound) window.Sound.playTone(100, 'sawtooth', 0.5);
        this.checkRoundEnd();
        continue;
      }
    }
  }

  dist(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  checkWallCollision(cx, cy, cr) {
    if (cx - cr < this.arena.x || cx + cr > this.arena.x + this.arena.w) return true;
    if (cy - cr < this.arena.y || cy + cr > this.arena.y + this.arena.h) return true;
    
    for (let w of this.walls) {
      if (this.rectIntersectCircle(w.x, w.y, w.w, w.h, cx, cy, cr)) return true;
    }
    return false;
  }

  checkRoundEnd() {
    if (this.roundState === 'ROUND_OVER') return;
    
    if (this.p1.isDead || this.p2.isDead) {
      this.roundState = 'ROUND_OVER';
      this.roundDelay = 2.0;
      
      if (this.p1.isDead && this.p2.isDead) {
        // Draw (no score)
      } else if (this.p1.isDead) {
        this.scoreP2++;
      } else if (this.p2.isDead) {
        this.scoreP1++;
      }
      
      if (this.scoreP1 >= 5 || this.scoreP2 >= 5) {
        this.isOver = true;
        setTimeout(() => this.levelComplete(), 3000);
      }
    }
  }

  resetRound() {
    this.p1 = this.createTank(100, 450, 0, '#38bdf8');
    this.p2 = this.createTank(700, 450, Math.PI, '#fb7185');
    this.bullets = [];
    this.roundState = 'PLAYING';
  }

  render(ctx) {
    this.clear();
    
    // Header
    ctx.fillStyle = '#fff';
    ctx.font = '30px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText("TANK BALLISTICS", this.W / 2, 50);
    
    ctx.font = '24px "JetBrains Mono"';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText(`P1: ${this.scoreP1}`, 50, 100);
    
    ctx.fillStyle = '#fb7185';
    ctx.textAlign = 'right';
    ctx.fillText(`P2: ${this.scoreP2}`, this.W - 50, 100);
    
    // Arena
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 10;
    ctx.strokeRect(this.arena.x, this.arena.y, this.arena.w, this.arena.h);
    
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(this.arena.x, this.arena.y, this.arena.w, this.arena.h);
    
    // Walls
    ctx.fillStyle = '#334155';
    for (let w of this.walls) {
      ctx.fillRect(w.x, w.y, w.w, w.h);
    }
    
    // Tanks
    const drawTank = (tank) => {
      if (tank.isDead) return;
      
      ctx.save();
      ctx.translate(tank.x, tank.y);
      ctx.rotate(tank.angle);
      
      // Body
      ctx.fillStyle = tank.color;
      ctx.fillRect(-15, -15, 30, 30);
      
      // Barrel
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, -4, 25, 8);
      
      ctx.restore();
    };
    
    drawTank(this.p1);
    drawTank(this.p2);
    
    // Bullets
    ctx.fillStyle = '#fff';
    for (let b of this.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      
      // Tracer line based on bounces (visual flair)
      ctx.fillStyle = b.ownerColor;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
    
    if (this.isOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#10b981';
      ctx.font = '50px "Press Start 2P"';
      ctx.textAlign = 'center';
      if (this.scoreP1 > this.scoreP2) {
        ctx.fillText("P1 WINS MATCH!", this.W / 2, this.H / 2);
      } else {
        ctx.fillText("P2 WINS MATCH!", this.W / 2, this.H / 2);
      }
    }
  }
}
