import { GameBase } from '../../core/game-base.js';

export class CatchObjects extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.items = [];
    this.spawnTimer = 0;
    this.gravity = 400; // px/s^2
    this.globalTime = 0;
    
    // Basket
    this.basket = {
      w: 120,
      h: 20,
      x: this.W / 2,
      y: this.H - 40,
      vx: 0,
      speed: 600
    };
    
    // Input state
    this.keys = { left: false, right: false };
    
    this.setupInput();
  }

  setupInput() {
    this.input.onKeyDown = (e) => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = true;
    };
    
    this.input.onKeyUp = (e) => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = false;
    };
    
    // Mouse fallback for mobile/touch
    this.input.onMouseMove = (e) => {
      if (!this.isPaused && !this.isOver) {
        // Move basket towards mouse x
        this.basket.x = e.x;
      }
    };
  }

  spawnItem() {
    const isHazard = Math.random() < 0.2; // 20% chance for a hazard
    const r = 20;
    const x = r + Math.random() * (this.W - r * 2);
    
    // Some random initial downward velocity to mix things up
    const v0 = 50 + Math.random() * 100;
    
    this.items.push({
      x: x,
      y: -r, // start above screen
      r: r,
      vy: v0,
      type: isHazard ? 'HAZARD' : 'FRUIT',
      points: isHazard ? 0 : (10 + Math.floor(Math.random() * 10)),
      color: isHazard ? '#ef4444' : '#10b981', // Red vs Green
      caught: false
    });
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    
    this.globalTime += delta;
    
    // Update basket position via keys
    if (this.keys.left) this.basket.x -= this.basket.speed * delta;
    if (this.keys.right) this.basket.x += this.basket.speed * delta;
    
    // Clamp basket
    if (this.basket.x - this.basket.w / 2 < 0) this.basket.x = this.basket.w / 2;
    if (this.basket.x + this.basket.w / 2 > this.W) this.basket.x = this.W - this.basket.w / 2;

    // Spawning logic
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      this.spawnItem();
      // Rate scales with time
      const rate = Math.max(0.4, 1.5 - (this.globalTime / 40.0));
      this.spawnTimer = rate;
    }
    
    // Update items
    for (let i = this.items.length - 1; i >= 0; i--) {
      let item = this.items[i];
      
      // Physics: y(t+dt) = y(t) + vy * dt
      // vy = v0 + g * t -> we just do Euler integration
      item.vy += this.gravity * delta;
      item.y += item.vy * delta;
      
      // AABB Collision with Basket
      // Basket AABB:
      const bL = this.basket.x - this.basket.w / 2;
      const bR = this.basket.x + this.basket.w / 2;
      const bT = this.basket.y;
      const bB = this.basket.y + this.basket.h;
      
      // Item AABB:
      const iL = item.x - item.r;
      const iR = item.x + item.r;
      const iT = item.y - item.r;
      const iB = item.y + item.r;
      
      if (iR >= bL && iL <= bR && iB >= bT && iT <= bB) {
        // Caught!
        if (item.type === 'HAZARD') {
          this.lives -= 1;
          if (window.Sound) window.Sound.playTone(100, 'sawtooth', 0.5);
          // Shake effect could be implemented via a flag
          if (this.lives <= 0) {
            this.isOver = true;
          }
        } else {
          this.score += item.points;
          if (window.Sound) window.Sound.playTone(600 + Math.random()*200, 'sine', 0.05);
        }
        
        this.items.splice(i, 1);
        continue;
      }
      
      // Missed (hit floor)
      if (item.y - item.r > this.H) {
        if (item.type === 'FRUIT') {
          // Missing a fruit loses a life
          this.lives -= 1;
          if (window.Sound) window.Sound.playTone(150, 'square', 0.1);
          if (this.lives <= 0) {
            this.isOver = true;
          }
        }
        this.items.splice(i, 1);
      }
    }
  }

  render(ctx) {
    this.clear();
    
    // Draw Basket
    ctx.fillStyle = '#3b82f6';
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 15;
    ctx.fillRect(this.basket.x - this.basket.w / 2, this.basket.y, this.basket.w, this.basket.h);
    ctx.shadowBlur = 0;
    
    // Draw Items
    for (let item of this.items) {
      ctx.fillStyle = item.color;
      ctx.shadowColor = item.color;
      ctx.shadowBlur = 10;
      
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Inner detail
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(item.x - item.r * 0.3, item.y - item.r * 0.3, item.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      
      if (item.type === 'HAZARD') {
        ctx.fillStyle = '#111';
        ctx.font = 'bold 20px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("X", item.x, item.y);
      }
    }
  }
}
