import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

export default class NeonSerpent extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas || 'game-canvas', { ...config, 
      name: 'neon-serpent',
      description: 'Eat the orbs. Grow longer. Don\\'t hit yourself or the walls.',
      width: 600,
      height: 600
    });

    this.gridSize = 20;
    this.cols = this.canvas.width / this.gridSize;
    this.rows = this.canvas.height / this.gridSize;

    // Game state
    this.snake = [];
    this.food = { x: 0, y: 0 };
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    
    this.foodsEaten = 0;
    this.fps = 8;
    this.baseFps = 8;
    this.maxFps = 20;
    
    this.frameTimer = 0;
    this.foodPulseTime = 0;
    
    this.lastFoodTime = 0;
    this.fastEatsCount = 0; // for combo
    
    // Death animation state
    this.deathTimer = 0;
    this.isDead = false;

    // UI Elements
    this.scoreEl = document.getElementById('game-score');
    this.comboEl = document.getElementById('game-combo');

    this.init(); // From GameShell
  }

  onStart() {
    this.snake = [
      { x: 10, y: 15 },
      { x: 9, y: 15 },
      { x: 8, y: 15 }
    ];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.foodsEaten = 0;
    this.fps = this.baseFps;
    this.frameTimer = 0;
    this.lastFoodTime = performance.now();
    this.fastEatsCount = 0;
    this.isDead = false;
    this.deathTimer = 0;
    
    // Update runs
    let runs = Storage.get('neon-serpent_runs', 0);
    Storage.set('neon-serpent_runs', runs + 1);

    this.spawnFood();
    this.updateScoreDisplay();
  }

  spawnFood() {
    let valid = false;
    while (!valid) {
      this.food.x = Math.floor(Math.random() * this.cols);
      this.food.y = Math.floor(Math.random() * this.rows);
      valid = true;
      for (let s of this.snake) {
        if (s.x === this.food.x && s.y === this.food.y) {
          valid = false;
          break;
        }
      }
    }
  }

  onInput(key, event) {
    if (this.isDead) return;

    if ((key === 'arrowup' || key === 'w') && this.dir.y !== 1) this.nextDir = { x: 0, y: -1 };
    else if ((key === 'arrowdown' || key === 's') && this.dir.y !== -1) this.nextDir = { x: 0, y: 1 };
    else if ((key === 'arrowleft' || key === 'a') && this.dir.x !== 1) this.nextDir = { x: -1, y: 0 };
    else if ((key === 'arrowright' || key === 'd') && this.dir.x !== -1) this.nextDir = { x: 1, y: 0 };
  }

  update(deltaTime) {
    if (this.isDead) {
      this.deathTimer += deltaTime;
      if (this.deathTimer >= 400) {
        this.gameOver();
      }
      return;
    }

    this.foodPulseTime += deltaTime;
    this.frameTimer += deltaTime;

    const frameInterval = 1000 / this.fps;
    if (this.frameTimer >= frameInterval) {
      this.frameTimer -= frameInterval;
      this.tick();
    }
  }

  tick() {
    this.dir = this.nextDir;

    const head = this.snake[0];
    const newHead = { x: head.x + this.dir.x, y: head.y + this.dir.y };

    // Wall collision
    if (newHead.x < 0 || newHead.x >= this.cols || newHead.y < 0 || newHead.y >= this.rows) {
      this.die();
      return;
    }

    // Self collision
    for (let i = 0; i < this.snake.length; i++) {
      if (this.snake[i].x === newHead.x && this.snake[i].y === newHead.y) {
        this.die();
        return;
      }
    }

    this.snake.unshift(newHead);

    // Food collision
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.eatFood();
    } else {
      this.snake.pop(); // Remove tail
    }
  }

  eatFood() {
    Sound.playBlip();
    this.foodsEaten++;
    
    // Speed increase
    if (this.foodsEaten % 5 === 0 && this.fps < this.maxFps) {
      this.fps += 1;
    }

    const now = performance.now();
    const timeSinceLast = now - this.lastFoodTime;
    this.lastFoodTime = now;

    // Scoring
    let points = 10;
    
    // Time bonus
    if (timeSinceLast < 2000) points += 5;
    else if (timeSinceLast < 4000) points += 2;

    // Combo system
    if (timeSinceLast < 3000) {
      this.fastEatsCount++;
    } else {
      this.fastEatsCount = 0;
    }

    if (this.fastEatsCount >= 3) {
      points *= 2;
      this.showCombo();
    } else {
      this.comboEl.style.display = 'none';
    }

    this.score += points;
    this.updateScoreDisplay();
    this.spawnFood();
  }

  showCombo() {
    this.comboEl.style.display = 'inline';
    // Small animation class add/remove could go here
  }

  die() {
    Sound.playDamage();
    this.isDead = true;
    this.deathTimer = 0;
  }

  updateScoreDisplay() {
    if (this.scoreEl) this.scoreEl.innerText = this.score;
  }

  draw() {
    // Clear background
    this.ctx.fillStyle = '#0a0a0f'; // var(--bg-primary)
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid dots
    this.ctx.fillStyle = '#2a2a3a';
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        this.ctx.fillRect(x * this.gridSize + this.gridSize/2, y * this.gridSize + this.gridSize/2, 2, 2);
      }
    }

    // Draw Food (Pulsing)
    const pulseScale = 1.0 + 0.2 * Math.sin(this.foodPulseTime / 800 * Math.PI * 2);
    const radius = (this.gridSize / 2 - 2) * pulseScale;
    const fx = this.food.x * this.gridSize + this.gridSize / 2;
    const fy = this.food.y * this.gridSize + this.gridSize / 2;
    
    this.ctx.beginPath();
    this.ctx.arc(fx, fy, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = '#00d4aa'; // var(--accent-2)
    this.ctx.fill();

    // Draw Snake
    let alpha = 1.0;
    if (this.isDead) {
      // Flash red then dissolve
      const progress = this.deathTimer / 400; // 0 to 1
      alpha = 1 - progress;
      this.ctx.fillStyle = \`rgba(255, 107, 107, \${alpha})\`; // var(--accent-3)
    } else {
      this.ctx.fillStyle = '#f0f0f8'; // var(--text-primary)
    }

    for (let i = 0; i < this.snake.length; i++) {
      const seg = this.snake[i];
      const px = seg.x * this.gridSize + 1;
      const py = seg.y * this.gridSize + 1;
      const size = this.gridSize - 2;

      // Head is slightly brighter when alive
      if (!this.isDead && i === 0) {
        this.ctx.fillStyle = '#ffffff';
      } else if (!this.isDead) {
        this.ctx.fillStyle = '#b0b0c8';
      }

      // Rounded rect using arcTo (simple version for canvas)
      this.ctx.beginPath();
      this.ctx.roundRect(px, py, size, size, 4);
      this.ctx.fill();
    }
  }
}

// Ensure the page knows about GameState since it uses global keys
window.GameState = GameState;

// Start game instance on load
document.addEventListener('DOMContentLoaded', () => {
});
