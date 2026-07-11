import { GameBase } from '../../engine/game-base.js';

export default class TestGame extends GameBase {
  constructor(engine, metadata) {
    super(engine, metadata);
    this.ball = { x: 400, y: 300, radius: 20, vx: 200, vy: 200, color: metadata.accentColor || '#ff00ff' };
    this.timeInLevel = 0;
  }

  getLevels() {
    return [
      {
        number: 1,
        name: 'Warmup',
        description: 'Bouncing around.',
        duration: 10,
        config: { speed: 1.0 }
      },
      {
        number: 2,
        name: 'Faster',
        description: 'Things speed up.',
        duration: 10,
        config: { speed: 1.5 }
      },
      {
        number: 3,
        name: 'Max Speed',
        description: 'Survive this and you win.',
        duration: 10,
        config: { speed: 2.0 }
      }
    ];
  }

  getControls() {
    return [
      { keys: ['up', 'down', 'left', 'right'], description: 'Change ball direction' },
      { keys: ['p'], description: 'Pause game' }
    ];
  }

  init(levelConfig) {
    this.ball.x = this.width / 2;
    this.ball.y = this.height / 2;
    const speedMult = levelConfig.speed || 1;
    this.ball.vx = 200 * speedMult;
    this.ball.vy = 200 * speedMult;
    this.timeInLevel = 0;
  }

  update(delta) {
    const dt = delta / 1000;
    this.timeInLevel += dt;
    this.gameTime += delta;

    // Add score every second roughly (approximate via dt)
    // Actually, just add delta to score for simplicity or do it smoothly
    this.score += delta * 0.01;

    // Handle input to change direction (override velocity sign)
    if (this.input.isHeld('up')) this.ball.vy = -Math.abs(this.ball.vy);
    if (this.input.isHeld('down')) this.ball.vy = Math.abs(this.ball.vy);
    if (this.input.isHeld('left')) this.ball.vx = -Math.abs(this.ball.vx);
    if (this.input.isHeld('right')) this.ball.vx = Math.abs(this.ball.vx);

    // Apply velocity
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    // Bounds checking
    if (this.ball.x - this.ball.radius < 0) {
      this.ball.x = this.ball.radius;
      this.ball.vx *= -1;
      this.screenShake(2, 50);
    }
    if (this.ball.x + this.ball.radius > this.width) {
      this.ball.x = this.width - this.ball.radius;
      this.ball.vx *= -1;
      this.screenShake(2, 50);
    }
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.y = this.ball.radius;
      this.ball.vy *= -1;
      this.screenShake(2, 50);
    }
    if (this.ball.y + this.ball.radius > this.height) {
      this.ball.y = this.height - this.ball.radius;
      this.ball.vy *= -1;
      this.screenShake(2, 50);
    }

    // Check level progression (10s duration)
    const currentLevelDuration = this.levelConfig.duration;
    if (currentLevelDuration && this.timeInLevel >= currentLevelDuration) {
      this.levelComplete();
    }
  }

  render(ctx) {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.ball.color;
    ctx.fill();
    ctx.closePath();
    
    // Draw simple HUD text internally for testing if no global HUD
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText(`Score: ${Math.floor(this.score)} | Level: ${this.level} | Time: ${this.timeInLevel.toFixed(1)}s`, 10, 30);
  }

  destroy() {
    super.destroy();
    this.ball = null;
  }
}
