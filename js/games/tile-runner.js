import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

class TileRunner extends GameShell {
  constructor() {
    super('game-canvas', {
      name: 'tile-runner',
      description: 'Tap the black tiles when they reach the bottom zone. Don\\'t miss!',
      width: 400,
      height: 600
    });

    this.scoreEl = document.getElementById('game-score');
    this.livesEl = document.getElementById('game-lives');

    this.init();
  }

  onStart() {
    this.lives = 3;
    
    this.keys = ['d', 'f', 'j', 'k'];
    this.laneCount = 4;
    this.laneWidth = this.canvas.width / this.laneCount;
    this.tileHeight = 120;
    
    this.hitZoneY = this.canvas.height - 150;
    this.hitZoneH = 150;
    
    this.tiles = [];
    this.speed = 300; // pixels per sec
    
    this.spawnTimer = 0;
    this.baseSpawnRate = 600; // ms between spawns
    
    // Visual feedback for lanes
    this.laneFlashes = [0, 0, 0, 0];
    
    this.updateUI();
    
    let runs = Storage.get('tile-runner_runs', 0);
    Storage.set('tile-runner_runs', runs + 1);
  }

  onInput(key, event) {
    if (this.state !== 'PLAYING') return;

    const laneIndex = this.keys.indexOf(key);
    if (laneIndex !== -1) {
      this.tapLane(laneIndex);
    }
  }

  spawnTile() {
    const lane = Math.floor(Math.random() * this.laneCount);
    
    // Ensure we don't spawn overlapping too closely if speed varies
    this.tiles.push({
      lane: lane,
      y: -this.tileHeight,
      hit: false
    });
  }

  tapLane(lane) {
    this.laneFlashes[lane] = 1.0; // Flash lane

    // Find lowest tile in this lane that is within hit zone
    let hitTile = null;
    let hitIndex = -1;
    
    for (let i = 0; i < this.tiles.length; i++) {
      let t = this.tiles[i];
      if (t.lane === lane && !t.hit) {
        // Check if in hit zone (generous hitbox)
        const tileBottom = t.y + this.tileHeight;
        if (tileBottom >= this.hitZoneY && t.y <= this.canvas.height) {
          if (!hitTile || t.y > hitTile.y) {
            hitTile = t;
            hitIndex = i;
          }
        }
      }
    }

    if (hitTile) {
      // Hit!
      hitTile.hit = true; // Mark to trigger flash animation
      hitTile.flashTimer = 200;
      Sound.playCoin();
      this.score += 10;
      
      // Speed up slightly
      this.speed += 2;
      this.baseSpawnRate = Math.max(250, this.baseSpawnRate - 2);
      
      this.updateUI();
    } else {
      // Miss tap
      this.loseLife();
    }
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

  update(deltaTime) {
    const dt = deltaTime / 1000;

    // Spawn tiles
    this.spawnTimer -= deltaTime;
    if (this.spawnTimer <= 0) {
      this.spawnTile();
      this.spawnTimer = this.baseSpawnRate;
    }

    // Move tiles
    for (let i = this.tiles.length - 1; i >= 0; i--) {
      let t = this.tiles[i];
      
      if (t.hit) {
        t.flashTimer -= deltaTime;
        if (t.flashTimer <= 0) {
          this.tiles.splice(i, 1);
        }
      } else {
        t.y += this.speed * dt;

        // Check if missed (went past bottom completely)
        if (t.y > this.canvas.height) {
          this.tiles.splice(i, 1);
          this.loseLife();
        }
      }
    }

    // Lane flashes fade
    for (let i = 0; i < this.laneCount; i++) {
      if (this.laneFlashes[i] > 0) {
        this.laneFlashes[i] -= dt * 5;
        if (this.laneFlashes[i] < 0) this.laneFlashes[i] = 0;
      }
    }
  }

  updateUI() {
    if (this.scoreEl) this.scoreEl.innerText = this.score;
    if (this.livesEl) this.livesEl.innerText = '♥'.repeat(this.lives);
  }

  draw() {
    this.ctx.fillStyle = '#1e1e2a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Lanes
    for (let i = 0; i < this.laneCount; i++) {
      const x = i * this.laneWidth;
      
      // Lane lines
      this.ctx.strokeStyle = '#2a2a3a';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();

      // Lane flash
      if (this.laneFlashes[i] > 0) {
        this.ctx.fillStyle = \`rgba(108, 99, 255, \${this.laneFlashes[i] * 0.3})\`;
        this.ctx.fillRect(x, 0, this.laneWidth, this.canvas.height);
      }
      
      // Key label in hit zone
      this.ctx.fillStyle = '#555570';
      this.ctx.font = '20px "Press Start 2P"';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.keys[i].toUpperCase(), x + this.laneWidth/2, this.canvas.height - 40);
    }

    // Draw Hit Zone highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.fillRect(0, this.hitZoneY, this.canvas.width, this.hitZoneH);
    this.ctx.strokeStyle = '#6c63ff';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.hitZoneY);
    this.ctx.lineTo(this.canvas.width, this.hitZoneY);
    this.ctx.stroke();

    // Draw Tiles
    for (let t of this.tiles) {
      const x = t.lane * this.laneWidth;
      
      if (t.hit) {
        // Flash white
        this.ctx.fillStyle = \`rgba(255, 255, 255, \${t.flashTimer / 200})\`;
        this.ctx.fillRect(x + 2, t.y, this.laneWidth - 4, this.tileHeight);
      } else {
        // Normal black tile
        this.ctx.fillStyle = '#05050a';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#000';
        this.ctx.fillRect(x + 2, t.y, this.laneWidth - 4, this.tileHeight);
        this.ctx.shadowBlur = 0;
        
        // Inner highlight
        this.ctx.strokeStyle = '#2a2a3a';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x + 4, t.y + 2, this.laneWidth - 8, this.tileHeight - 4);
      }
    }
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
  new TileRunner();
});
