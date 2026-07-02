import { GameBase } from '../../core/game-base.js';

class SlideForge extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    this.gridSize = this.level >= 8 ? 5 : 4;
    this.cellSize = 480 / this.gridSize;

    this.grid = [];
    for (let c = 0; c < this.gridSize; c++) {
      this.grid[c] = [];
      for (let r = 0; r < this.gridSize; r++) {
        this.grid[c][r] = 0; // 0 = empty
      }
    }

    // Add locked/obstacle tiles for Level 5+
    if (this.level >= 5) {
      const obstacleCount = this.level >= 8 ? 3 : 1;
      for (let i = 0; i < obstacleCount; i++) {
        const c = this.randomInt(1, this.gridSize - 2);
        const r = this.randomInt(1, this.gridSize - 2);
        this.grid[c][r] = -1; // -1 = Locked obstacle
      }
    }

    this.score = 0;
    this.lives = 3;

    this.addRandomTile();
    this.addRandomTile();
  }

  addRandomTile() {
    const emptyCells = [];
    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize; r++) {
        if (this.grid[c][r] === 0) {
          emptyCells.push({ c, r });
        }
      }
    }

    if (emptyCells.length > 0) {
      const cell = this.randomChoice(emptyCells);
      this.grid[cell.c][cell.r] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    // Read input (WASD and Arrows)
    const inp = this.input;
    let moveDir = '';
    if (inp.wasPressedAny(inp.ACTIONS.UP)) moveDir = 'UP';
    if (inp.wasPressedAny(inp.ACTIONS.DOWN)) moveDir = 'DOWN';
    if (inp.wasPressedAny(inp.ACTIONS.LEFT)) moveDir = 'LEFT';
    if (inp.wasPressedAny(inp.ACTIONS.RIGHT)) moveDir = 'RIGHT';

    if (moveDir !== '') {
      const moved = this.slide(moveDir);
      if (moved) {
        this.addRandomTile();
        this.checkStatus();
      }
    }
  }

  slide(dir) {
    let moved = false;
    // Basic 2048 sliding logic simplified for grid state updates
    const cStep = (dir === 'LEFT') ? 1 : (dir === 'RIGHT' ? -1 : 0);
    const rStep = (dir === 'UP') ? 1 : (dir === 'DOWN' ? -1 : 0);

    const startC = (dir === 'RIGHT') ? this.gridSize - 1 : 0;
    const startR = (dir === 'DOWN') ? this.gridSize - 1 : 0;

    const endC = (dir === 'RIGHT') ? -1 : this.gridSize;
    const endR = (dir === 'DOWN') ? -1 : this.gridSize;

    const stepC = (dir === 'RIGHT') ? -1 : 1;
    const stepR = (dir === 'DOWN') ? -1 : 1;

    for (let c = startC; c !== endC; c += stepC) {
      for (let r = startR; r !== endR; r += stepR) {
        if (this.grid[c][r] <= 0) continue;

        let nextC = c;
        let nextR = r;

        // Trace forward path
        while (true) {
          const testC = nextC + (cStep || (dir === 'LEFT' ? -1 : 1));
          const testR = nextR + (rStep || (dir === 'UP' ? -1 : 1));

          if (dir === 'LEFT' && testC < 0) break;
          if (dir === 'RIGHT' && testC >= this.gridSize) break;
          if (dir === 'UP' && testR < 0) break;
          if (dir === 'DOWN' && testR >= this.gridSize) break;

          if (this.grid[testC][testR] === 0) {
            nextC = testC;
            nextR = testR;
          } else if (this.grid[testC][testR] === this.grid[c][r]) {
            // Merge
            this.grid[testC][testR] *= 2;
            this.grid[c][r] = 0;
            moved = true;
            this.score += this.grid[testC][testR];
            break;
          } else {
            break;
          }
        }

        if (nextC !== c || nextR !== r) {
          this.grid[nextC][nextR] = this.grid[c][r];
          this.grid[c][r] = 0;
          moved = true;
        }
      }
    }
    return moved;
  }

  checkStatus() {
    // Find Max Tile
    let max = 0;
    let hasMoves = false;

    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize; r++) {
        if (this.grid[c][r] > max) max = this.grid[c][r];
        if (this.grid[c][r] === 0) hasMoves = true;
      }
    }

    // Check Goal
    const goal = this.getLevelGoal();
    if (max >= goal.target) {
      this.levelComplete();
      return;
    }

    // Game Over check
    if (!hasMoves) {
      this.lives = 0; // Game Over
    }
  }

  render() {
    this.clearCanvas();
    const ctx = this.ctx;

    // Draw Board Outline
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 60, 480, 480);

    // Draw Grid Cell Backgrounds and Tiles
    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize; r++) {
        const x = 60 + c * this.cellSize + 4;
        const y = 60 + r * this.cellSize + 4;
        const w = this.cellSize - 8;
        const h = this.cellSize - 8;

        const val = this.grid[c][r];
        if (val === -1) {
          // Locked Obstacle
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = '#ffffff';
          ctx.font = '16px Press Start 2P';
          ctx.textAlign = 'center';
          ctx.fillText('X', x + w / 2, y + h / 2 + 6);
        } else if (val > 0) {
          ctx.fillStyle = `hsl(${(180 + Math.log2(val) * 20) % 360}, 65%, 50%)`;
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = '#ffffff';
          ctx.font = '18px JetBrains Mono';
          ctx.textAlign = 'center';
          ctx.fillText(val.toString(), x + w / 2, y + h / 2 + 6);
        } else {
          ctx.fillStyle = '#111118';
          ctx.fillRect(x, y, w, h);
        }
      }
    }
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    let max = 0;
    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize; r++) {
        if (this.grid[c][r] > max) max = this.grid[c][r];
      }
    }
    return [
      { label: 'Max Tile', value: `${max}/${this.getLevelGoal().target}` },
      { label: 'Level', value: this.level }
    ];
  }

  getLevelGoal() {
    const goals = [
      null,
      { type: 'tile', target: 256 },
      { type: 'tile', target: 512 },
      { type: 'tile', target: 512 },
      { type: 'tile', target: 1024 },
      { type: 'tile', target: 1024 },
      { type: 'tile', target: 2048 },
      { type: 'tile', target: 2048 },
      { type: 'tile', target: 2048 },
      { type: 'tile', target: 4096 },
      { type: 'tile', target: 4096 }
    ];
    return goals[this.level];
  }
}

window.GameClass = SlideForge;
