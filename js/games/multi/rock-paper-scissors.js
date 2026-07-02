import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const CHOICES = ['rock', 'paper', 'scissors'];
const EMOJIS  = { rock: '✊', paper: '🖐', scissors: '✌️' };
const COLORS  = { rock: '#EF4444', paper: '#6c63ff', scissors: '#00d4aa' };

export default class RPSGame extends MultiplayerGameBase {
  static logicalWidth = 600;
  static logicalHeight = 600;

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

    bind('rps:result', ({ round, choices, roundWinner, scores }) => {
      const oppId = this.opponent?.socketId;
      this.gameState.oppChoice  = choices[oppId]  || null;
      this.gameState.myChoice   = choices[this.mySocketId] || null;
      this.gameState.roundWinner = roundWinner;

      this.gameState.myScore  = scores[this.mySocketId]  || 0;
      this.gameState.oppScore = scores[oppId] || 0;

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
      this.gameState.animProgress = Math.min(1, this.gameState.animProgress + 2.5 * dt);
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
  }

  _renderChoosing(ctx, cw, ch) {
    const zoneW = cw / 3;

    CHOICES.forEach((choice, idx) => {
      const isHover = this._btnHover === choice;
      const x = idx * zoneW;
      
      ctx.fillStyle = isHover ? 'rgba(255, 255, 255, 0.04)' : '#111118';
      ctx.fillRect(x + 4, 100, zoneW - 8, 400);
      
      ctx.strokeStyle = isHover ? COLORS[choice] : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = isHover ? 2.5 : 1;
      ctx.strokeRect(x + 4, 100, zoneW - 8, 400);

      // Emoji
      ctx.font = '72px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(EMOJIS[choice], x + zoneW / 2, 300);

      // Label
      ctx.font = '12px JetBrains Mono';
      ctx.fillStyle = isHover ? '#ffffff' : 'rgba(255,255,255,0.4)';
      ctx.fillText(choice.toUpperCase(), x + zoneW / 2, 450);
    });
  }

  _renderWaiting(ctx, cw, ch) {
    // Grey out the canvas
    ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
    ctx.fillRect(0, 0, cw, ch);

    // Waiting dot animation
    const dotCount = Math.floor(Date.now() / 300) % 4;
    const dots = '.'.repeat(dotCount);
    
    ctx.font = '14px DM Sans';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`WAITING FOR OPPONENT${dots}`, cw / 2, ch / 2);
  }

  _renderRevealing(ctx, cw, ch) {
    const p = this.gameState.animProgress;
    const easeOut = 1 - Math.pow(1 - p, 4);

    const myChoice  = this.gameState.myChoice;
    const oppChoice = this.gameState.oppChoice;
    if (!myChoice || !oppChoice) return;

    const bw = 140, bh = 140;
    const cy = ch * 0.45;

    const myX = -bw + easeOut * (cw / 2 - bw - 20 + bw);
    const oppX = cw - easeOut * (cw / 2 - bw - 20 + bw);

    this._drawRevealCard(ctx, myChoice, myX, cy - bh / 2, bw, bh, 'YOU');
    this._drawRevealCard(ctx, oppChoice, oppX, cy - bh / 2, bw, bh, this.getOpponentName().toUpperCase());

    if (p > 0.85) {
      const rw = this.gameState.roundWinner;
      const isDraw = rw === null;
      const isMe = rw === this.mySocketId;
      
      const text = isDraw ? 'DRAW' : isMe ? 'YOU WIN' : 'THEY WIN';
      const col  = isDraw ? '#F59E0B' : isMe ? '#10b981' : '#EF4444';

      ctx.font = 'bold 24px "Press Start 2P", monospace';
      ctx.fillStyle = col;
      ctx.fillText(text, cw / 2, cy - bh / 2 - 35);
    }
  }

  _drawRevealCard(ctx, choice, x, y, w, h, label) {
    const color = COLORS[choice];
    ctx.fillStyle = '#111118';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.font = '54px sans-serif';
    ctx.fillText(EMOJIS[choice], x + w / 2, y + h / 2 - 10);

    ctx.font = '10px JetBrains Mono';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(label, x + w / 2, y + h - 18);
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
