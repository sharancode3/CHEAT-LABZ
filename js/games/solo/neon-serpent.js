import { GameBase } from '../../core/game-base.js';

export default class NeonSerpent extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.gridSize = 20; // 20x20
    this.cellSize = this.W / this.gridSize;
    
    // Snake body: Array of {x, y} in grid coordinates. Index 0 is head.
    this.snake = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 }
    ];
    
    this.velocity = { x: 0, y: -1 }; // Moving up
    this.inputBuffer = null;
    
    this.accumulator = 0;
    this.lives = 1; // Pure arcade mode
    this.score = 0;
    
    this.boostGauge = 0; 
    this.maxBoost = 100;
    this.isBoosting = false;
    
    this.food = this.spawnFood();

    // Sound setup (basic Web Audio context)
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {}
    
    // Interpolation state
    this.prevSnake = JSON.parse(JSON.stringify(this.snake));
  }

  playTone(freq, type, duration, vol) {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
    
    gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + duration);
  }

  get currentTickInterval() {
    if (this.isBoosting) return 0.030; // 30ms in seconds = 0.030s
    // Speed escalation curve: Interval(s) = max(0.045, 0.150 * e^(-0.015 * score/10))
    return Math.max(0.045, 0.150 * Math.exp(-0.015 * (this.score / 10)));
  }

  spawnFood() {
    let x, y;
    let valid = false;
    while (!valid) {
      x = this.rand(0, this.gridSize - 1);
      y = this.rand(0, this.gridSize - 1);
      valid = !this.snake.some(segment => segment.x === x && segment.y === y);
    }
    return { x, y };
  }

  handleInput() {
    if (this.input.wasPressed('ArrowUp') || this.input.wasPressed('w') || this.input.wasPressed('W')) {
      if (this.velocity.y !== 1) this.inputBuffer = { x: 0, y: -1 };
    } else if (this.input.wasPressed('ArrowDown') || this.input.wasPressed('s') || this.input.wasPressed('S')) {
      if (this.velocity.y !== -1) this.inputBuffer = { x: 0, y: 1 };
    } else if (this.input.wasPressed('ArrowLeft') || this.input.wasPressed('a') || this.input.wasPressed('A')) {
      if (this.velocity.x !== 1) this.inputBuffer = { x: -1, y: 0 };
    } else if (this.input.wasPressed('ArrowRight') || this.input.wasPressed('d') || this.input.wasPressed('D')) {
      if (this.velocity.x !== -1) this.inputBuffer = { x: 1, y: 0 };
    }
    
    if (this.input.wasPressed(' ') || this.input.wasPressed('Spacebar')) {
       if (this.boostGauge >= this.maxBoost && !this.isBoosting) {
           this.isBoosting = true;
           this.playTone(400, 'square', 0.5, 0.1);
       }
    }
    
    if (this.input.wasPressed('p') || this.input.wasPressed('P')) {
       this.isPaused = !this.isPaused;
    }
  }

  update(delta) {
    this.handleInput();
    
    const interval = this.currentTickInterval;
    this.accumulator += delta;

    // Fixed logical tick
    while (this.accumulator >= interval) {
      this.accumulator -= interval;
      this.prevSnake = JSON.parse(JSON.stringify(this.snake));
      
      if (this.inputBuffer) {
        this.velocity = this.inputBuffer;
        this.inputBuffer = null;
      }

      const head = this.snake[0];
      const newHead = {
        x: head.x + this.velocity.x,
        y: head.y + this.velocity.y
      };

      // Wall Collision -> wrap around or die? Spec says "Wall Collision = FATAL"
      if (newHead.x < 0 || newHead.x >= this.gridSize || newHead.y < 0 || newHead.y >= this.gridSize) {
        this.playTone(150, 'sawtooth', 0.5, 0.2);
        this.lives = 0; // Trigger game over
        return;
      }

      // Self Collision
      const isSelfCollision = this.snake.some((seg, idx) => {
         // ignore the very last tail segment if we aren't eating, because it will move forward
         if (idx === this.snake.length - 1 && !(newHead.x === this.food.x && newHead.y === this.food.y)) return false;
         return seg.x === newHead.x && seg.y === newHead.y;
      });
      
      if (isSelfCollision) {
        if (this.isBoosting) {
          // Dash through own tail - don't die
        } else {
          this.playTone(150, 'sawtooth', 0.5, 0.2);
          this.lives = 0;
          return;
        }
      }

      this.snake.unshift(newHead);

      // Food logic
      if (newHead.x === this.food.x && newHead.y === this.food.y) {
        this.score += 10;
        this.playTone(800, 'sine', 0.1, 0.1);
        
        if (!this.isBoosting) {
            this.boostGauge = Math.min(this.maxBoost, this.boostGauge + 10);
        }
        this.food = this.spawnFood();
      } else {
        this.snake.pop();
      }
      
      if (this.isBoosting) {
          this.boostGauge -= 5;
          if (this.boostGauge <= 0) {
              this.boostGauge = 0;
              this.isBoosting = false;
          }
      }
    }
  }

  render(ctx) {
    this.clear();
    const interval = this.currentTickInterval;
    const alpha = this.accumulator / interval;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.gridSize; i++) {
       ctx.beginPath();
       ctx.moveTo(i * this.cellSize, 0);
       ctx.lineTo(i * this.cellSize, this.H);
       ctx.stroke();
       
       ctx.beginPath();
       ctx.moveTo(0, i * this.cellSize);
       ctx.lineTo(this.W, i * this.cellSize);
       ctx.stroke();
    }

    // Draw Food
    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(
      this.food.x * this.cellSize + this.cellSize/2, 
      this.food.y * this.cellSize + this.cellSize/2, 
      this.cellSize/3, 0, Math.PI*2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Snake with interpolation
    ctx.shadowBlur = 10;

    for (let i = 0; i < this.snake.length; i++) {
      const curr = this.snake[i];
      let prev = this.prevSnake[i];
      
      // If we just grew, prev array might not have this index
      if (!prev) prev = curr;

      // Interpolate position
      const renderX = this.lerp(prev.x, curr.x, alpha) * this.cellSize;
      const renderY = this.lerp(prev.y, curr.y, alpha) * this.cellSize;

      if (i === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
      } else {
        ctx.fillStyle = this.isBoosting ? '#ffff00' : '#00f0ff';
        ctx.shadowColor = this.isBoosting ? '#ffff00' : '#00f0ff';
      }

      ctx.fillRect(renderX + 2, renderY + 2, this.cellSize - 4, this.cellSize - 4);
    }
    ctx.shadowBlur = 0;
    
    // Draw Boost Gauge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(20, this.H - 30, 200, 10);
    ctx.fillStyle = this.boostGauge >= this.maxBoost ? '#ffff00' : (this.isBoosting ? '#ffaa00' : '#00f0ff');
    ctx.fillRect(20, this.H - 30, (this.boostGauge / this.maxBoost) * 200, 10);
    
    if (this.boostGauge >= this.maxBoost) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px "JetBrains Mono"';
      ctx.fillText("BOOST READY (SPACE)", 230, this.H - 20);
    }
  }
}
