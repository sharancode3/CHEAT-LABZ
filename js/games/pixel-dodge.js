import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

export default class PixelDodge extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas || 'game-canvas', { ...config, 
      name: 'pixel-dodge',
      description: 'Bullet hell. Square follows mouse. Don\\'t touch the red dots.',
      width: 600,
      height: 600
    });

    this.scoreEl = document.getElementById('game-score');
    this.flashEl = document.getElementById('game-flash');

    this.playerSize = 12;
    this.player = { x: 300, y: 300 };

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.state === 'PLAYING') {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        this.player.x = (e.clientX - rect.left) * scaleX;
        this.player.y = (e.clientY - rect.top) * scaleY;
        
        // Constrain
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x > this.canvas.width) this.player.x = this.canvas.width;
        if (this.player.y < 0) this.player.y = 0;
        if (this.player.y > this.canvas.height) this.player.y = this.canvas.height;
      }
    });

    this.init();
  }

  onStart() {
    this.score = 0; // time in ms
    this.dots = [];
    
    this.timeSinceLastRamp = 0;
    this.difficultyLevel = 1;
    
    this.spawnTimer = 0;
    this.spawnRate = 2000; // time between patterns
    this.patternCount = 0;
    
    this.flashEl.classList.remove('active');
    
    this.updateUI();
    
    let runs = Storage.get('pixel-dodge_runs', 0);
    Storage.set('pixel-dodge_runs', runs + 1);
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    
    this.score += deltaTime;
    this.timeSinceLastRamp += deltaTime;
    
    // Difficulty ramp every 10s
    if (this.timeSinceLastRamp >= 10000) {
      this.timeSinceLastRamp -= 10000;
      this.difficultyLevel++;
      this.spawnRate = Math.max(800, 2000 - this.difficultyLevel * 150);
      Sound.playCoin(); // small cue for level up
    }

    // Spawn patterns
    this.spawnTimer -= deltaTime;
    if (this.spawnTimer <= 0) {
      this.spawnPattern();
      this.spawnTimer = this.spawnRate;
    }

    // Move dots and check collision
    for (let i = this.dots.length - 1; i >= 0; i--) {
      let d = this.dots[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      
      // Update trail
      d.trail.push({x: d.x, y: d.y});
      if (d.trail.length > 5) d.trail.shift();

      // Check collision (AABB vs Circle)
      // Hitbox 70% of visual size
      const hitSize = this.playerSize * 0.7;
      const px = this.player.x - hitSize/2;
      const py = this.player.y - hitSize/2;
      
      // closest point on rect to circle center
      const cx = Math.max(px, Math.min(d.x, px + hitSize));
      const cy = Math.max(py, Math.min(d.y, py + hitSize));
      
      const dx = d.x - cx;
      const dy = d.y - cy;
      
      if (dx*dx + dy*dy <= d.r * d.r) {
        this.die();
        return;
      }

      // Remove if far off screen
      if (d.x < -100 || d.x > this.canvas.width + 100 || 
          d.y < -100 || d.y > this.canvas.height + 100) {
        this.dots.splice(i, 1);
      }
    }

    this.updateUI();
  }

  spawnPattern() {
    this.patternCount++;
    const type = this.patternCount % 4;
    const speed = 100 + this.difficultyLevel * 20;
    const r = 4 + Math.random() * 2;

    if (type === 0) {
      // Wall from top
      for(let i=0; i<15; i++) {
        // gap in the middle somewhere
        if (i > 6 && i < 9) continue;
        this.dots.push({ x: i * (this.canvas.width/15), y: -10, vx: 0, vy: speed, r, trail: [] });
      }
    } else if (type === 1) {
      // Cross wave
      for(let i=0; i<5; i++) {
        this.dots.push({ x: -10, y: 100 + i*100, vx: speed*1.5, vy: 0, r, trail: [] });
        this.dots.push({ x: this.canvas.width+10, y: 150 + i*100, vx: -speed*1.5, vy: 0, r, trail: [] });
      }
    } else if (type === 2) {
      // Circle closing in
      for(let i=0; i<12; i++) {
        const angle = (i/12) * Math.PI*2;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        this.dots.push({ 
          x: this.canvas.width/2 + dx * 400, 
          y: this.canvas.height/2 + dy * 400, 
          vx: -dx * speed, 
          vy: -dy * speed, 
          r, trail: [] 
        });
      }
    } else {
      // Targeted burst
      for(let i=0; i<8; i++) {
        const angle = Math.atan2(this.player.y - (-10), this.player.x - (this.canvas.width/2)) + (Math.random()-0.5)*0.5;
        this.dots.push({ 
          x: this.canvas.width/2 + (Math.random()-0.5)*50, 
          y: -10, 
          vx: Math.cos(angle) * speed * 2, 
          vy: Math.sin(angle) * speed * 2, 
          r, trail: [] 
        });
      }
    }
  }

  die() {
    Sound.playDamage();
    Sound.playGameOver();
    this.flashEl.classList.add('active');
    this.gameOver();
  }

  updateUI() {
    if (this.scoreEl) {
      this.scoreEl.innerText = Math.floor(this.score);
    }
  }

  draw() {
    // Slight fade clear for basic motion blur effect
    this.ctx.fillStyle = 'rgba(10, 10, 15, 0.4)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Player
    this.ctx.fillStyle = '#6c63ff'; // Accent 1
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#6c63ff';
    this.ctx.fillRect(this.player.x - this.playerSize/2, this.player.y - this.playerSize/2, this.playerSize, this.playerSize);
    this.ctx.shadowBlur = 0;

    // Dots
    for (let d of this.dots) {
      // Trail
      for (let i = 0; i < d.trail.length; i++) {
        const pt = d.trail[i];
        this.ctx.fillStyle = `rgba(255, 107, 107, ${i / d.trail.length * 0.5})`;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, d.r, 0, Math.PI*2);
        this.ctx.fill();
      }

      // Head
      this.ctx.fillStyle = '#ff6b6b'; // Accent 3
      this.ctx.beginPath();
      this.ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
      this.ctx.fill();
    }
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
});
