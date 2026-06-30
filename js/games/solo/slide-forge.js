import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

export default class SlideForge extends GameBase {
  static get logicalWidth() { return 500; }
  static get logicalHeight() { return 500; }
  
  constructor(canvas, container) {
    super(canvas, container);

    this.gridSize = 4;
    this.cellSize = 108;
    this.padding = 10;
    this.offsetX = (this.width - (this.gridSize * this.cellSize)) / 2;
    this.offsetY = (this.height - (this.gridSize * this.cellSize)) / 2;

    this.grid = [];
    this.tiles = [];
    this.animating = false;
    this.history = null;

    // Drag indicators
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
  }

  init() {
    this.grid = [];
    for (let c = 0; c < this.gridSize; c++) {
      this.grid[c] = [];
      for (let r = 0; r < this.gridSize; r++) {
        this.grid[c][r] = null;
      }
    }
    
    this.tiles = [];
    this.animating = false;
    this.history = null;
    this.score = 0;
    this.isDragging = false;
    
    this.addRandomTile();
    this.addRandomTile();
    
    this.saveState();
    this.cacheBackground();

    let runs = Storage.get('slide-forge_runs', 0);
    Storage.set('slide-forge_runs', runs + 1);
  }

  cacheBackground() {
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = this.width;
    this.bgCanvas.height = this.height;
    const bgCtx = this.bgCanvas.getContext('2d');

    // Draw background
    bgCtx.fillStyle = '#060608';
    bgCtx.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);

    // Draw inner grid boxes
    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize; r++) {
        bgCtx.fillStyle = '#14141f';
        bgCtx.beginPath();
        bgCtx.roundRect(
          this.offsetX + c * this.cellSize + this.padding / 2, 
          this.offsetY + r * this.cellSize + this.padding / 2, 
          this.cellSize - this.padding, 
          this.cellSize - this.padding, 6);
        bgCtx.fill();
      }
    }
  }

  addRandomTile() {
    let emptyCells = [];
    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize; r++) {
        if (!this.grid[c][r]) emptyCells.push({ c, r });
      }
    }
    
    if (emptyCells.length > 0) {
      const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const val = Math.random() > 0.9 ? 4 : 2;
      const tile = {
        c: cell.c, r: cell.r,
        tc: cell.c, tr: cell.r, // target
        val: val,
        isNew: true,
        scale: 0.1,
        popScale: 1.0,
        merged: false,
        deleteAfterAnim: false
      };
      this.grid[cell.c][cell.r] = tile;
      this.tiles.push(tile);
    }
  }

  onInput(key, event) {
    if (this.state !== 'PLAYING' || this.animating) return;

    const k = key.toLowerCase();
    if (k === 'u' && this.history) {
      this.undo();
      return;
    }

    let moved = false;
    const prevState = this.serializeState();
    
    if (k === 'arrowup' || k === 'w') moved = this.slide(0, -1);
    else if (k === 'arrowdown' || k === 's') moved = this.slide(0, 1);
    else if (k === 'arrowleft' || k === 'a') moved = this.slide(-1, 0);
    else if (k === 'arrowright' || k === 'd') moved = this.slide(1, 0);
    
    if (moved) {
      this.triggerSlideTransition(prevState);
    }
  }

  onMouseDown(x, y, event) {
    if (this.state !== 'PLAYING' || this.animating) return;
    this.isDragging = true;
    this.startX = x;
    this.startY = y;
  }

  onMouseMove(x, y, event) {}

  onMouseUp(x, y, event) {
    if (!this.isDragging || this.state !== 'PLAYING' || this.animating) return;
    this.isDragging = false;

    const dx = x - this.startX;
    const dy = y - this.startY;
    const dist = Math.hypot(dx, dy);

    // Swipe gesture trigger (min 35px)
    if (dist >= 35) {
      let moved = false;
      const prevState = this.serializeState();

      if (Math.abs(dx) > Math.abs(dy)) {
        moved = dx > 0 ? this.slide(1, 0) : this.slide(-1, 0);
      } else {
        moved = dy > 0 ? this.slide(0, 1) : this.slide(0, -1);
      }

      if (moved) {
        this.triggerSlideTransition(prevState);
      }
    }
  }

  triggerSlideTransition(prevState) {
    this.history = prevState;
    this.container.audio.play('blip');
    this.animating = true;
    
    setTimeout(() => {
      this.addRandomTile();
      this.animating = false;
      
      if (this.checkGameOver()) {
        this.container.audio.play('gameover');
        this.finishGame();
      } else {
        this.saveState();
      }
    }, 150);
  }

  serializeState() {
    return {
      score: this.score,
      tiles: this.tiles.map(t => ({
        c: t.c, r: t.r, tc: t.tc, tr: t.tr,
        val: t.val, scale: t.scale, popScale: t.popScale,
        isNew: t.isNew, merged: t.merged, deleteAfterAnim: t.deleteAfterAnim
      }))
    };
  }

  saveState() {
    this.currentState = this.serializeState();
  }

  undo() {
    if (!this.history) return;
    
    this.container.audio.play('blip');
    this.score = this.history.score;
    this.tiles = this.history.tiles.map(t => ({ ...t }));
    
    // Clear grid mapping
    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize; r++) {
        this.grid[c][r] = null;
      }
    }
    
    for (let t of this.tiles) {
      t.c = t.tc;
      t.r = t.tr;
      this.grid[t.tc][t.tr] = t;
    }
    
    this.history = null; // single-step undo
  }

  slide(dc, dr) {
    let moved = false;
    
    const colStart = dc === 1 ? this.gridSize - 1 : 0;
    const colEnd = dc === 1 ? -1 : this.gridSize;
    const colStep = dc === 1 ? -1 : 1;
    
    const rowStart = dr === 1 ? this.gridSize - 1 : 0;
    const rowEnd = dr === 1 ? -1 : this.gridSize;
    const rowStep = dr === 1 ? -1 : 1;
    
    this.tiles.forEach(t => t.merged = false);
    
    for (let c = colStart; c !== colEnd; c += colStep) {
      for (let r = rowStart; r !== rowEnd; r += rowStep) {
        let tile = this.grid[c][r];
        if (tile) {
          let currC = c;
          let currR = r;
          
          while (true) {
            const nextC = currC + dc;
            const nextR = currR + dr;
            
            if (nextC < 0 || nextC >= this.gridSize || nextR < 0 || nextR >= this.gridSize) break;
            
            const nextTile = this.grid[nextC][nextR];
            
            if (!nextTile) {
              this.grid[nextC][nextR] = tile;
              this.grid[currC][currR] = null;
              currC = nextC;
              currR = nextR;
              moved = true;
            } else if (nextTile.val === tile.val && !nextTile.merged && !tile.merged) {
              // Merge matching tiles
              this.grid[currC][currR] = null;
              
              tile.deleteAfterAnim = true;
              tile.tc = nextC;
              tile.tr = nextR;
              
              nextTile.val *= 2;
              nextTile.merged = true;
              nextTile.popScale = 1.25; // bounce scale zoom

              this.score += nextTile.val;
              moved = true;
              this.container.audio.play('coin');
              break;
            } else {
              break;
            }
          }
          
          if (moved && !tile.deleteAfterAnim) {
            tile.tc = currC;
            tile.tr = currR;
          }
        }
      }
    }
    
    return moved;
  }

  checkGameOver() {
    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize; r++) {
        if (!this.grid[c][r]) return false;
      }
    }
    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize; r++) {
        const val = this.grid[c][r].val;
        if (c < this.gridSize - 1 && this.grid[c + 1][r].val === val) return false;
        if (r < this.gridSize - 1 && this.grid[c][r + 1].val === val) return false;
      }
    }
    return true;
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    
    // Animation transitions updates
    for (let i = this.tiles.length - 1; i >= 0; i--) {
      const t = this.tiles[i];
      
      // Lerp translation
      t.c += (t.tc - t.c) * 16 * dt;
      t.r += (t.tr - t.r) * 16 * dt;
      
      if (t.isNew) {
        t.scale += (1.0 - t.scale) * 16 * dt;
        if (t.scale > 0.95) {
          t.scale = 1.0;
          t.isNew = false;
        }
      }

      // Smooth zoom pop recovery
      if (t.popScale > 1.0) {
        t.popScale -= 1.6 * dt;
        if (t.popScale < 1.0) t.popScale = 1.0;
      }
      
      // Clear deletes once they overlap targets
      if (t.deleteAfterAnim && Math.abs(t.tc - t.c) < 0.06 && Math.abs(t.tr - t.r) < 0.06) {
        this.tiles.splice(i, 1);
      }
    }
  }

  finishGame() {
    const baseScore = this.score;
    const coins = Math.floor(baseScore / 70);

    this.scoreBreakdown = {
      rows: [
        { label: 'Completion Score', value: baseScore, points: baseScore }
      ],
      total: baseScore,
      coinsEarned: coins
    };

    if (window.awardCoins && coins > 0) {
      window.awardCoins(coins, 'Slide Forge Score');
    }

    this.gameOver();
  }

  getTileTheme(val) {
    // Return bespoke neon color profiles per numerical tier
    const themes = {
      2: { bg: '#1e1e2d', border: '#4b5563', text: '#f3f4f6' },
      4: { bg: '#2b223c', border: '#7c3aed', text: '#c084fc' },
      8: { bg: '#1e3a5f', border: '#2563eb', text: '#93c5fd' },
      16: { bg: '#064e3b', border: '#059669', text: '#6ee7b7' },
      32: { bg: '#78350f', border: '#d97706', text: '#fde68a' },
      64: { bg: '#7f1d1d', border: '#dc2626', text: '#fca5a5' },
      128: { bg: '#3b0764', border: '#a855f7', text: '#f3e8ff' },
      256: { bg: '#4c1d95', border: '#c084fc', text: '#ffffff' },
      512: { bg: '#0f766e', border: '#0d9488', text: '#ccfbf1' },
      1024: { bg: '#0369a1', border: '#0284c7', text: '#e0f2fe' },
      2048: { bg: '#b45309', border: '#fbbf24', text: '#fffbeb' }
    };
    return themes[val] || { bg: '#b45309', border: '#fbbf24', text: '#ffffff' };
  }

  draw() {
    if (this.bgCanvas) {
      this.ctx.drawImage(this.bgCanvas, 0, 0);
    } else {
      this.ctx.fillStyle = '#060608';
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    // Draw Undo text helper
    if (this.history) {
      this.ctx.fillStyle = '#a855f7';
      this.ctx.font = 'bold 11px "JetBrains Mono", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText("PRESS 'U' KEY TO UNDO PREVIOUS MOVE", this.width / 2, 30);
    }

    // Render active sliding cards
    for (let t of this.tiles) {
      if (t.deleteAfterAnim) {
        this.ctx.globalAlpha = 0.45;
      }

      const visualScale = t.scale * t.popScale;
      const cw = (this.cellSize - this.padding) * visualScale;
      const ch = (this.cellSize - this.padding) * visualScale;
      
      const cx = this.offsetX + t.c * this.cellSize + this.padding / 2 + ((this.cellSize - this.padding) - cw) / 2;
      const cy = this.offsetY + t.r * this.cellSize + this.padding / 2 + ((this.cellSize - this.padding) - ch) / 2;

      const theme = this.getTileTheme(t.val);

      // Card box fill
      this.ctx.fillStyle = theme.bg;
      this.ctx.beginPath();
      this.ctx.roundRect(cx, cy, cw, ch, 6);
      this.ctx.fill();
      
      // Neon glows outline
      this.ctx.strokeStyle = theme.border;
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();

      // Card Text numbers
      this.ctx.fillStyle = theme.text;
      const fontSize = t.val > 1000 ? 20 : (t.val > 100 ? 24 : 28);
      this.ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(t.val, cx + cw / 2, cy + ch / 2 + 1);

      this.ctx.globalAlpha = 1.0;
    }
  }

  getControls() {
    return [
      { key: 'WASD / ARROWS', action: 'Slide tile grid' },
      { key: 'DRAG GESTURES', action: 'Swipe direction actions' },
      { key: 'U', action: 'Undo last slide' }
    ];
  }

  getFunStat() {
    return `Formed blocks up to total score ${this.score}`;
  }

  getScoreBreakdown() {
    if (this.scoreBreakdown && this.scoreBreakdown.rows) {
      return this.scoreBreakdown.rows;
    }
    return [
      { label: 'Score Accumulation', value: this.score }
    ];
  }
}
window.GameState = {};
