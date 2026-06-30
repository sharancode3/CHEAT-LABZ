import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const CHOICES = ['rock', 'paper', 'scissors'];
const BEATS   = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
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

    this.buttons = [];
    this._btnHover = null;
    this._boundHandlers = {};
  }

  async init() {
    this._buildButtons();
    this.bindSocket();
    this.bindInput();

    // Notify server ready
    this.socket.emit('game:client-ready', { code: this.room.code, gameId: 'rock-paper-scissors' });
  }

  start() {
    // Handled by container
  }

  _buildButtons() {
    const cw = RPSGame.logicalWidth;
    const ch = RPSGame.logicalHeight;
    const bw = 150, bh = 150;
    const y  = ch * 0.45 - bh / 2;
    const gap = (cw - bw * 3) / 4;

    this.buttons = CHOICES.map((choice, i) => ({
      choice,
      x: gap + i * (bw + gap),
      y, w: bw, h: bh,
    }));
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
      const my = (e.clientY - rect.top)  * (RPSGame.logicalHeight / rect.height);

      for (const btn of this.buttons) {
        if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
          this.gameState.myChoice = btn.choice;
          this.gameState.phase    = 'waiting';
          if (this.container) {
            this.container.audio.play('coin');
          }
          this.socket.emit('rps:choose', { code: this.room.code, choice: btn.choice });
          break;
        }
      }
    };

    this._onMove = (e) => {
      if (this.gameState.phase !== 'choosing') {
        this._btnHover = null;
        this.canvas.style.cursor = 'default';
        return;
      }
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (RPSGame.logicalWidth / rect.width);
      const my = (e.clientY - rect.top)  * (RPSGame.logicalHeight / rect.height);
      
      this._btnHover = null;
      for (const btn of this.buttons) {
        if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
          this._btnHover = btn.choice;
          break;
        }
      }
      this.canvas.style.cursor = this._btnHover ? 'pointer' : 'default';
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

    // Draw dark radial gradient background
    const grad = ctx.createRadialGradient(cw / 2, ch / 2, 50, cw / 2, ch / 2, cw / 1.5);
    grad.addColorStop(0, '#0d0d18');
    grad.addColorStop(1, '#05050a');
    ctx.fillStyle = grad;
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
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '700 13px "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MAKE YOUR CHOICE', cw / 2, ch * 0.22);

    for (const btn of this.buttons) {
      const hover = this._btnHover === btn.choice;
      const color = COLORS[btn.choice];

      // Subtle drop shadow for hover card
      if (hover) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 16);
      ctx.fillStyle = hover ? 'rgba(255, 255, 255, 0.05)' : 'rgba(20, 20, 30, 0.6)';
      ctx.fill();

      ctx.shadowBlur = 0; // reset shadow
      ctx.strokeStyle = hover ? color : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = hover ? 2.5 : 1.5;
      ctx.stroke();

      // Top colored bar decoration
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, 5, [16, 16, 0, 0]);
      ctx.fillStyle = color;
      ctx.fill();

      // Emoji
      ctx.font = `${hover ? 70 : 60}px sans-serif`;
      ctx.fillText(EMOJIS[btn.choice], btn.x + btn.w / 2, btn.y + btn.h / 2 - 10);

      // Card Label
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillStyle = hover ? '#fff' : 'rgba(255, 255, 255, 0.5)';
      ctx.fillText(btn.choice.toUpperCase(), btn.x + btn.w / 2, btn.y + btn.h - 22);
    }
  }

  _renderWaiting(ctx, cw, ch) {
    const choice = this.gameState.myChoice;
    if (choice) {
      const color = COLORS[choice];
      const bw = 150, bh = 150;
      const bx = cw / 2 - bw / 2, by = ch * 0.35;

      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 16);
      ctx.fillStyle = 'rgba(20, 20, 30, 0.8)';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.font = '64px sans-serif';
      ctx.fillText(EMOJIS[choice], cw / 2, by + bh / 2 - 10);

      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillStyle = color;
      ctx.fillText('YOUR CHOICE', cw / 2, by + bh - 22);
    }

    const dotCount = Math.floor(Date.now() / 300) % 4;
    const dots = '.'.repeat(dotCount);
    ctx.font = '13px "DM Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText(`WAITING FOR OPPONENT${dots}`, cw / 2, ch * 0.72);
  }

  _renderRevealing(ctx, cw, ch) {
    const p = this.gameState.animProgress;
    const easeOut = 1 - Math.pow(1 - p, 4);

    const myChoice  = this.gameState.myChoice;
    const oppChoice = this.gameState.oppChoice;
    if (!myChoice || !oppChoice) return;

    const bw = 140, bh = 140;
    const cy = ch * 0.45;

    // Slide cards in
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
      const alpha = (p - 0.85) / 0.15;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 24px "Press Start 2P", monospace';
      ctx.fillStyle = col;
      ctx.fillText(text, cw / 2, cy - bh / 2 - 35);
      ctx.restore();
    }
  }

  _drawRevealCard(ctx, choice, x, y, w, h, label) {
    const color = COLORS[choice];
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '54px sans-serif';
    ctx.fillText(EMOJIS[choice], x + w / 2, y + h / 2 - 10);

    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
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
