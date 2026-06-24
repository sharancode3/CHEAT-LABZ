import { GameShell } from './game-shell.js';

export default class NeonSerpent extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas, config);
    this.gridSize = 20;
    this.inputQueue = [];
    this.particles = [];
  }

  onStart() {
    this.cols = Math.floor(this.canvas.width / this.gridSize);
    this.rows = Math.floor(this.canvas.height / this.gridSize);
    
    this.snake = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}];
    this.dir = {x: 1, y: 0};
    this.inputQueue = [];
    
    this.food = this.spawnItem('food');
    this.powerup = null;
    this.powerupTimer = 0;
    
    this.combo = 1;
    this.chainTime = 0;
    
    this.activeEffects = {
      ghost: 0,
      magnet: 0,
      slow: 0
    };
    
    this.particles = [];
    this.accumulator = 0;
    this.tickInterval = 150;
    this.foodEaten = 0;
    
    this.mods = {
      speedMult: this.config.difficultyMultiplier || 1,
      reverse: this.config.modifiers?.includes('reverse'),
      noUI: this.config.modifiers?.includes('no_ui'),
      suddenDeath: this.config.modifiers?.includes('sudden_death'),
      limitedVision: this.config.modifiers?.includes('limited_vision')
    };

    this.updateScore(0);
  }

  spawnItem(type) {
    let x, y, valid = false;
    while (!valid) {
      x = Math.floor(Math.random() * (this.cols - 2)) + 1;
      y = Math.floor(Math.random() * (this.rows - 2)) + 1;
      valid = !this.snake.some(segment => segment.x === x && segment.y === y);
    }
    
    if (type === 'food') return { x, y };
    
    const types = ['ghost', 'magnet', 'slow'];
    return { x, y, type: types[Math.floor(Math.random() * types.length)] };
  }

  onInput(key, e) {
    let k = e.key;
    if (this.mods.reverse) {
      if (k === 'ArrowUp') k = 'ArrowDown';
      else if (k === 'ArrowDown') k = 'ArrowUp';
      else if (k === 'ArrowLeft') k = 'ArrowRight';
      else if (k === 'ArrowRight') k = 'ArrowLeft';
      else if (k === 'w') k = 's';
      else if (k === 's') k = 'w';
      else if (k === 'a') k = 'd';
      else if (k === 'd') k = 'a';
    }

    let nextDir = null;
    let lastDir = this.inputQueue.length > 0 ? this.inputQueue[this.inputQueue.length - 1] : this.dir;

    if ((k === 'ArrowUp' || k === 'w') && lastDir.y === 0) nextDir = {x: 0, y: -1};
    if ((k === 'ArrowDown' || k === 's') && lastDir.y === 0) nextDir = {x: 0, y: 1};
    if ((k === 'ArrowLeft' || k === 'a') && lastDir.x === 0) nextDir = {x: -1, y: 0};
    if ((k === 'ArrowRight' || k === 'd') && lastDir.x === 0) nextDir = {x: 1, y: 0};

    if (nextDir && this.inputQueue.length < 2) {
      this.inputQueue.push(nextDir);
    }
  }

  addScore(points) {
    this.score += points;
    this.updateScore(this.score);
  }

  createExplosion(x, y, color, count=20) {
    for(let i=0; i<count; i++) {
      this.particles.push({
        x: x + this.gridSize/2,
        y: y + this.gridSize/2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color: color
      });
    }
  }

  update(dt) {
    if (this.chainTime > 0) {
      this.chainTime -= dt;
      if (this.chainTime <= 0) this.combo = 1;
    }

    for (let effect in this.activeEffects) {
      if (this.activeEffects[effect] > 0) this.activeEffects[effect] -= dt;
    }

    this.powerupTimer += dt;
    if (this.powerupTimer > 10000 && !this.powerup) {
      if (Math.random() > 0.5) this.powerup = this.spawnItem('powerup');
      this.powerupTimer = 0;
    } else if (this.powerupTimer > 5000 && this.powerup) {
      this.powerup = null;
      this.powerupTimer = 0;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    let currentInterval = this.tickInterval / this.mods.speedMult;
    if (this.activeEffects.slow > 0) currentInterval *= 1.5;

    this.accumulator += dt;
    while (this.accumulator >= currentInterval) {
      this.accumulator -= currentInterval;
      this.tick();
    }
  }

  tick() {
    if (this.inputQueue.length > 0) {
      this.dir = this.inputQueue.shift();
    }

    let head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

    if (this.activeEffects.magnet > 0) {
      if (this.food.x > head.x) head.x++;
      else if (this.food.x < head.x) head.x--;
      else if (this.food.y > head.y) head.y++;
      else if (this.food.y < head.y) head.y--;
    }

    if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows) {
      if (this.activeEffects.ghost > 0 && !this.mods.suddenDeath) {
        if (head.x < 0) head.x = this.cols - 1;
        if (head.x >= this.cols) head.x = 0;
        if (head.y < 0) head.y = this.rows - 1;
        if (head.y >= this.rows) head.y = 0;
      } else {
        this.createExplosion(this.snake[0].x * this.gridSize, this.snake[0].y * this.gridSize, '#EF4444', 50);
        this.draw(); // Draw final explosion
        this.gameOver();
        return;
      }
    }

    if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      if (this.activeEffects.ghost <= 0) {
        this.createExplosion(this.snake[0].x * this.gridSize, this.snake[0].y * this.gridSize, '#EF4444', 50);
        this.draw();
        this.gameOver();
        return;
      }
    }

    this.snake.unshift(head);

    if (head.x === this.food.x && head.y === this.food.y) {
      this.foodEaten++;
      this.tickInterval = Math.max(50, 150 - (this.foodEaten * 5));
      this.addScore(10 * this.combo);
      this.combo++;
      this.chainTime = 3000;
      this.createExplosion(this.food.x * this.gridSize, this.food.y * this.gridSize, '#06B6D4');
      this.food = this.spawnItem('food');
    } else {
      this.snake.pop();
    }

    if (this.powerup && head.x === this.powerup.x && head.y === this.powerup.y) {
      this.activeEffects[this.powerup.type] = 5000;
      this.addScore(50);
      this.createExplosion(this.powerup.x * this.gridSize, this.powerup.y * this.gridSize, '#8B5CF6');
      this.powerup = null;
      this.powerupTimer = 0;
    }
  }

  draw() {
    this.ctx.fillStyle = '#09090B';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
    }
    for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
    }
    this.ctx.stroke();

    this.ctx.strokeStyle = this.activeEffects.ghost > 0 ? '#8B5CF6' : '#EF4444';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#06B6D4';
    this.ctx.shadowColor = '#06B6D4';
    this.ctx.shadowBlur = 10;
    this.ctx.fillRect(this.food.x * this.gridSize + 2, this.food.y * this.gridSize + 2, this.gridSize - 4, this.gridSize - 4);

    if (this.powerup) {
      this.ctx.fillStyle = '#8B5CF6';
      this.ctx.shadowColor = '#8B5CF6';
      this.ctx.shadowBlur = 15;
      this.ctx.beginPath();
      this.ctx.arc(this.powerup.x * this.gridSize + this.gridSize/2, this.powerup.y * this.gridSize + this.gridSize/2, this.gridSize/2 - 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.snake.forEach((seg, i) => {
      if (this.activeEffects.ghost > 0) {
        this.ctx.fillStyle = `rgba(139, 92, 246, ${1 - i/this.snake.length})`;
        this.ctx.shadowColor = '#8B5CF6';
      } else {
        this.ctx.fillStyle = i === 0 ? '#fff' : '#06B6D4';
        this.ctx.shadowColor = '#06B6D4';
      }
      this.ctx.shadowBlur = 10;
      this.ctx.fillRect(seg.x * this.gridSize + 1, seg.y * this.gridSize + 1, this.gridSize - 2, this.gridSize - 2);
    });

    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.shadowBlur = 0;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    if (this.mods.limitedVision) {
      const headX = this.snake[0].x * this.gridSize + this.gridSize/2;
      const headY = this.snake[0].y * this.gridSize + this.gridSize/2;
      
      this.ctx.globalCompositeOperation = 'destination-in';
      const gradient = this.ctx.createRadialGradient(headX, headY, 50, headX, headY, 150);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalCompositeOperation = 'source-over';
    }

    if (!this.mods.noUI) {
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#fff';
      this.ctx.font = "12px 'JetBrains Mono', monospace";
      if (this.combo > 1) {
        this.ctx.fillStyle = '#8B5CF6';
        this.ctx.fillText(`COMBO x${this.combo}`, 20, 30);
        this.ctx.fillRect(20, 40, (this.chainTime / 3000) * 100, 4);
      }
      
      let effectY = 60;
      for (let effect in this.activeEffects) {
        if (this.activeEffects[effect] > 0) {
          this.ctx.fillStyle = '#EF4444';
          this.ctx.fillText(`${effect.toUpperCase()} (${(this.activeEffects[effect]/1000).toFixed(1)}s)`, 20, effectY);
          effectY += 20;
        }
      }
    }
  }
}
