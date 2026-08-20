import { GameBase } from '../../core/game-base.js';

export class MultiplayerSnake extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.gridSize = 25;
    this.cols = 32;
    this.rows = 28;
    
    // Offset for UI header
    this.offsetY = 100;
    
    // P1 (Cyan - left side)
    this.p1 = {
      body: [{ x: 5, y: 14 }],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      score: 0,
      color: '#06b6d4',
      isDead: false
    };
    
    // P2 (Magenta - right side)
    this.p2 = {
      body: [{ x: 26, y: 14 }],
      dir: { x: -1, y: 0 },
      nextDir: { x: -1, y: 0 },
      score: 0,
      color: '#d946ef',
      isDead: false
    };
    
    this.tickRate = 120; // ms per move
    this.lastTick = 0;
    
    this.roundState = 'PLAYING'; // PLAYING, ROUND_OVER
    this.roundDelay = 0;
    this.roundResult = '';
    
    this.setupInput();
  }

  setupInput() {
    this.input.onKeyDown = (e) => {
      if (this.isPaused || this.isOver || this.roundState !== 'PLAYING') return;
      
      const key = e.key;
      
      // P1 (WASD)
      if (key === 'w' || key === 'W') {
        if (this.p1.dir.y === 0) this.p1.nextDir = { x: 0, y: -1 };
      } else if (key === 's' || key === 'S') {
        if (this.p1.dir.y === 0) this.p1.nextDir = { x: 0, y: 1 };
      } else if (key === 'a' || key === 'A') {
        if (this.p1.dir.x === 0) this.p1.nextDir = { x: -1, y: 0 };
      } else if (key === 'd' || key === 'D') {
        if (this.p1.dir.x === 0) this.p1.nextDir = { x: 1, y: 0 };
      }
      
      // P2 (Arrows)
      if (key === 'ArrowUp') {
        if (this.p2.dir.y === 0) this.p2.nextDir = { x: 0, y: -1 };
      } else if (key === 'ArrowDown') {
        if (this.p2.dir.y === 0) this.p2.nextDir = { x: 0, y: 1 };
      } else if (key === 'ArrowLeft') {
        if (this.p2.dir.x === 0) this.p2.nextDir = { x: -1, y: 0 };
      } else if (key === 'ArrowRight') {
        if (this.p2.dir.x === 0) this.p2.nextDir = { x: 1, y: 0 };
      }
    };
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    
    if (this.roundState === 'ROUND_OVER') {
      this.roundDelay -= delta;
      if (this.roundDelay <= 0) {
        this.resetRound();
      }
      return;
    }
    
    // Accumulate time for fixed tick rate
    const now = performance.now();
    if (now - this.lastTick > this.tickRate) {
      this.lastTick = now;
      this.tick();
    }
  }

  tick() {
    this.p1.dir = { ...this.p1.nextDir };
    this.p2.dir = { ...this.p2.nextDir };
    
    const p1Head = this.p1.body[0];
    const p2Head = this.p2.body[0];
    
    const p1Next = { x: p1Head.x + this.p1.dir.x, y: p1Head.y + this.p1.dir.y };
    const p2Next = { x: p2Head.x + this.p2.dir.x, y: p2Head.y + this.p2.dir.y };
    
    // 1. Check Wall Collisions
    const p1HitWall = p1Next.x < 0 || p1Next.x >= this.cols || p1Next.y < 0 || p1Next.y >= this.rows;
    const p2HitWall = p2Next.x < 0 || p2Next.x >= this.cols || p2Next.y < 0 || p2Next.y >= this.rows;
    
    // 2. Check Head-On Collision
    const headOn = p1Next.x === p2Next.x && p1Next.y === p2Next.y;
    
    // 3. Check Body Collisions (Tron style - bodies don't disappear, so they just grow)
    // Actually wait, Tron style means they leave a trail. Let's just grow them every tick.
    const p1HitP2Body = this.p2.body.some(segment => segment.x === p1Next.x && segment.y === p1Next.y);
    const p1HitSelf = this.p1.body.some(segment => segment.x === p1Next.x && segment.y === p1Next.y);
    
    const p2HitP1Body = this.p1.body.some(segment => segment.x === p2Next.x && segment.y === p2Next.y);
    const p2HitSelf = this.p2.body.some(segment => segment.x === p2Next.x && segment.y === p2Next.y);
    
    this.p1.isDead = p1HitWall || headOn || p1HitP2Body || p1HitSelf;
    this.p2.isDead = p2HitWall || headOn || p2HitP1Body || p2HitSelf;
    
    // Move (Grow)
    if (!this.p1.isDead) this.p1.body.unshift(p1Next);
    if (!this.p2.isDead) this.p2.body.unshift(p2Next);
    
    // Check Round Results
    if (this.p1.isDead && this.p2.isDead) {
      this.handleRoundEnd(0); // Draw
    } else if (this.p1.isDead) {
      this.handleRoundEnd(2); // P2 wins
    } else if (this.p2.isDead) {
      this.handleRoundEnd(1); // P1 wins
    }
  }

  handleRoundEnd(winner) {
    this.roundState = 'ROUND_OVER';
    this.roundDelay = 2.0;
    
    if (winner === 1) {
      this.p1.score++;
      this.roundResult = "P1 WINS ROUND";
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.5);
    } else if (winner === 2) {
      this.p2.score++;
      this.roundResult = "P2 WINS ROUND";
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.5);
    } else {
      this.roundResult = "DRAW";
      if (window.Sound) window.Sound.playTone(200, 'sawtooth', 0.5);
    }
    
    if (this.p1.score >= 3 || this.p2.score >= 3) {
      this.isOver = true;
      setTimeout(() => this.levelComplete(), 3000);
    }
  }

  resetRound() {
    this.p1.body = [{ x: 5, y: 14 }];
    this.p1.dir = { x: 1, y: 0 };
    this.p1.nextDir = { x: 1, y: 0 };
    this.p1.isDead = false;
    
    this.p2.body = [{ x: 26, y: 14 }];
    this.p2.dir = { x: -1, y: 0 };
    this.p2.nextDir = { x: -1, y: 0 };
    this.p2.isDead = false;
    
    this.roundState = 'PLAYING';
    this.roundResult = '';
    this.lastTick = performance.now();
  }

  render(ctx) {
    this.clear();
    
    // Header
    ctx.fillStyle = '#fff';
    ctx.font = '24px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText("TRON SNAKE", this.W / 2, 40);
    
    ctx.font = '20px "JetBrains Mono"';
    ctx.fillStyle = this.p1.color;
    ctx.fillText(`P1: ${this.p1.score}`, this.W / 4, 80);
    
    ctx.fillStyle = this.p2.color;
    ctx.fillText(`P2: ${this.p2.score}`, (this.W / 4) * 3, 80);
    
    // Grid Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, this.offsetY, this.cols * this.gridSize, this.rows * this.gridSize);
    
    // Draw Snakes
    const drawSnake = (player) => {
      ctx.fillStyle = player.color;
      for (let i = 0; i < player.body.length; i++) {
        const seg = player.body[i];
        const x = seg.x * this.gridSize;
        const y = this.offsetY + seg.y * this.gridSize;
        
        ctx.fillRect(x, y, this.gridSize - 1, this.gridSize - 1);
        
        // Head highlight
        if (i === 0) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(x + 4, y + 4, this.gridSize - 9, this.gridSize - 9);
          ctx.fillStyle = player.color; // reset for rest of body
        }
      }
    };
    
    drawSnake(this.p1);
    drawSnake(this.p2);
    
    // Round Result
    if (this.roundState === 'ROUND_OVER') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, this.offsetY, this.W, this.H - this.offsetY);
      
      ctx.fillStyle = '#fff';
      ctx.font = '40px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText(this.roundResult, this.W / 2, this.offsetY + (this.rows * this.gridSize) / 2);
    }
    
    // Match Over
    if (this.isOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#10b981';
      ctx.font = '50px "Press Start 2P"';
      ctx.textAlign = 'center';
      if (this.p1.score > this.p2.score) {
        ctx.fillText("P1 WINS MATCH!", this.W / 2, this.H / 2);
      } else {
        ctx.fillText("P2 WINS MATCH!", this.W / 2, this.H / 2);
      }
    }
  }
}
