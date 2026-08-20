import { GameBase } from '../../core/game-base.js';

export class MultiplayerRPS extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.hpP1 = 5;
    this.hpP2 = 5;
    
    this.p1Choice = -1; // 0=Rock, 1=Paper, 2=Scissors
    this.p2Choice = -1;
    
    this.tieDamagePot = 1; // Starts at 1, increases on ties
    
    this.roundState = 'WAITING'; // WAITING, REVEAL
    this.revealTimer = 0;
    
    this.roundResult = '';
    
    this.setupInput();
  }

  setupInput() {
    this.input.onKeyDown = (e) => {
      if (this.isPaused || this.isOver || this.roundState !== 'WAITING') return;
      
      const key = e.key.toUpperCase();
      
      // P1: A/S/D
      if (this.p1Choice === -1) {
        if (key === 'A') this.p1Choice = 0;
        if (key === 'S') this.p1Choice = 1;
        if (key === 'D') this.p1Choice = 2;
        if (this.p1Choice !== -1 && window.Sound) window.Sound.playTone(400, 'square', 0.05);
      }
      
      // P2: J/K/L
      if (this.p2Choice === -1) {
        if (key === 'J') this.p2Choice = 0;
        if (key === 'K') this.p2Choice = 1;
        if (key === 'L') this.p2Choice = 2;
        if (this.p2Choice !== -1 && window.Sound) window.Sound.playTone(600, 'square', 0.05);
      }
      
      if (this.p1Choice !== -1 && this.p2Choice !== -1) {
        this.resolveClash();
      }
    };
  }

  resolveClash() {
    this.roundState = 'REVEAL';
    this.revealTimer = 2.5; // Show result for 2.5 seconds
    
    // 0=Rock, 1=Paper, 2=Scissors
    if (this.p1Choice === this.p2Choice) {
      this.roundResult = 'TIE';
      this.tieDamagePot++;
      if (window.Sound) window.Sound.playTone(200, 'sawtooth', 0.3);
    } else if (
      (this.p1Choice === 0 && this.p2Choice === 2) || // Rock beats Scissors
      (this.p1Choice === 1 && this.p2Choice === 0) || // Paper beats Rock
      (this.p1Choice === 2 && this.p2Choice === 1)    // Scissors beats Paper
    ) {
      this.roundResult = 'P1 WINS ROUND';
      this.hpP2 -= this.tieDamagePot;
      this.tieDamagePot = 1;
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.3);
    } else {
      this.roundResult = 'P2 WINS ROUND';
      this.hpP1 -= this.tieDamagePot;
      this.tieDamagePot = 1;
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.3);
    }
    
    if (this.hpP1 <= 0 || this.hpP2 <= 0) {
      this.isOver = true;
      setTimeout(() => this.levelComplete(), 3000);
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    
    if (this.roundState === 'REVEAL') {
      this.revealTimer -= delta;
      if (this.revealTimer <= 0) {
        this.roundState = 'WAITING';
        this.p1Choice = -1;
        this.p2Choice = -1;
        this.roundResult = '';
      }
    }
  }

  getIcon(choice) {
    if (choice === 0) return 'ROCK';
    if (choice === 1) return 'PAPER';
    if (choice === 2) return 'SCISSORS';
    return '';
  }

  render(ctx) {
    this.clear();
    
    // Header
    ctx.fillStyle = '#fff';
    ctx.font = '30px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText("BLIND CLASH", this.W / 2, 60);
    
    ctx.font = '20px "JetBrains Mono"';
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`TIE DAMAGE POT: ${this.tieDamagePot}x`, this.W / 2, 100);
    
    // HP Bars
    const hpMax = 5;
    const barW = 250;
    
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(50, 150, barW, 20);
    ctx.fillRect(this.W - barW - 50, 150, barW, 20);
    
    ctx.fillStyle = '#38bdf8'; // P1
    ctx.fillRect(50, 150, barW * (Math.max(0, this.hpP1) / hpMax), 20);
    
    ctx.fillStyle = '#fb7185'; // P2
    ctx.fillRect(this.W - barW - 50, 150, barW * (Math.max(0, this.hpP2) / hpMax), 20);
    
    // Player Labels
    ctx.font = '24px "Press Start 2P"';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText("P1", 50, 200);
    
    ctx.fillStyle = '#fb7185';
    ctx.textAlign = 'right';
    ctx.fillText("P2", this.W - 50, 200);
    
    // Controls Info
    if (this.roundState === 'WAITING') {
      ctx.font = '16px "JetBrains Mono"';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'center';
      
      ctx.fillText("A: Rock | S: Paper | D: Scissors", this.W / 4, 300);
      ctx.fillText("J: Rock | K: Paper | L: Scissors", (this.W / 4) * 3, 300);
    }
    
    // Choices Area
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '40px "Press Start 2P"';
    
    const midY = 450;
    
    if (this.roundState === 'WAITING') {
      ctx.fillStyle = this.p1Choice === -1 ? '#334155' : '#10b981';
      ctx.fillText(this.p1Choice === -1 ? "WAITING" : "READY", this.W / 4, midY);
      
      ctx.fillStyle = this.p2Choice === -1 ? '#334155' : '#10b981';
      ctx.fillText(this.p2Choice === -1 ? "WAITING" : "READY", (this.W / 4) * 3, midY);
      
    } else if (this.roundState === 'REVEAL') {
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(this.getIcon(this.p1Choice), this.W / 4, midY);
      
      ctx.fillStyle = '#fff';
      ctx.fillText("VS", this.W / 2, midY);
      
      ctx.fillStyle = '#fb7185';
      ctx.fillText(this.getIcon(this.p2Choice), (this.W / 4) * 3, midY);
      
      // Result
      ctx.fillStyle = '#eab308';
      ctx.fillText(this.roundResult, this.W / 2, midY + 100);
    }
    
    // Match Over
    if (this.isOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#10b981';
      ctx.font = '50px "Press Start 2P"';
      ctx.textAlign = 'center';
      if (this.hpP1 <= 0 && this.hpP2 <= 0) {
        ctx.fillText("DRAW MATCH!", this.W / 2, this.H / 2);
      } else if (this.hpP1 <= 0) {
        ctx.fillText("P2 WINS MATCH!", this.W / 2, this.H / 2);
      } else {
        ctx.fillText("P1 WINS MATCH!", this.W / 2, this.H / 2);
      }
    }
  }
}
