import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

export default class SlideForge extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas || 'game-canvas', { ...config, 
      name: 'slide-forge',
      description: 'Slide tiles to merge matching numbers. Forge the highest block!',
      width: 500,
      height: 500
    });

    this.scoreEl = document.getElementById('game-score');

    this.gridSize = 4;
    this.cellSize = 110;
    this.padding = 12;
    this.offsetX = (500 - (this.gridSize * this.cellSize)) / 2;
    this.offsetY = (500 - (this.gridSize * this.cellSize)) / 2;

    this.init();
  }

  onStart() {
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
    
    this.addRandomTile();
    this.addRandomTile();
    
    this.saveState();
    
    this.updateUI();
    
    this.cacheBackground();
    
    let runs = Storage.get('slide-forge_runs', 0);
    Storage.set('slide-forge_runs', runs + 1);
  }

  cacheBackground() {
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = this.canvas.width;
    this.bgCanvas.height = this.canvas.height;
    const bgCtx = this.bgCanvas.getContext('2d');

    bgCtx.fillStyle = '#0a0a0f';
    bgCtx.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);

    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize; r++) {
        bgCtx.fillStyle = '#1e1e2a';
        bgCtx.beginPath();
        bgCtx.roundRect(
          this.offsetX + c * this.cellSize + this.padding/2, 
          this.offsetY + r * this.cellSize + this.padding/2, 
          this.cellSize - this.padding, 
          this.cellSize - this.padding, 8);
        bgCtx.fill();
      }
    }
  }

  addRandomTile() {
    let emptyCells = [];
    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize; r++) {
        if (!this.grid[c][r]) emptyCells.push({c, r});
      }
    }
    
    if (emptyCells.length > 0) {
      let cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      let val = Math.random() > 0.9 ? 4 : 2;
      let tile = {
        c: cell.c, r: cell.r,
        tc: cell.c, tr: cell.r, // target
        val: val,
        isNew: true,
        scale: 0.1
      };
      this.grid[cell.c][cell.r] = tile;
      this.tiles.push(tile);
    }
  }

  onInput(key, event) {
    if (this.state !== 'PLAYING' || this.animating) return;

    if (key === 'u' && this.history) {
      this.undo();
      return;
    }

    let moved = false;
    // deep copy state before move
    const prevState = this.serializeState();
    
    if (key === 'arrowup' || key === 'w') moved = this.slide(0, -1);
    else if (key === 'arrowdown' || key === 's') moved = this.slide(0, 1);
    else if (key === 'arrowleft' || key === 'a') moved = this.slide(-1, 0);
    else if (key === 'arrowright' || key === 'd') moved = this.slide(1, 0);
    
    if (moved) {
      this.history = prevState;
      Sound.playBlip();
      this.animating = true;
      setTimeout(() => {
        this.addRandomTile();
        this.animating = false;
        if (this.checkGameOver()) {
          Sound.playGameOver();
          this.gameOver();
        } else {
          this.saveState(); // Update current state for future undo (though history holds previous)
        }
      }, 150); // animation duration
    }
  }

  serializeState() {
    return {
      score: this.score,
      tiles: this.tiles.map(t => ({...t}))
    };
  }

  saveState() {
    this.currentState = this.serializeState();
  }

  undo() {
    if (!this.history) return;
    
    Sound.playBlip();
    this.score = this.history.score;
    this.tiles = this.history.tiles.map(t => ({...t}));
    
    // rebuild grid
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
    
    this.history = null; // can only undo 1 step
    this.updateUI();
  }

  slide(dc, dr) {
    let moved = false;
    
    // Determine traversal order
    let colStart = dc === 1 ? this.gridSize - 1 : 0;
    let colEnd = dc === 1 ? -1 : this.gridSize;
    let colStep = dc === 1 ? -1 : 1;
    
    let rowStart = dr === 1 ? this.gridSize - 1 : 0;
    let rowEnd = dr === 1 ? -1 : this.gridSize;
    let rowStep = dr === 1 ? -1 : 1;
    
    // Reset merged flags
    for(let t of this.tiles) t.merged = false;
    
    for (let c = colStart; c !== colEnd; c += colStep) {
      for (let r = rowStart; r !== rowEnd; r += rowStep) {
        let tile = this.grid[c][r];
        if (tile) {
          let currC = c;
          let currR = r;
          
          while (true) {
            let nextC = currC + dc;
            let nextR = currR + dr;
            
            // Bounds check
            if (nextC < 0 || nextC >= this.gridSize || nextR < 0 || nextR >= this.gridSize) break;
            
            let nextTile = this.grid[nextC][nextR];
            
            if (!nextTile) {
              // Move to empty
              this.grid[nextC][nextR] = tile;
              this.grid[currC][currR] = null;
              currC = nextC;
              currR = nextR;
              moved = true;
            } else if (nextTile.val === tile.val && !nextTile.merged && !tile.merged) {
              // Merge
              this.grid[currC][currR] = null;
              
              // Mark tile to be deleted after animation
              tile.deleteAfterAnim = true;
              tile.tc = nextC;
              tile.tr = nextR;
              
              // Upgrade nextTile
              nextTile.val *= 2;
              nextTile.merged = true;
              nextTile.pop = true; // for visual scale bounce
              
              this.score += nextTile.val;
              moved = true;
              Sound.playCoin();
              break;
            } else {
              // Can't move further
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
    
    if (moved) this.updateUI();
    return moved;
  }

  checkGameOver() {
    // Are there any empty cells?
    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize; r++) {
        if (!this.grid[c][r]) return false;
      }
    }
    // Are there any possible merges?
    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize; r++) {
        let val = this.grid[c][r].val;
        if (c < this.gridSize - 1 && this.grid[c+1][r].val === val) return false;
        if (r < this.gridSize - 1 && this.grid[c][r+1].val === val) return false;
      }
    }
    return true;
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    
    // Animation lerp
    for (let i = this.tiles.length - 1; i >= 0; i--) {
      let t = this.tiles[i];
      
      // Lerp position
      t.c += (t.tc - t.c) * 15 * dt;
      t.r += (t.tr - t.r) * 15 * dt;
      
      // Lerp scale for new/popping
      if (t.isNew) {
        t.scale += (1.0 - t.scale) * 15 * dt;
        if (t.scale > 0.95) t.isNew = false;
      } else if (t.pop) {
        t.scale = 1.2;
        t.pop = false;
      } else {
        if (t.scale > 1.0) t.scale -= 2.0 * dt;
        if (t.scale < 1.0) t.scale = 1.0;
      }
      
      // Clean up merged tiles that reached destination
      if (t.deleteAfterAnim && Math.abs(t.tc - t.c) < 0.05 && Math.abs(t.tr - t.r) < 0.05) {
        this.tiles.splice(i, 1);
      }
    }
  }

  updateUI() {
    if (this.scoreEl) this.scoreEl.innerText = this.score;
  }

  getColor(val) {
    // Map value to a hue (e.g. 2->yellow, 2048->red)
    let power = Math.log2(val);
    let hue = (60 - (power * 15)) % 360;
    if (hue < 0) hue += 360;
    return `hsl(${hue}, 80%, 60%)`;
  }

  draw() {
    if (this.bgCanvas) {
      this.ctx.drawImage(this.bgCanvas, 0, 0);
    } else {
      this.ctx.fillStyle = '#0a0a0f';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Draw Undo text
    if (this.history) {
      this.ctx.fillStyle = '#6c63ff';
      this.ctx.font = '14px "Press Start 2P"';
      this.ctx.textAlign = 'center';
      this.ctx.fillText("Press 'U' to Undo", this.canvas.width / 2, 25);
    }

    // Draw tiles
    for (let t of this.tiles) {
      if (t.deleteAfterAnim) {
        this.ctx.globalAlpha = 0.5; // faint ghost of merging tile
      }

      let cw = (this.cellSize - this.padding) * t.scale;
      let ch = (this.cellSize - this.padding) * t.scale;
      
      let cx = this.offsetX + t.c * this.cellSize + this.padding/2 + ((this.cellSize - this.padding) - cw)/2;
      let cy = this.offsetY + t.r * this.cellSize + this.padding/2 + ((this.cellSize - this.padding) - ch)/2;

      this.ctx.fillStyle = this.getColor(t.val);
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = this.ctx.fillStyle;
      
      this.ctx.beginPath();
      this.ctx.roundRect(cx, cy, cw, ch, 8);
      this.ctx.fill();
      
      this.ctx.shadowBlur = 0;

      // Text
      this.ctx.fillStyle = '#fff';
      let fontSize = t.val > 1000 ? 24 : 32;
      this.ctx.font = `600 ${fontSize}px "DM Sans"`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(t.val, cx + cw/2, cy + ch/2 + 2);

      this.ctx.globalAlpha = 1.0;
    }
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
});
