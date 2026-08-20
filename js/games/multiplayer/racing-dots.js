import { GameBase } from '../../core/game-base.js';

export class MultiplayerRacingDots extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.trackLength = 600; // Finish line is at x = 700, start at 100
    
    this.p1 = { x: 100, y: 300, velocity: 0, lastKey: '', stumbleDelay: 0, color: '#38bdf8' };
    this.p2 = { x: 100, y: 500, velocity: 0, lastKey: '', stumbleDelay: 0, color: '#fb7185' };
    
    this.friction = 50; // slowdown per second
    this.boost = 25; // speed boost per correct tap
    
    this.state = 'COUNTDOWN'; // COUNTDOWN, RACING, FINISHED
    this.countdownTimer = 3.0;
    
    this.winner = 0;
    
    this.setupInput();
  }

  setupInput() {
    this.input.onKeyDown = (e) => {
      if (this.isPaused || this.isOver || this.state !== 'RACING') return;
      
      const key = e.key;
      
      // P1: A -> D alternating
      if (key === 'a' || key === 'A' || key === 'd' || key === 'D') {
        this.processTap(this.p1, key.toUpperCase());
      }
      
      // P2: Left -> Right alternating
      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        const mappedKey = key === 'ArrowLeft' ? 'L' : 'R';
        this.processTap(this.p2, mappedKey);
      }
    };
  }

  processTap(player, key) {
    if (player.stumbleDelay > 0) return; // Stumbled, can't move
    
    if (player.lastKey === key) {
      // Stumble! Pressed the same key twice in a row
      player.stumbleDelay = 1.0;
      player.velocity = 0;
      if (window.Sound) window.Sound.playTone(150, 'sawtooth', 0.2);
    } else {
      // Good tap
      player.velocity += this.boost;
      player.lastKey = key;
      if (window.Sound) window.Sound.playTone(400, 'square', 0.02);
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    
    if (this.state === 'COUNTDOWN') {
      this.countdownTimer -= delta;
      if (this.countdownTimer <= 0) {
        this.state = 'RACING';
        if (window.Sound) window.Sound.playTone(800, 'sine', 0.5);
      } else {
        // Countdown beeps (basic implementation without complex timing checks)
        // Just rely on visuals
      }
      return;
    }
    
    if (this.state === 'RACING') {
      // P1 Update
      if (this.p1.stumbleDelay > 0) {
        this.p1.stumbleDelay -= delta;
      } else {
        this.p1.x += this.p1.velocity * delta;
        this.p1.velocity = Math.max(0, this.p1.velocity - this.friction * delta);
      }
      
      // P2 Update
      if (this.p2.stumbleDelay > 0) {
        this.p2.stumbleDelay -= delta;
      } else {
        this.p2.x += this.p2.velocity * delta;
        this.p2.velocity = Math.max(0, this.p2.velocity - this.friction * delta);
      }
      
      // Check Win
      if (this.p1.x >= 700) {
        this.winner = 1;
        this.endRace();
      } else if (this.p2.x >= 700) {
        this.winner = 2;
        this.endRace();
      }
    }
  }

  endRace() {
    this.state = 'FINISHED';
    this.isOver = true;
    if (window.Sound) window.Sound.playTone(800, 'sine', 1.0);
    setTimeout(() => this.levelComplete(), 3000);
  }

  render(ctx) {
    this.clear();
    
    // Header
    ctx.fillStyle = '#fff';
    ctx.font = '30px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText("RACING DOTS", this.W / 2, 60);
    
    ctx.font = '16px "JetBrains Mono"';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText("Alternate keys to run! Don't double tap!", this.W / 2, 100);
    
    ctx.fillStyle = '#38bdf8';
    ctx.fillText("P1: A -> D", 100, 250);
    
    ctx.fillStyle = '#fb7185';
    ctx.fillText("P2: ◀ -> ▶", 100, 450);
    
    // Track
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(100, 275, 600, 50); // P1 Track
    ctx.fillRect(100, 475, 600, 50); // P2 Track
    
    // Start / Finish lines
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(100, 250); ctx.lineTo(100, 550); ctx.stroke(); // Start
    
    ctx.strokeStyle = '#10b981';
    ctx.beginPath(); ctx.moveTo(700, 250); ctx.lineTo(700, 550); ctx.stroke(); // Finish
    ctx.fillStyle = '#10b981';
    ctx.font = '12px "Press Start 2P"';
    ctx.fillText("FINISH", 700, 240);
    
    // P1 Dot
    ctx.fillStyle = this.p1.stumbleDelay > 0 ? '#ef4444' : this.p1.color;
    ctx.beginPath();
    ctx.arc(this.p1.x, 300, 20, 0, Math.PI * 2);
    ctx.fill();
    
    if (this.p1.stumbleDelay > 0) {
      ctx.fillStyle = '#fff';
      ctx.font = '12px "Press Start 2P"';
      ctx.fillText("STUMBLE!", this.p1.x, 270);
    }
    
    // P2 Dot
    ctx.fillStyle = this.p2.stumbleDelay > 0 ? '#ef4444' : this.p2.color;
    ctx.beginPath();
    ctx.arc(this.p2.x, 500, 20, 0, Math.PI * 2);
    ctx.fill();
    
    if (this.p2.stumbleDelay > 0) {
      ctx.fillStyle = '#fff';
      ctx.font = '12px "Press Start 2P"';
      ctx.fillText("STUMBLE!", this.p2.x, 470);
    }
    
    // Speedometers (just visual text)
    ctx.font = '16px "JetBrains Mono"';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${Math.floor(this.p1.velocity)} MPH`, 750, 300);
    
    ctx.fillStyle = '#fb7185';
    ctx.fillText(`${Math.floor(this.p2.velocity)} MPH`, 750, 500);
    
    // Countdown
    if (this.state === 'COUNTDOWN') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#eab308';
      ctx.font = '100px "Press Start 2P"';
      ctx.fillText(Math.ceil(this.countdownTimer), this.W / 2, this.H / 2);
    }
    
    // Finish
    if (this.state === 'FINISHED') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#10b981';
      ctx.font = '50px "Press Start 2P"';
      ctx.textAlign = 'center';
      if (this.winner === 1) {
        ctx.fillText("P1 WINS!", this.W / 2, this.H / 2);
      } else {
        ctx.fillText("P2 WINS!", this.W / 2, this.H / 2);
      }
    }
  }
}
