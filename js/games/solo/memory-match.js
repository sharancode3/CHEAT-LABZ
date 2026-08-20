import { GameBase } from '../../core/game-base.js';

export class MemoryMatch extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.focus = 100.0;
    this.gameState = 'PLAYING'; // PLAYING, MATCH_DELAY, GAME_OVER, WIN
    this.delayTimer = 0;
    
    this.gridSize = 4;
    this.cards = [];
    this.flippedCards = []; // Store indices
    this.matchesFound = 0;
    this.totalPairs = (this.gridSize * this.gridSize) / 2;
    
    this.cardWidth = 120;
    this.cardHeight = 160;
    this.spacing = 20;
    
    // Calculate top-left offset to center the grid
    const totalW = this.gridSize * this.cardWidth + (this.gridSize - 1) * this.spacing;
    const totalH = this.gridSize * this.cardHeight + (this.gridSize - 1) * this.spacing;
    
    this.offsetX = (this.W - totalW) / 2;
    this.offsetY = (this.H - totalH) / 2 + 30; // Shift down slightly for focus bar

    this.colors = [
      '#f43f5e', // Rose
      '#a855f7', // Purple
      '#3b82f6', // Blue
      '#10b981', // Emerald
      '#eab308', // Yellow
      '#f97316', // Orange
      '#06b6d4', // Cyan
      '#ec4899'  // Pink
    ];

    this.setupDeck();
    this.setupInput();
  }

  setupDeck() {
    let pairIds = [];
    for (let i = 0; i < this.totalPairs; i++) {
      pairIds.push(i, i);
    }
    
    // Fisher-Yates shuffle
    for (let i = pairIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairIds[i], pairIds[j]] = [pairIds[j], pairIds[i]];
    }
    
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const index = row * this.gridSize + col;
        this.cards.push({
          id: index,
          pairId: pairIds[index],
          row: row,
          col: col,
          state: 'HIDDEN', // HIDDEN, FLIPPED, MATCHED
          flipAnim: 0.0 // 0.0 to 1.0 (for width scaling)
        });
      }
    }
  }

  setupInput() {
    this.input.onMouseDown = (e) => {
      if (this.isPaused || this.isOver || this.gameState !== 'PLAYING') return;
      if (this.flippedCards.length >= 2) return;

      // Mouse is relative to canvas. GameBase input doesn't provide scaled coords automatically 
      // but assuming GameBase sets this.input.mouse based on canvas bounding rect and logical size.
      // Wait, GameBase uses logical coordinates for `this.input.mouse`.
      const mx = this.input.mouse.x;
      const my = this.input.mouse.y;
      
      for (let i = 0; i < this.cards.length; i++) {
        const c = this.cards[i];
        if (c.state !== 'HIDDEN') continue;
        
        const cx = this.offsetX + c.col * (this.cardWidth + this.spacing);
        const cy = this.offsetY + c.row * (this.cardHeight + this.spacing);
        
        if (mx >= cx && mx <= cx + this.cardWidth && my >= cy && my <= cy + this.cardHeight) {
          this.flipCard(i);
          break;
        }
      }
    };
  }

  flipCard(index) {
    const c = this.cards[index];
    c.state = 'FLIPPED';
    this.flippedCards.push(index);
    
    if (window.Sound) window.Sound.playTone(300 + index * 10, 'sine', 0.05);

    if (this.flippedCards.length === 2) {
      this.resolveTurn();
    }
  }

  resolveTurn() {
    const i1 = this.flippedCards[0];
    const i2 = this.flippedCards[1];
    const c1 = this.cards[i1];
    const c2 = this.cards[i2];
    
    if (c1.pairId === c2.pairId) {
      // Match
      c1.state = 'MATCHED';
      c2.state = 'MATCHED';
      this.matchesFound++;
      this.focus = Math.min(100, this.focus + 15);
      this.score += 500 * this.level;
      
      if (window.Sound) window.Sound.playTone(600, 'square', 0.1);
      
      this.flippedCards = [];
      
      if (this.matchesFound === this.totalPairs) {
        this.gameState = 'WIN';
        this.delayTimer = 2.0;
        this.score += Math.floor(this.focus * 100);
      }
    } else {
      // Mismatch
      this.gameState = 'MATCH_DELAY';
      this.delayTimer = 0.75; // 750ms delay
      this.focus = Math.max(0, this.focus - 8);
      
      if (window.Sound) window.Sound.playTone(150, 'sawtooth', 0.1);
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    
    // Update flip animations
    for (let c of this.cards) {
      if (c.state === 'FLIPPED' || c.state === 'MATCHED') {
        c.flipAnim = Math.min(1.0, c.flipAnim + delta * 5); // 0.2s animation
      } else {
        c.flipAnim = Math.max(0.0, c.flipAnim - delta * 5);
      }
    }

    if (this.gameState === 'PLAYING' || this.gameState === 'MATCH_DELAY') {
      // Drains 1.5% per second
      // Higher levels drain faster? Level 1 = 1.5%, Level 10 = 3.5%
      const drainRate = 1.5 + (Math.min(10, this.level) - 1) * 0.2;
      this.focus -= drainRate * delta;
      
      if (this.focus <= 0) {
        this.focus = 0;
        this.gameState = 'GAME_OVER';
        this.delayTimer = 2.0;
      }
    }
    
    if (this.gameState === 'MATCH_DELAY') {
      this.delayTimer -= delta;
      if (this.delayTimer <= 0) {
        // Flip back
        for (let idx of this.flippedCards) {
          this.cards[idx].state = 'HIDDEN';
        }
        this.flippedCards = [];
        this.gameState = 'PLAYING';
      }
    } else if (this.gameState === 'WIN') {
      this.delayTimer -= delta;
      if (this.delayTimer <= 0) {
        this.levelComplete();
      }
    } else if (this.gameState === 'GAME_OVER') {
      this.delayTimer -= delta;
      if (this.delayTimer <= 0) {
        this.lives -= 1;
        if (this.lives > 0) {
          this.init(); // Restart level
        }
      }
    }
  }

  render(ctx) {
    this.clear();
    
    // Draw Focus Bar
    ctx.fillStyle = '#111';
    ctx.fillRect(this.W / 2 - 200, 30, 400, 20);
    
    let focusColor = '#10b981'; // Green
    if (this.focus < 50) focusColor = '#eab308'; // Yellow
    if (this.focus < 25) focusColor = '#f43f5e'; // Red
    
    ctx.fillStyle = focusColor;
    ctx.shadowColor = focusColor;
    ctx.shadowBlur = 10;
    ctx.fillRect(this.W / 2 - 200, 30, 400 * (Math.max(0, this.focus) / 100), 20);
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#fff';
    ctx.font = '16px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText("FOCUS", this.W / 2, 20);
    
    // Draw Cards
    for (let c of this.cards) {
      const cx = this.offsetX + c.col * (this.cardWidth + this.spacing);
      const cy = this.offsetY + c.row * (this.cardHeight + this.spacing);
      
      const centerX = cx + this.cardWidth / 2;
      
      // Calculate scaled width for flip animation (cos(anim * PI))
      let flipFactor = Math.cos(c.flipAnim * Math.PI); 
      // If flipFactor > 0, we see the back of the card. If < 0, we see the front.
      
      const isFront = flipFactor < 0;
      const currentWidth = Math.abs(flipFactor) * this.cardWidth;
      const drawX = centerX - currentWidth / 2;
      
      if (isFront) {
        // Draw Front
        ctx.fillStyle = '#222';
        ctx.strokeStyle = this.colors[c.pairId];
        ctx.lineWidth = 3;
        ctx.shadowColor = this.colors[c.pairId];
        ctx.shadowBlur = c.state === 'MATCHED' ? 15 : 5;
        
        ctx.fillRect(drawX, cy, currentWidth, this.cardHeight);
        ctx.strokeRect(drawX, cy, currentWidth, this.cardHeight);
        
        ctx.shadowBlur = 0;
        
        // Draw Icon/Number
        ctx.fillStyle = this.colors[c.pairId];
        ctx.font = `bold ${40 * Math.abs(flipFactor)}px "JetBrains Mono"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.pairId, centerX, cy + this.cardHeight / 2);
        
        // If matched, maybe draw a dim overlay
        if (c.state === 'MATCHED') {
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fillRect(drawX, cy, currentWidth, this.cardHeight);
        }
      } else {
        // Draw Back
        ctx.fillStyle = '#1e1e1e';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.fillRect(drawX, cy, currentWidth, this.cardHeight);
        ctx.strokeRect(drawX, cy, currentWidth, this.cardHeight);
        
        // Pattern for back
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX, cy + 20);
        ctx.lineTo(drawX + currentWidth - 20, cy + this.cardHeight / 2);
        ctx.lineTo(centerX, cy + this.cardHeight - 20);
        ctx.lineTo(drawX + 20, cy + this.cardHeight / 2);
        ctx.closePath();
        ctx.stroke();
      }
    }
    
    // Draw Overlay Messages
    if (this.gameState === 'GAME_OVER') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#f43f5e';
      ctx.font = '40px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 20;
      ctx.fillText("FOCUS LOST", this.W / 2, this.H / 2);
      ctx.shadowBlur = 0;
    } else if (this.gameState === 'WIN') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#10b981';
      ctx.font = '40px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 20;
      ctx.fillText("PATTERN CLEARED", this.W / 2, this.H / 2);
      ctx.shadowBlur = 0;
    }
  }
}

export default MemoryMatch;
