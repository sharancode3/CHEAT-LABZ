import { GameBase } from '../../core/game-base.js';

export class RockPaperScissors extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.scoreP1 = 0;
    this.scoreP2 = 0;
    
    this.roundState = 'WAITING'; // WAITING, REVEALING, ROUND_OVER, MATCH_OVER
    this.stateTimer = 0;
    
    // Markov Chain transition matrix for AI: T[prevMove][nextMove]
    // Initialize with 1s to prevent zero probabilities
    this.transitionMatrix = [
      [1, 1, 1], // Prev Rock
      [1, 1, 1], // Prev Paper
      [1, 1, 1]  // Prev Scissors
    ];
    this.lastPlayerMove = null;

    this.playerMove = null;
    this.aiMove = null;
    this.roundWinner = null;
    this.matchWinner = null;

    this.setupInput();
  }

  setupInput() {
    this.input.onKeyDown = (key) => {
      if (this.isPaused || this.isOver || this.roundState !== 'WAITING') return;

      let move = -1;
      if (key === 'A' || key === '1') move = 0; // Rock
      if (key === 'S' || key === '2') move = 1; // Paper
      if (key === 'D' || key === '3') move = 2; // Scissors

      if (move !== -1) {
        this.playerMove = move;
        this.makeAIMove();
        this.resolveRound();
      }
    };
  }

  makeAIMove() {
    if (this.lastPlayerMove === null) {
      this.aiMove = this.rand(0, 2);
    } else {
      // Predict next player move based on markov chain
      const row = this.transitionMatrix[this.lastPlayerMove];
      const sum = row[0] + row[1] + row[2];
      
      let predictedMove = 0;
      let randVal = Math.random() * sum;
      
      if (randVal < row[0]) {
        predictedMove = 0;
      } else if (randVal < row[0] + row[1]) {
        predictedMove = 1;
      } else {
        predictedMove = 2;
      }
      
      // AI chooses the counter move to the predicted move
      this.aiMove = (predictedMove + 1) % 3;
    }
  }

  resolveRound() {
    // Result logic
    const result = (this.playerMove - this.aiMove + 3) % 3;
    
    if (result === 0) {
      this.roundWinner = 0; // Tie
    } else if (result === 1) {
      this.roundWinner = 1; // Player Wins
      this.scoreP1++;
    } else if (result === 2) {
      this.roundWinner = 2; // AI Wins
      this.scoreP2++;
    }

    // Update Markov Chain
    if (this.lastPlayerMove !== null) {
      this.transitionMatrix[this.lastPlayerMove][this.playerMove]++;
    }
    this.lastPlayerMove = this.playerMove;

    if (window.Sound) {
      if (this.roundWinner === 1) window.Sound.playTone(500, 'sine', 0.1);
      else if (this.roundWinner === 2) window.Sound.playTone(200, 'sawtooth', 0.1);
      else window.Sound.playTone(300, 'square', 0.1);
    }

    this.roundState = 'REVEALING';
    this.stateTimer = 1.0; // 1 second reveal delay
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    if (this.roundState === 'REVEALING') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        this.roundState = 'ROUND_OVER';
        this.stateTimer = 1.5; // 1.5 seconds round over message
        
        if (this.scoreP1 >= 3 || this.scoreP2 >= 3) {
          this.matchWinner = this.scoreP1 >= 3 ? 1 : 2;
        }
      }
    } else if (this.roundState === 'ROUND_OVER') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        if (this.matchWinner !== null) {
          if (this.matchWinner === 1) {
            this.score += 1000;
            this.levelComplete(); // Advance level if player wins match
          } else {
            this.lives -= 1; // Lose a life if match is lost
            if (this.lives > 0) {
              this.resetMatch();
            }
          }
        } else {
          // Next round
          this.playerMove = null;
          this.aiMove = null;
          this.roundWinner = null;
          this.roundState = 'WAITING';
        }
      }
    }
  }

  resetMatch() {
    this.scoreP1 = 0;
    this.scoreP2 = 0;
    this.playerMove = null;
    this.aiMove = null;
    this.roundWinner = null;
    this.matchWinner = null;
    this.roundState = 'WAITING';
  }

  drawIcon(ctx, move, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 4;
    
    if (move === 0) { // Rock (Hexagon)
      ctx.strokeStyle = '#facc15';
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        const px = Math.cos(angle) * size;
        const py = Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (move === 1) { // Paper (Square)
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.rect(-size * 0.8, -size * 0.8, size * 1.6, size * 1.6);
      ctx.stroke();
    } else if (move === 2) { // Scissors (Triangle)
      ctx.strokeStyle = '#fb7185';
      ctx.shadowColor = '#fb7185';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size, size * 0.8);
      ctx.lineTo(-size, size * 0.8);
      ctx.closePath();
      ctx.stroke();
    }
    
    ctx.restore();
  }

  render(ctx) {
    this.clear();
    
    // Draw scores
    ctx.fillStyle = '#fff';
    ctx.font = '24px "JetBrains Mono"';
    ctx.textAlign = 'center';
    
    ctx.fillText(`YOU: ${this.scoreP1}`, this.W / 4, 100);
    ctx.fillText(`AI: ${this.scoreP2}`, (this.W / 4) * 3, 100);
    
    ctx.font = '16px "JetBrains Mono"';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText("BEST OF 5 (FIRST TO 3)", this.W / 2, 60);

    const midY = this.H / 2;

    // Draw moves
    if (this.roundState === 'WAITING') {
      ctx.fillStyle = '#facc15';
      ctx.font = '20px "Press Start 2P"';
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 10;
      ctx.fillText("A/1 = ROCK", this.W / 2, midY - 60);
      
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.fillText("S/2 = PAPER", this.W / 2, midY);
      
      ctx.fillStyle = '#fb7185';
      ctx.shadowColor = '#fb7185';
      ctx.fillText("D/3 = SCISSORS", this.W / 2, midY + 60);
      ctx.shadowBlur = 0;
    } else if (this.roundState === 'REVEALING' || this.roundState === 'ROUND_OVER') {
      // Draw Player Move
      this.drawIcon(ctx, this.playerMove, this.W / 4, midY, 60);
      
      // Draw AI Move
      this.drawIcon(ctx, this.aiMove, (this.W / 4) * 3, midY, 60);
      
      ctx.fillStyle = '#fff';
      ctx.font = '30px "JetBrains Mono"';
      ctx.fillText("VS", this.W / 2, midY + 10);
      
      if (this.roundState === 'ROUND_OVER') {
        ctx.font = '36px "Press Start 2P"';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 15;
        
        if (this.matchWinner !== null) {
          if (this.matchWinner === 1) {
            ctx.fillStyle = '#00ff00';
            ctx.fillText("MATCH WIN!", this.W / 2, midY + 150);
          } else {
            ctx.fillStyle = '#ff0000';
            ctx.fillText("MATCH LOST!", this.W / 2, midY + 150);
          }
        } else {
          if (this.roundWinner === 1) {
            ctx.fillStyle = '#facc15';
            ctx.fillText("YOU WON ROUND", this.W / 2, midY + 150);
          } else if (this.roundWinner === 2) {
            ctx.fillStyle = '#ff4444';
            ctx.fillText("AI WON ROUND", this.W / 2, midY + 150);
          } else {
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText("DRAW", this.W / 2, midY + 150);
          }
        }
        ctx.shadowBlur = 0;
      }
    }
  }
}
