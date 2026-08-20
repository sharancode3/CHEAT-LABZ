import { GameBase } from '../../core/game-base.js';

export class MultiplayerTugOfWar extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    // 0 is center, -400 is P1 win, 400 is P2 win
    this.ropePosition = 0; 
    
    this.p1Score = 0;
    this.p2Score = 0;
    
    // Stamina system to prevent infinite macro mashing
    this.p1Stamina = 100;
    this.p2Stamina = 100;
    
    // Recent pull rates (keys per second)
    this.p1Pulls = [];
    this.p2Pulls = [];
    
    this.roundState = 'PLAYING';
    this.roundDelay = 0;
    this.roundResult = '';
    
    this.setupInput();
  }

  setupInput() {
    this.input.onKeyDown = (e) => {
      if (this.isPaused || this.isOver || this.roundState !== 'PLAYING') return;
      
      const now = performance.now();
      
      // P1 (D) pulls rope Left (negative)
      if (e.key === 'd' || e.key === 'D') {
        this.p1Pulls.push(now);
        this.processPull(1);
      }
      
      // P2 (Left Arrow) pulls rope Right (positive)
      if (e.key === 'ArrowLeft') {
        this.p2Pulls.push(now);
        this.processPull(2);
      }
    };
  }

  processPull(player) {
    // If stamina is 0, pulls do almost nothing
    let strength = 5;
    
    if (player === 1) {
      if (this.p1Stamina > 0) {
        this.ropePosition -= strength;
        this.p1Stamina -= 2; // costs 2 stamina per pull
      } else {
        this.ropePosition -= strength * 0.1; // Exhausted pull
      }
      if (window.Sound) window.Sound.playTone(200, 'square', 0.05);
    } else {
      if (this.p2Stamina > 0) {
        this.ropePosition += strength;
        this.p2Stamina -= 2;
      } else {
        this.ropePosition += strength * 0.1;
      }
      if (window.Sound) window.Sound.playTone(300, 'square', 0.05);
    }
    
    this.checkWin();
  }

  checkWin() {
    if (this.ropePosition <= -350) {
      this.handleRoundEnd(1);
    } else if (this.ropePosition >= 350) {
      this.handleRoundEnd(2);
    }
  }

  handleRoundEnd(winner) {
    this.roundState = 'ROUND_OVER';
    this.roundDelay = 3.0;
    
    if (winner === 1) {
      this.p1Score++;
      this.roundResult = "P1 PULLS IT!";
    } else {
      this.p2Score++;
      this.roundResult = "P2 PULLS IT!";
    }
    
    if (window.Sound) window.Sound.playTone(800, 'sine', 0.5);
    
    if (this.p1Score >= 3 || this.p2Score >= 3) {
      this.isOver = true;
      setTimeout(() => this.levelComplete(), 3000);
    }
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
    
    const now = performance.now();
    
    // Clean up old pulls (older than 1 second)
    this.p1Pulls = this.p1Pulls.filter(t => now - t < 1000);
    this.p2Pulls = this.p2Pulls.filter(t => now - t < 1000);
    
    // Stamina Regeneration (if not pulling too fast)
    // If you pull > 8 times a second, you don't regen.
    // If you pull < 5 times a second, you regen fast.
    
    if (this.p1Pulls.length < 5) {
      this.p1Stamina = Math.min(100, this.p1Stamina + 20 * delta);
    } else if (this.p1Pulls.length > 8) {
      // Over-mashing penalty
      this.p1Stamina = Math.max(0, this.p1Stamina - 10 * delta);
    }
    
    if (this.p2Pulls.length < 5) {
      this.p2Stamina = Math.min(100, this.p2Stamina + 20 * delta);
    } else if (this.p2Pulls.length > 8) {
      this.p2Stamina = Math.max(0, this.p2Stamina - 10 * delta);
    }
    
    // Slowly pull rope towards center if no one is pulling
    if (this.ropePosition > 0) {
      this.ropePosition = Math.max(0, this.ropePosition - 5 * delta);
    } else if (this.ropePosition < 0) {
      this.ropePosition = Math.min(0, this.ropePosition + 5 * delta);
    }
  }

  resetRound() {
    this.ropePosition = 0;
    this.p1Stamina = 100;
    this.p2Stamina = 100;
    this.p1Pulls = [];
    this.p2Pulls = [];
    this.roundState = 'PLAYING';
    this.roundResult = '';
  }

  render(ctx) {
    this.clear();
    
    // Header
    ctx.fillStyle = '#fff';
    ctx.font = '30px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText("TUG OF WAR", this.W / 2, 60);
    
    ctx.font = '24px "JetBrains Mono"';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText(`P1 (Mash D): ${this.p1Score}`, 20, 120);
    
    ctx.fillStyle = '#fb7185';
    ctx.textAlign = 'right';
    ctx.fillText(`P2 (Mash ◀): ${this.p2Score}`, this.W - 20, 120);
    
    // Stamina Bars
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(20, 150, 200, 20); // P1 back
    ctx.fillRect(this.W - 220, 150, 200, 20); // P2 back
    
    ctx.fillStyle = this.p1Stamina > 20 ? '#10b981' : '#ef4444';
    ctx.fillRect(20, 150, 200 * (this.p1Stamina / 100), 20);
    
    ctx.fillStyle = this.p2Stamina > 20 ? '#10b981' : '#ef4444';
    ctx.fillRect(this.W - 220, 150, 200 * (this.p2Stamina / 100), 20);
    
    ctx.fillStyle = '#fff';
    ctx.font = '14px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText("STAMINA", 120, 190);
    ctx.fillText("STAMINA", this.W - 120, 190);
    
    // Playing Field
    const centerY = this.H / 2 + 100;
    const ropeWidth = 10;
    
    // Mud pit (Center)
    ctx.fillStyle = '#78350f';
    ctx.fillRect(this.W / 2 - 50, centerY - 60, 100, 120);
    
    // Win Lines
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(this.W / 2 - 350, centerY - 100); ctx.lineTo(this.W / 2 - 350, centerY + 100); ctx.stroke();
    
    ctx.strokeStyle = '#fb7185';
    ctx.beginPath(); ctx.moveTo(this.W / 2 + 350, centerY - 100); ctx.lineTo(this.W / 2 + 350, centerY + 100); ctx.stroke();
    
    // Rope
    ctx.fillStyle = '#d4d4d8';
    ctx.fillRect(0, centerY - ropeWidth/2, this.W, ropeWidth);
    
    // Center Marker on Rope
    const markerX = this.W / 2 + this.ropePosition;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(markerX - 10, centerY - 20, 20, 40);
    
    // Pullers (Visual representation)
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(markerX - 150 - 20, centerY - 30, 40, 60); // P1 Anchor
    
    ctx.fillStyle = '#fb7185';
    ctx.fillRect(markerX + 150 - 20, centerY - 30, 40, 60); // P2 Anchor
    
    if (this.roundState === 'ROUND_OVER') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#fff';
      ctx.font = '40px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText(this.roundResult, this.W / 2, this.H / 2);
    }
    
    if (this.isOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#10b981';
      ctx.font = '50px "Press Start 2P"';
      ctx.textAlign = 'center';
      if (this.p1Score > this.p2Score) {
        ctx.fillText("P1 WINS MATCH!", this.W / 2, this.H / 2);
      } else {
        ctx.fillText("P2 WINS MATCH!", this.W / 2, this.H / 2);
      }
    }
  }
}
