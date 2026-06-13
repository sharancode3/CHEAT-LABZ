import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

class BeatDrop extends GameShell {
  constructor() {
    super('game-canvas', {
      name: 'beat-drop',
      description: 'Jump over the expanding rings. Move with mouse.',
      width: 600,
      height: 600
    });

    this.scoreEl = document.getElementById('game-score');
    this.livesEl = document.getElementById('game-lives');

    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.state === 'PLAYING') this.jump();
    });

    this.init();
  }

  onStart() {
    this.lives = 3;
    this.score = 0; // time survived
    
    this.player = {
      x: 300,
      y: 400,
      r: 12,
      z: 0, // height for jump
      vz: 0,
      isJumping: false
    };

    this.targetMouse = { x: 300, y: 400 };

    this.rings = [];
    this.spawnTimer = 0;
    this.baseSpawnRate = 1500;
    
    this.ringSpeed = 100;
    
    this.updateUI();
    
    let runs = Storage.get('beat-drop_runs', 0);
    Storage.set('beat-drop_runs', runs + 1);
  }

  handleMouseMove(e) {
    if (this.state !== 'PLAYING') return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    this.targetMouse.x = (e.clientX - rect.left) * scaleX;
    this.targetMouse.y = (e.clientY - rect.top) * scaleY;
  }

  onInput(key, event) {
    if (key === ' ' && this.state === 'PLAYING') {
      this.jump();
    }
  }

  jump() {
    if (!this.player.isJumping) {
      this.player.isJumping = true;
      this.player.vz = 350; // initial jump velocity
      Sound.playBlip();
    }
  }

  spawnRing() {
    this.rings.push({
      r: 5, // starts small at center
      thick: 4, // thickness of ring hitbox
      hit: false // whether it hit the player already
    });
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    
    this.score += deltaTime;
    
    // Difficulty ramp
    this.ringSpeed = 100 + (this.score / 1000) * 5;
    this.baseSpawnRate = Math.max(500, 1500 - (this.score / 1000) * 20);

    // Smooth mouse follow
    this.player.x += (this.targetMouse.x - this.player.x) * 10 * dt;
    this.player.y += (this.targetMouse.y - this.player.y) * 10 * dt;

    // Jump physics
    if (this.player.isJumping) {
      this.player.z += this.player.vz * dt;
      this.player.vz -= 1000 * dt; // gravity
      
      if (this.player.z <= 0) {
        this.player.z = 0;
        this.player.isJumping = false;
        // Optional landing dust
      }
    }

    // Rings
    this.spawnTimer -= deltaTime;
    if (this.spawnTimer <= 0) {
      this.spawnRing();
      this.spawnTimer = this.baseSpawnRate;
    }

    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    
    // Player distance from center
    const dx = this.player.x - cx;
    const dy = this.player.y - cy;
    const playerDist = Math.sqrt(dx*dx + dy*dy);

    for (let i = this.rings.length - 1; i >= 0; i--) {
      let ring = this.rings[i];
      ring.r += this.ringSpeed * dt;
      
      // Collision
      if (!ring.hit) {
        // If ring radius is overlapping player radius
        if (Math.abs(ring.r - playerDist) < (this.player.r + ring.thick)) {
          // If player is not high enough to clear it
          if (this.player.z < 15) {
            this.loseLife();
            ring.hit = true; // don't hit multiple times
          }
        }
      }

      if (ring.r > 600) {
        this.rings.splice(i, 1);
        if (!ring.hit && !this.player.isJumping) {
           // Maybe grant point? Score is time-based though.
        }
      }
    }

    this.updateUI();
  }

  loseLife() {
    Sound.playDamage();
    this.lives--;
    this.updateUI();
    
    this.canvas.classList.add('shake');
    setTimeout(() => this.canvas.classList.remove('shake'), 200);

    if (this.lives <= 0) {
      Sound.playGameOver();
      this.gameOver();
    }
  }

  updateUI() {
    if (this.scoreEl) this.scoreEl.innerText = Math.floor(this.score);
    if (this.livesEl) this.livesEl.innerText = '♥'.repeat(this.lives);
  }

  draw() {
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    // Center emitter
    this.ctx.fillStyle = '#1e1e2a';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 20, 0, Math.PI*2);
    this.ctx.fill();

    // Rings
    this.ctx.strokeStyle = '#00d4aa'; // Accent 2
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#00d4aa';
    this.ctx.lineWidth = 4;
    for (let ring of this.rings) {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, ring.r, 0, Math.PI*2);
      this.ctx.stroke();
    }
    this.ctx.shadowBlur = 0;

    // Player Shadow
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.r, 0, Math.PI*2);
    this.ctx.fill();

    // Player (simulate Z axis with scale and Y offset)
    // Z offset scales visual height up (moves up on screen slightly, scales up slightly)
    const zOffset = this.player.z * 0.5;
    const zScale = 1 + (this.player.z / 150);

    this.ctx.fillStyle = '#6c63ff'; // Accent 1
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y - zOffset, this.player.r * zScale, 0, Math.PI*2);
    this.ctx.fill();
    
    // Inner dot
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y - zOffset, (this.player.r * zScale) * 0.4, 0, Math.PI*2);
    this.ctx.fill();
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
  new BeatDrop();
});
