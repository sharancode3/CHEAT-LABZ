import { GameBase } from '../../core/game-base.js';

class StackBlitz extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    this.blockH = 30;
    this.blocks = [];
    
    // Starting platform width based on level (narrower at high levels)
    this.initialWidth = Math.max(80, 200 - this.level * 10);
    this.blocks.push({ x: 300 - this.initialWidth / 2, y: 550, w: this.initialWidth, h: this.blockH });

    this.activeBlock = null;
    this.time = 0;
    this.score = 0;
    this.lives = 3;
    this.stackCount = 0;

    this.wind = 0; // Wind drift force (Level 10)
    if (this.level === 10) {
      this.wind = this.randomChoice([-50, 50]);
    }

    this.spawnNextBlock();
  }

  spawnNextBlock() {
    const last = this.blocks[this.blocks.length - 1];
    this.activeBlock = {
      x: 0,
      y: last.y - this.blockH,
      w: last.w,
      h: this.blockH
    };
    this.time = 0;
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    const dt = delta / 1000;
    this.time += dt;

    if (this.activeBlock) {
      const sweepRange = 600 - this.activeBlock.w;
      
      // Speed scales up slightly with stack size
      const currentSpeed = 2.0 + this.level * 0.2 + (this.blocks.length * 0.05);

      // Level 10: Sine wave vertical/horizontal drift + Wind
      if (this.level >= 8) {
        this.activeBlock.x = 300 - this.activeBlock.w / 2 + Math.sin(this.time * currentSpeed) * (sweepRange / 2);
        this.activeBlock.x += this.wind * dt;
      } else {
        // Linear sweep
        this.activeBlock.x = 300 - this.activeBlock.w / 2 + Math.sin(this.time * currentSpeed) * (sweepRange / 2);
      }

      // Read Input to Drop
      const inp = this.input;
      if (inp.wasPressedAny(inp.ACTIONS.ACTION) || inp.wasPressedAny(inp.ACTIONS.CONFIRM) || inp.wasMouseClicked()) {
        this.dropBlock();
      }
    }
  }

  dropBlock() {
    const prev = this.blocks[this.blocks.length - 1];
    const curr = this.activeBlock;

    const diff = curr.x - prev.x;
    const absDiff = Math.abs(diff);

    if (absDiff >= prev.w) {
      // Complete miss
      this.lives--;
      if (this.lives > 0) {
        this.spawnNextBlock();
      }
      return;
    }

    // Cut block
    let newX = curr.x;
    let newW = curr.w - absDiff;

    if (diff > 0) {
      newX = curr.x;
    } else {
      newX = prev.x;
    }

    this.blocks.push({
      x: newX,
      y: curr.y,
      w: newW,
      h: this.blockH
    });

    this.stackCount++;
    this.score += Math.max(1, 10 - Math.floor(absDiff));

    // Shift stack down if too high
    if (this.blocks.length > 8) {
      this.blocks.forEach(b => {
        b.y += this.blockH;
      });
    }

    // Wind direction change for Level 10
    if (this.level === 10) {
      this.wind = this.randomChoice([-80, 80]);
    }

    // Check Goal
    const goal = this.getLevelGoal();
    if (this.stackCount >= goal.target) {
      this.levelComplete();
    } else {
      this.spawnNextBlock();
    }
  }

  render() {
    this.clearCanvas();
    const ctx = this.ctx;

    // Draw Wind Indicator (Level 10)
    if (this.level === 10) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(0, 0, 600, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px DM Sans';
      ctx.textAlign = 'center';
      ctx.fillText(`WIND: ${this.wind > 0 ? '→' : '←'}`, 300, 20);
    }

    // Draw Stacked Blocks
    this.blocks.forEach((b, index) => {
      ctx.fillStyle = `hsl(${(180 + index * 15) % 360}, 70%, 55%)`;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    });

    // Draw active swinging block
    if (this.activeBlock) {
      ctx.fillStyle = `hsl(${(180 + this.blocks.length * 15) % 360}, 70%, 55%)`;
      ctx.fillRect(this.activeBlock.x, this.activeBlock.y, this.activeBlock.w, this.activeBlock.h);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(this.activeBlock.x, this.activeBlock.y, this.activeBlock.w, this.activeBlock.h);
    }
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    return [
      { label: 'Stack Size', value: `${this.stackCount}/${this.getLevelGoal().target}` },
      { label: 'Level', value: this.level }
    ];
  }

  getLevelGoal() {
    const goals = [
      null,
      { type: 'stack', target: 8 },
      { type: 'stack', target: 10 },
      { type: 'stack', target: 12 },
      { type: 'stack', target: 14 },
      { type: 'stack', target: 16 },
      { type: 'stack', target: 18 },
      { type: 'stack', target: 20 },
      { type: 'stack', target: 22 },
      { type: 'stack', target: 24 },
      { type: 'stack', target: 25 }
    ];
    return goals[this.level];
  }
}

window.GameClass = StackBlitz;
