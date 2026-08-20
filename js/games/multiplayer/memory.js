import { GameBase } from '../../core/game-base.js';

export class MultiplayerMemory extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.rows = 4;
    this.cols = 5;
    this.totalCards = this.rows * this.cols;
    
    // Emojis for pairs (8 pairs = 16 cards)
    const pairIcons = ['💎', '🍎', '🚀', '⭐', '🍕', '🎸', '🎮', '🦄'];
    
    // Traps (4 cards)
    const trapIcons = ['☠️', '☠️', '☠️', '☠️'];
    
    let deck = [];
    pairIcons.forEach(icon => {
      deck.push({ type: 'PAIR', icon: icon, id: icon });
      deck.push({ type: 'PAIR', icon: icon, id: icon });
    });
    
    trapIcons.forEach(icon => {
      deck.push({ type: 'TRAP', icon: icon, id: 'TRAP' });
    });
    
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    this.cards = deck.map(d => ({
      ...d,
      isFlipped: false,
      isMatched: false
    }));
    
    this.scoreP1 = 0;
    this.scoreP2 = 0;
    this.currentPlayer = 1; // 1 or 2
    
    this.flippedIndices = [];
    this.state = 'PLAYING'; // PLAYING, EVALUATING
    this.evalDelay = 0;
    
    this.setupInput();
  }

  setupInput() {
    this.input.onMouseDown = (e) => {
      if (this.isPaused || this.isOver || this.state !== 'PLAYING') return;
      
      const cardW = 100;
      const cardH = 100;
      const gap = 20;
      
      const gridW = this.cols * cardW + (this.cols - 1) * gap;
      const gridH = this.rows * cardH + (this.rows - 1) * gap;
      
      const offsetX = (this.W - gridW) / 2;
      const offsetY = 200;
      
      for (let i = 0; i < this.cards.length; i++) {
        const c = i % this.cols;
        const r = Math.floor(i / this.cols);
        
        const cx = offsetX + c * (cardW + gap);
        const cy = offsetY + r * (cardH + gap);
        
        if (e.x >= cx && e.x < cx + cardW &&
            e.y >= cy && e.y < cy + cardH) {
          
          this.flipCard(i);
          break;
        }
      }
    };
  }

  flipCard(idx) {
    const card = this.cards[idx];
    if (card.isFlipped || card.isMatched) return;
    
    card.isFlipped = true;
    this.flippedIndices.push(idx);
    
    if (window.Sound) window.Sound.playTone(400, 'square', 0.05);
    
    if (card.type === 'TRAP') {
      this.state = 'EVALUATING';
      this.evalDelay = 1.0;
      if (window.Sound) window.Sound.playTone(150, 'sawtooth', 0.5);
    } else if (this.flippedIndices.length === 2) {
      this.state = 'EVALUATING';
      this.evalDelay = 1.0;
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    
    if (this.state === 'EVALUATING') {
      this.evalDelay -= delta;
      if (this.evalDelay <= 0) {
        this.evaluateTurn();
      }
    }
  }

  evaluateTurn() {
    let keepTurn = false;
    
    // Check if a trap was hit
    const trapIdx = this.flippedIndices.findIndex(idx => this.cards[idx].type === 'TRAP');
    
    if (trapIdx !== -1) {
      // Trap Hit! Lose 150 points, other player steals them
      if (this.currentPlayer === 1) {
        const stealAmount = Math.min(150, this.scoreP1);
        this.scoreP1 -= stealAmount;
        this.scoreP2 += stealAmount;
      } else {
        const stealAmount = Math.min(150, this.scoreP2);
        this.scoreP2 -= stealAmount;
        this.scoreP1 += stealAmount;
      }
      
      // Keep traps revealed as matched so they are removed from play
      this.flippedIndices.forEach(idx => {
        this.cards[idx].isMatched = true;
      });
      
    } else if (this.flippedIndices.length === 2) {
      const c1 = this.cards[this.flippedIndices[0]];
      const c2 = this.cards[this.flippedIndices[1]];
      
      if (c1.id === c2.id) {
        // Match!
        c1.isMatched = true;
        c2.isMatched = true;
        if (this.currentPlayer === 1) this.scoreP1 += 100;
        else this.scoreP2 += 100;
        
        keepTurn = true; // Earn another turn
        if (window.Sound) window.Sound.playTone(800, 'sine', 0.2);
      } else {
        // No match
        c1.isFlipped = false;
        c2.isFlipped = false;
      }
    }
    
    this.flippedIndices = [];
    this.state = 'PLAYING';
    
    if (!keepTurn) {
      this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    }
    
    // Check if game over
    const allMatched = this.cards.every(c => c.isMatched);
    if (allMatched) {
      this.isOver = true;
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.5);
      setTimeout(() => this.levelComplete(), 3000);
    }
  }

  render(ctx) {
    this.clear();
    
    // Header
    ctx.fillStyle = '#fff';
    ctx.font = '30px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText("POINT STEAL MEMORY", this.W / 2, 50);
    
    ctx.font = '24px "JetBrains Mono"';
    
    // P1 Score
    ctx.fillStyle = this.currentPlayer === 1 ? '#38bdf8' : '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText(`P1: ${this.scoreP1} pts`, 50, 120);
    if (this.currentPlayer === 1) {
      ctx.fillText("◀ YOUR TURN", 50, 150);
    }
    
    // P2 Score
    ctx.fillStyle = this.currentPlayer === 2 ? '#fb7185' : '#64748b';
    ctx.textAlign = 'right';
    ctx.fillText(`P2: ${this.scoreP2} pts`, this.W - 50, 120);
    if (this.currentPlayer === 2) {
      ctx.fillText("YOUR TURN ▶", this.W - 50, 150);
    }
    
    // Cards
    const cardW = 100;
    const cardH = 100;
    const gap = 20;
    
    const gridW = this.cols * cardW + (this.cols - 1) * gap;
    const offsetX = (this.W - gridW) / 2;
    const offsetY = 200;
    
    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      const c = i % this.cols;
      const r = Math.floor(i / this.cols);
      
      const cx = offsetX + c * (cardW + gap);
      const cy = offsetY + r * (cardH + gap);
      
      if (card.isMatched) {
        if (card.type === 'TRAP') {
          ctx.fillStyle = '#450a0a';
          ctx.fillRect(cx, cy, cardW, cardH);
          ctx.font = '50px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(card.icon, cx + cardW/2, cy + cardH/2);
        } else {
          // Empty space for matched pairs
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.fillRect(cx, cy, cardW, cardH);
        }
      } else if (card.isFlipped) {
        if (card.type === 'TRAP') ctx.fillStyle = '#ef4444';
        else ctx.fillStyle = '#fff';
        
        ctx.fillRect(cx, cy, cardW, cardH);
        ctx.font = '50px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(card.icon, cx + cardW/2, cy + cardH/2);
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(cx, cy, cardW, cardH);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4;
        ctx.strokeRect(cx, cy, cardW, cardH);
      }
    }
    
    if (this.isOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#10b981';
      ctx.font = '50px "Press Start 2P"';
      ctx.textAlign = 'center';
      
      if (this.scoreP1 > this.scoreP2) {
        ctx.fillText("P1 WINS MATCH!", this.W / 2, this.H / 2);
      } else if (this.scoreP2 > this.scoreP1) {
        ctx.fillText("P2 WINS MATCH!", this.W / 2, this.H / 2);
      } else {
        ctx.fillText("DRAW MATCH!", this.W / 2, this.H / 2);
      }
    }
  }
}
