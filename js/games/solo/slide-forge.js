import { GameBase } from '../../core/game-base.js';

class SlideForge extends GameBase {
  static logicalWidth = 480;
  static logicalHeight = 480;

  init() {
    this.score = 0;
    this.lives = 1;
    this.isOver = false;

    const lvl = this.level;
    this.gridSize = lvl >= 7 ? 5 : 4;
    this.cellSize = (480 - (this.gridSize + 1) * 6) / this.gridSize;

    // Board representation: values only. -1 = Blocked
    this.board = Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(0));

    // Special block structures
    if (lvl === 5) {
      this.board[1][1] = -1;
    } else if (lvl === 6) {
      this.board[1][1] = -1;
      this.board[2][2] = -1;
    } else if (lvl === 9) {
      // Locked row (row 2 is permanently blocked)
      for (let c = 0; c < this.gridSize; c++) {
        this.board[2][c] = -1;
      }
    }

    // Level Target Goals: L1:256, L2:512, L3:1024, L4-L7:2048, L8-L9:4096, L10:8192
    const targets = [0, 256, 512, 1024, 2048, 2048, 2048, 2048, 4096, 4096, 8192];
    this.targetValue = targets[lvl] || 8192;

    // Display rendering tiles list to manage animations smoothly
    this.tilesList = []; // { id, val, curX, curY, tarX, tarY, timer, scale, scaleTimer }
    this.tileIdCounter = 0;

    this.isAnimating = false;

    this.spawnTileAtRandom();
    this.spawnTileAtRandom();
    this.syncTilesListFromBoard();
  }

  spawnTileAtRandom() {
    const empty = [];
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.board[r][c] === 0) {
          empty.push({ r, c });
        }
      }
    }

    if (empty.length > 0) {
      const cell = this.randomChoice(empty);
      this.board[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  syncTilesListFromBoard() {
    // Re-create the visual list matching board values (skipping blocked -1)
    this.tilesList = [];
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const val = this.board[r][c];
        if (val > 0) {
          const pos = this.getGridCoords(r, c);
          this.tilesList.push({
            id: this.tileIdCounter++,
            val,
            curX: pos.x,
            curY: pos.y,
            tarX: pos.x,
            tarY: pos.y,
            timer: 0,
            scale: 1.0,
            scaleTimer: 0
          });
        }
      }
    }
  }

  getGridCoords(r, c) {
    const gap = 6;
    const x = gap + c * (this.cellSize + gap);
    const y = gap + r * (this.cellSize + gap);
    return { x, y };
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    // Update animations
    let animCount = 0;
    this.tilesList.forEach(t => {
      // Lerp transition
      if (t.timer > 0) {
        animCount++;
        t.timer = Math.max(0, t.timer - delta);
        const progress = 1.0 - t.timer / 80; // 80ms lerp
        t.curX = t.curX + (t.tarX - t.curX) * progress;
        t.curY = t.curY + (t.tarY - t.curY) * progress;
      } else {
        t.curX = t.tarX;
        t.curY = t.tarY;
      }

      // Merge bounce scale
      if (t.scaleTimer > 0) {
        animCount++;
        t.scaleTimer = Math.max(0, t.scaleTimer - delta);
        const progress = t.scaleTimer / 100; // 100ms bounce
        t.scale = 1.0 + Math.sin(progress * Math.PI) * 0.2;
      }
    });

    this.isAnimating = (animCount > 0);
    if (this.isAnimating) return; // ignore input key presses during slide animation

    // Verify slide inputs
    const inp = this.input;
    let dir = null;
    if (inp.wasPressed('ArrowLeft') || inp.wasPressed('a')) dir = 'LEFT';
    if (inp.wasPressed('ArrowRight') || inp.wasPressed('d')) dir = 'RIGHT';
    if (inp.wasPressed('ArrowUp') || inp.wasPressed('w')) dir = 'UP';
    if (inp.wasPressed('ArrowDown') || inp.wasPressed('s')) dir = 'DOWN';

    if (dir) {
      this.processSlide(dir);
    }
  }

  processSlide(dir) {
    let moved = false;
    let scoreGained = 0;

    // Temporary list tracking merge coordinates to avoid double merge in one move
    const mergedCells = new Set();

    // Directions steps
    const isHorizontal = (dir === 'LEFT' || dir === 'RIGHT');
    const step = (dir === 'UP' || dir === 'LEFT') ? 1 : -1;

    const start = step === 1 ? 0 : this.gridSize - 1;
    const end = step === 1 ? this.gridSize : -1;

    // Clean start coordinates list for visual lerping
    const prevPositions = [];
    this.tilesList.forEach(t => {
      prevPositions.push({ val: t.val, curX: t.curX, curY: t.curY });
    });

    if (isHorizontal) {
      for (let r = 0; r < this.gridSize; r++) {
        // extract row
        let row = [];
        for (let c = 0; c < this.gridSize; c++) {
          row.push(this.board[r][c]);
        }
        const res = this.compressAndMerge(row, step);
        for (let c = 0; c < this.gridSize; c++) {
          if (this.board[r][c] !== res.line[c]) {
            moved = true;
          }
          this.board[r][c] = res.line[c];
        }
        scoreGained += res.score;
      }
    } else {
      for (let c = 0; c < this.gridSize; c++) {
        // extract column
        let col = [];
        for (let r = 0; r < this.gridSize; r++) {
          col.push(this.board[r][c]);
        }
        const res = this.compressAndMerge(col, step);
        for (let r = 0; r < this.gridSize; r++) {
          if (this.board[r][c] !== res.line[r]) {
            moved = true;
          }
          this.board[r][c] = res.line[r];
        }
        scoreGained += res.score;
      }
    }

    if (moved) {
      this.score += scoreGained;
      this.spawnTileAtRandom();

      // Regenerate tiles list & hook up animations
      const oldTiles = this.tilesList;
      this.syncTilesListFromBoard();

      // Match old positions to new targets to trigger smooth sliding lerps
      this.tilesList.forEach(t => {
        const match = oldTiles.find(ot => ot.val === t.val && ot.tarX !== t.tarX);
        if (match) {
          t.curX = match.curX;
          t.curY = match.curY;
          t.timer = 80; // 80ms slide
        }
      });

      // Check level targets and gameover
      this.checkGameState();
    }
  }

  compressAndMerge(line, step) {
    let score = 0;
    
    // 1. Extract non-zero numbers while ignoring blocked (-1)
    const items = [];
    line.forEach((val, idx) => {
      if (val > 0) items.push({ val, origIdx: idx });
    });

    const result = Array.from(line, (x) => (x === -1 ? -1 : 0));
    const merged = [];

    // Merge logic
    if (step === 1) { // Left / Up
      let i = 0;
      while (i < items.length) {
        if (i < items.length - 1 && items[i].val === items[i + 1].val) {
          // Merge
          const sum = items[i].val * 2;
          merged.push(sum);
          score += sum;
          i += 2;
        } else {
          merged.push(items[i].val);
          i++;
        }
      }
      
      // place merged items back into result line skipping obstacles (-1)
      let writeIdx = 0;
      merged.forEach(val => {
        while (writeIdx < result.length && result[writeIdx] === -1) {
          writeIdx++;
        }
        if (writeIdx < result.length) {
          result[writeIdx] = val;
          writeIdx++;
        }
      });
    } else { // Right / Down
      let i = items.length - 1;
      while (i >= 0) {
        if (i > 0 && items[i].val === items[i - 1].val) {
          const sum = items[i].val * 2;
          merged.unshift(sum);
          score += sum;
          i -= 2;
        } else {
          merged.unshift(items[i].val);
          i--;
        }
      }

      let writeIdx = result.length - 1;
      for (let j = merged.length - 1; j >= 0; j--) {
        while (writeIdx >= 0 && result[writeIdx] === -1) {
          writeIdx--;
        }
        if (writeIdx >= 0) {
          result[writeIdx] = merged[j];
          writeIdx--;
        }
      }
    }

    return { line: result, score };
  }

  checkGameState() {
    // 1. Verify target tile reached
    let maxVal = 0;
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        maxVal = Math.max(maxVal, this.board[r][c]);
      }
    }

    if (maxVal >= this.targetValue) {
      this.levelComplete();
      return;
    }

    // 2. Verify Game Over criteria
    let hasMoves = false;
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.board[r][c] === 0) {
          hasMoves = true;
          break;
        }
      }
    }

    if (!hasMoves) {
      // Check adjacent merges
      for (let r = 0; r < this.gridSize; r++) {
        for (let c = 0; c < this.gridSize; c++) {
          const val = this.board[r][c];
          if (val <= 0) continue;
          
          const neighbors = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
          ];

          neighbors.forEach(n => {
            const nr = r + n.dr;
            const nc = c + n.dc;
            if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize) {
              if (this.board[nr][nc] === val) {
                hasMoves = true;
              }
            }
          });
        }
      }
    }

    if (!hasMoves) {
      this.isOver = true;
      this.gameOver();
    }
  }

  getTileBg(val) {
    // Theme colors deepening as values increase
    if (val === 2) return '#2d3436';
    if (val === 4) return '#343a40';
    if (val === 8) return 'rgba(225, 112, 85, 0.4)';
    if (val === 16) return 'rgba(225, 112, 85, 0.6)';
    if (val === 32) return 'rgba(214, 48, 49, 0.5)';
    if (val === 64) return 'rgba(214, 48, 49, 0.8)';
    if (val === 128) return 'rgba(253, 203, 110, 0.6)';
    if (val === 256) return 'rgba(253, 203, 110, 0.8)';
    if (val === 512) return '#f9ca24';
    if (val === 1024) return '#f0932b';
    return '#6c5ce7'; // 2048+
  }

  render(ctx) {
    this.clear();

    const gap = 6;

    // Draw Grid negative space backdrop
    ctx.fillStyle = '#0f0f14';
    ctx.fillRect(0, 0, this.W, this.H);

    // Draw empty grid blocks & blocked obstacles
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const pos = this.getGridCoords(r, c);
        const val = this.board[r][c];

        if (val === -1) {
          // Blocked obstacle cell (diagonal stripes)
          ctx.save();
          ctx.fillStyle = '#202028';
          ctx.fillRect(pos.x, pos.y, this.cellSize, this.cellSize);
          
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          // simple diagonal lines
          for (let offset = 0; offset < this.cellSize * 2; offset += 15) {
            ctx.moveTo(pos.x + offset, pos.y);
            ctx.lineTo(pos.x, pos.y + offset);
          }
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
          ctx.fillRect(pos.x, pos.y, this.cellSize, this.cellSize);
        }
      }
    }

    // Draw animated active tiles
    this.tilesList.forEach(t => {
      ctx.save();
      ctx.translate(t.curX + this.cellSize / 2, t.curY + this.cellSize / 2);
      ctx.scale(t.scale, t.scale);

      ctx.fillStyle = this.getTileBg(t.val);
      ctx.fillRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize);

      // Value text
      ctx.fillStyle = '#ffffff';
      // Adjust size scales down for larger numbers
      const textLen = String(t.val).length;
      const fontSize = textLen >= 4 ? 20 : textLen === 3 ? 24 : 32;
      ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.val, 0, 0);

      ctx.restore();
    });

    // Top Header Target goals
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(`TARGET: ${this.targetValue}`, 24, 25);

    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${this.score}`, this.W - 24, 25);
  }

  destroy() {
    super.destroy();
  }
}

window.GameClass = SlideForge;
export default SlideForge;
