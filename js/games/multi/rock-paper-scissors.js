import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const CHOICES = ['rock', 'paper', 'scissors'];
const COLORS  = { rock: '#ff6b6b', paper: '#ff6b6b', scissors: '#ff6b6b' }; // Accent color #ff6b6b

export default class RPSGame extends MultiplayerGameBase {
  static logicalWidth = 600;
  static logicalHeight = 400;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.gameState = {
      phase: 'choosing', // 'choosing' | 'waiting' | 'revealing'
      myChoice: null,
      oppChoice: null,
      round: 1,
      myScore: 0,
      oppScore: 0,
      roundWinner: null,
      animProgress: 0,
      roundHistory: []
    };

    this._btnHover = null;
    this._boundHandlers = {};
  }

  async init() {
    this.bindSocket();
    this.bindInput();

    // Notify server ready
    this.socket.emit('game:client-ready', { code: this.room.code, gameId: 'rock-paper-scissors' });
  }

  bindSocket() {
    const bind = (event, fn) => {
      this._boundHandlers[event] = fn;
      this.socket.on(event, fn);
    };

    bind('rps:choice-received', () => {
      this.gameState.phase = 'waiting';
    });

    bind('rps:result', ({ round, choices, roundWinner, scores, roundHistory }) => {
      const oppId = this.opponent?.socketId;
      this.gameState.oppChoice  = choices[oppId]  || null;
      this.gameState.myChoice   = choices[this.mySocketId] || null;
      this.gameState.roundWinner = roundWinner;

      this.gameState.myScore  = scores[this.mySocketId]  || 0;
      this.gameState.oppScore = scores[oppId] || 0;
      this.gameState.roundHistory = roundHistory || [];

      // Update scores in container
      if (this.container) {
        this.container.updateScore(this.gameState.myScore);
        this.container.updateOpponentScore(this.gameState.oppScore);
      }

      this.gameState.phase = 'revealing';
      this.gameState.animProgress = 0;
    });

    bind('rps:next-round', ({ round }) => {
      this.gameState.round    = round;
      this.gameState.phase    = 'choosing';
      this.gameState.myChoice = null;
      this.gameState.oppChoice= null;
      this.gameState.roundWinner = null;
    });
  }

  bindInput() {
    this._onClick = (e) => {
      if (this.gameState.phase !== 'choosing') return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (RPSGame.logicalWidth / rect.width);
      
      // Divide canvas into 3 equal vertical thirds
      const zoneWidth = RPSGame.logicalWidth / 3;
      let choice = 'rock';
      if (mx >= zoneWidth && mx < zoneWidth * 2) choice = 'paper';
      else if (mx >= zoneWidth * 2) choice = 'scissors';

      this.gameState.myChoice = choice;
      this.gameState.phase    = 'waiting';
      
      if (this.container) {
        this.container.audio.play('coin');
      }
      this.socket.emit('rps:choose', { code: this.room.code, choice });
    };

    this._onMove = (e) => {
      if (this.gameState.phase !== 'choosing') {
        this._btnHover = null;
        this.canvas.style.cursor = 'default';
        return;
      }
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (RPSGame.logicalWidth / rect.width);
      
      const zoneWidth = RPSGame.logicalWidth / 3;
      if (mx < zoneWidth) this._btnHover = 'rock';
      else if (mx < zoneWidth * 2) this._btnHover = 'paper';
      else this._btnHover = 'scissors';

      this.canvas.style.cursor = 'pointer';
    };

    this.canvas.addEventListener('click', this._onClick);
    this.canvas.addEventListener('mousemove', this._onMove);
  }

  update(dt) {
    if (this.gameState.phase === 'revealing') {
      this.gameState.animProgress = Math.min(1, this.gameState.animProgress + 3.33 * dt); // slide in 300ms (1 / 0.3 = 3.33)
    }
  }

  render(ctx) {
    const cw = RPSGame.logicalWidth;
    const ch = RPSGame.logicalHeight;

    // Draw dark background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, cw, ch);

    if (this.gameState.phase === 'choosing') {
      this._renderChoosing(ctx, cw, ch);
    } else if (this.gameState.phase === 'waiting') {
      this._renderWaiting(ctx, cw, ch);
    } else if (this.gameState.phase === 'revealing') {
      this._renderRevealing(ctx, cw, ch);
    }

    // Render round history dots at the bottom
    this._renderHistoryDots(ctx, cw, ch);
  }

  _renderChoosing(ctx, cw, ch) {
    const zoneW = cw / 3;

    CHOICES.forEach((choice, idx) => {
      const isHover = this._btnHover === choice;
      const x = idx * zoneW;
      
      ctx.save();
      // Hover background slightly brightens
      ctx.fillStyle = isHover ? 'rgba(255, 107, 107, 0.08)' : '#111118';
      
      // Draw rounded rectangle
      this._drawRoundedRect(ctx, x + 8, 40, zoneW - 16, 280, 12);
      ctx.fill();
      
      ctx.strokeStyle = isHover ? '#ff6b6b' : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = isHover ? 2.5 : 1;
      ctx.stroke();

      // Render shape
      ctx.strokeStyle = isHover ? '#ffffff' : 'rgba(255,255,255,0.3)';
      ctx.fillStyle = isHover ? '#ff6b6b' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 3;
      this._drawChoiceShape(ctx, choice, x + zoneW / 2, 170);

      // Label
      ctx.font = "bold 13px 'DM Sans', sans-serif";
      ctx.fillStyle = isHover ? '#ffffff' : 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center';
      ctx.fillText(choice.toUpperCase(), x + zoneW / 2, 270);
      ctx.restore();
    });
  }

  _renderWaiting(ctx, cw, ch) {
    const zoneW = cw / 3;

    CHOICES.forEach((choice, idx) => {
      const isChosen = this.gameState.myChoice === choice;
      const x = idx * zoneW;
      
      ctx.save();
      // Chosen highlights in accent, others dim to 20% opacity
      ctx.globalAlpha = isChosen ? 1.0 : 0.2;
      ctx.fillStyle = isChosen ? 'rgba(255, 107, 107, 0.12)' : '#111118';
      this._drawRoundedRect(ctx, x + 8, 40, zoneW - 16, 280, 12);
      ctx.fill();
      ctx.strokeStyle = isChosen ? '#ff6b6b' : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = isChosen ? 2.5 : 1;
      ctx.stroke();

      ctx.strokeStyle = isChosen ? '#ffffff' : 'rgba(255,255,255,0.3)';
      ctx.fillStyle = isChosen ? '#ff6b6b' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 3;
      this._drawChoiceShape(ctx, choice, x + zoneW / 2, 170);

      ctx.font = "bold 13px 'DM Sans', sans-serif";
      ctx.fillStyle = isChosen ? '#ffffff' : 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center';
      ctx.fillText(choice.toUpperCase(), x + zoneW / 2, 270);
      ctx.restore();
    });

    // "Waiting for opponent..." text center canvas after selection
    ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
    ctx.fillRect(0, 0, cw, ch);

    const dotCount = Math.floor(Date.now() / 300) % 4;
    const dots = '.'.repeat(dotCount);
    
    ctx.font = "bold 14px 'Press Start 2P', monospace";
    ctx.fillStyle = '#ff6b6b';
    ctx.textAlign = 'center';
    ctx.fillText(`WAITING FOR OPPONENT${dots}`, cw / 2, ch / 2 - 10);
  }

  _renderRevealing(ctx, cw, ch) {
    const p = this.gameState.animProgress;
    const easeOut = 1 - Math.pow(1 - p, 4);

    const myChoice  = this.gameState.myChoice;
    const oppChoice = this.gameState.oppChoice;
    if (!myChoice || !oppChoice) return;

    const bw = 150, bh = 180;
    const cy = ch * 0.45;

    // Slide in from edges
    const myX = -bw + easeOut * (cw / 2 - bw - 20 + bw);
    const oppX = cw - easeOut * (cw / 2 - bw - 20 + bw);

    this._drawRevealCard(ctx, myChoice, myX, cy - bh / 2, bw, bh, 'YOU');
    this._drawRevealCard(ctx, oppChoice, oppX, cy - bh / 2, bw, bh, this.getOpponentName().toUpperCase());

    if (p >= 1.0) {
      const rw = this.gameState.roundWinner;
      const isDraw = rw === null;
      const isMe = rw === this.mySocketId;
      
      const text = isDraw ? 'DRAW' : isMe ? 'YOU WIN' : 'YOU LOSE';
      const col  = isDraw ? '#ffffff' : isMe ? '#ff6b6b' : '#ff7675';

      ctx.font = 'bold 26px "Press Start 2P", monospace';
      ctx.fillStyle = col;
      ctx.textAlign = 'center';
      ctx.fillText(text, cw / 2, cy - bh / 2 - 25);
    }
  }

  _drawRevealCard(ctx, choice, x, y, w, h, label) {
    ctx.save();
    ctx.fillStyle = '#111118';
    this._drawRoundedRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Choice Shape inside reveal cards
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ff6b6b';
    ctx.lineWidth = 3;
    this._drawChoiceShape(ctx, choice, x + w / 2, y + h / 2 - 15);

    ctx.font = "bold 11px 'DM Sans', sans-serif";
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h - 20);
    ctx.restore();
  }

  _drawChoiceShape(ctx, choice, x, y) {
    if (choice === 'rock') {
      // Rock closed fist silhouette
      ctx.beginPath();
      ctx.moveTo(x - 22, y + 22);
      ctx.lineTo(x - 22, y - 6);
      ctx.bezierCurveTo(x - 22, y - 18, x - 12, y - 22, x - 4, y - 18);
      ctx.bezierCurveTo(x + 2, y - 22, x + 12, y - 22, x + 18, y - 16);
      ctx.lineTo(x + 22, y - 4);
      ctx.lineTo(x + 22, y + 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (choice === 'paper') {
      // Paper flat hand with 5 finger lines
      ctx.beginPath();
      ctx.arc(x, y + 8, 20, 0, Math.PI, false);
      ctx.lineTo(x - 20, y + 24);
      ctx.lineTo(x + 20, y + 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      for (let i = -2; i <= 2; i++) {
        const fx = x + i * 8;
        const fy = y - 26 + Math.abs(i) * 3;
        ctx.beginPath();
        ctx.moveTo(fx, y + 8);
        ctx.lineTo(fx, fy);
        ctx.stroke();
      }
    } else if (choice === 'scissors') {
      // Scissors V shape formed by two elongated ovals
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 6);
      ctx.beginPath();
      ctx.ellipse(-10, -5, 6, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.ellipse(10, -5, 6, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // rivet
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y + 4, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawRoundedRect(ctx, x, y, w, h, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  _renderHistoryDots(ctx, cw, ch) {
    const history = this.gameState.roundHistory;
    const startX = cw / 2 - (history.length * 16) / 2;
    const dotY = ch - 30;

    history.forEach((h, idx) => {
      const isWinner = h.winner === this.mySocketId;
      const isOppWinner = h.winner && h.winner !== this.mySocketId;

      ctx.fillStyle = isWinner ? '#ff6b6b' : isOppWinner ? 'rgba(255, 255, 255, 0.15)' : '#ffffff';
      ctx.beginPath();
      ctx.arc(startX + idx * 16 + 8, dotY, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  destroy() {
    this.canvas.removeEventListener('click', this._onClick);
    this.canvas.removeEventListener('mousemove', this._onMove);
    for (const [event, fn] of Object.entries(this._boundHandlers)) {
      this.socket.off(event, fn);
    }
    super.destroy();
  }
}
