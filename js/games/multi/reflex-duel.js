import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

export default class ReflexDuelGame extends MultiplayerGameBase {
  static logicalWidth = 680;
  static logicalHeight = 400;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.gameState = {
      phase: 'ready', // 'ready' | 'stimulus' | 'result' | 'false-start'
      round: 0,
      total: 10,
      myScore: 0,
      oppScore: 0,
      stimulus: null,
      lastResult: null,
      falseStart: null,
      bgFlash: null,
      waitDots: 0,
      roundHistory: [],
      animProgress: 0
    };

    this._boundHandlers = {};
    this._pressed = false;
    this._dotsTimer = 0;
  }

  async init() {
    this.bindSocket();
    this.bindInput();

    this.socket.emit('reflex:ready', { code: this.room.code });
    this.gameState.phase = 'ready';
  }

  bindSocket() {
    const bind = (ev, fn) => {
      this._boundHandlers[ev] = fn;
      this.socket.on(ev, fn);
    };

    bind('reflex:round-start', ({ round, total }) => {
      this.gameState.round = round;
      this.gameState.total = total;
      this.gameState.phase = 'ready';
      this.gameState.stimulus = null;
      this.gameState.bgFlash = null;
      this.gameState.lastResult = null;
      this.gameState.falseStart = null;
      this.gameState.animProgress = 0;
      this._pressed = false;
    });

    bind('reflex:stimulus', ({ type, value }) => {
      this.gameState.stimulus = { type, value };
      this.gameState.phase = 'stimulus';
      // Stimulus flash background color
      const flashColor = type === 'color' ? value : '#00b894';
      this.gameState.bgFlash = { color: flashColor, alpha: 1.0 };
      this._pressed = false;
      if (this.container) {
        this.container.audio.play('hit');
      }
    });

    bind('reflex:result', ({ round, winner, reactionTimes, scores, roundHistory }) => {
      const oppId = this.opponent?.socketId;
      this.gameState.myScore = scores[this.mySocketId] || 0;
      this.gameState.oppScore = scores[oppId] || 0;
      this.gameState.lastResult = { winner, reactionTimes };
      
      // Keep state as false-start if one occurred, else show result
      if (this.gameState.phase !== 'false-start') {
        this.gameState.phase = 'result';
      }
      this.gameState.animProgress = 0;

      // Update dots and scores in container
      if (this.container) {
        this.container.updateScore(this.gameState.myScore);
        this.container.updateOpponentScore(this.gameState.oppScore);
      }
    });

    bind('reflex:false-start', ({ socketId }) => {
      this.gameState.falseStart = socketId;
      this.gameState.phase = 'false-start';
      this._pressed = true;
      if (this.container) {
        this.container.audio.play('damage');
      }
    });
  }

  bindInput() {
    this._onKey = (e) => {
      if (e.code === 'Space' && !this._pressed) {
        e.preventDefault();
        this._press();
      }
    };
    this._onTap = () => {
      if (!this._pressed) {
        this._press();
      }
    };

    document.addEventListener('keydown', this._onKey);
    this.canvas.addEventListener('pointerdown', this._onTap);
  }

  _press() {
    this._pressed = true;
    this.socket.emit('reflex:press', { code: this.room.code });
  }

  update(dt) {
    // wait dots animation
    this._dotsTimer += dt;
    if (this._dotsTimer > 0.3) {
      this.gameState.waitDots = (this.gameState.waitDots + 1) % 4;
      this._dotsTimer = 0;
    }

    // Fade background stimulus flash
    if (this.gameState.bgFlash && this.gameState.bgFlash.alpha > 0) {
      this.gameState.bgFlash.alpha = Math.max(0, this.gameState.bgFlash.alpha - 3.5 * dt); // fade out over ~280ms
    }

    // Progress slide anims
    if (this.gameState.phase === 'result' || this.gameState.phase === 'false-start') {
      this.gameState.animProgress = Math.min(1.0, this.gameState.animProgress + 3.0 * dt);
    }
  }

  render(ctx) {
    const cw = ReflexDuelGame.logicalWidth;
    const ch = ReflexDuelGame.logicalHeight;
    const midX = cw / 2;

    // Default dark split background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, cw, ch);

    // Dotted vertical divider
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, ch);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.restore();

    // Render stimulus flash over the entire canvas
    if (this.gameState.phase === 'stimulus' || (this.gameState.bgFlash && this.gameState.bgFlash.alpha > 0)) {
      ctx.save();
      ctx.globalAlpha = this.gameState.bgFlash ? this.gameState.bgFlash.alpha * 0.70 : 0.70;
      ctx.fillStyle = this.gameState.bgFlash ? this.gameState.bgFlash.color : '#00b894';
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    }

    // Names and scores displays on each side
    ctx.font = 'bold 32px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#00b894'; // My Score Accent
    ctx.fillText(this.gameState.myScore, midX / 2, 70);

    ctx.fillStyle = '#ff7675'; // Opponent Score Muted Red
    ctx.fillText(this.gameState.oppScore, midX + midX / 2, 70);

    ctx.font = "bold 12px 'DM Sans', sans-serif";
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('YOU', midX / 2, 115);
    ctx.fillText(this.getOpponentName().toUpperCase(), midX + midX / 2, 115);

    // Key hints
    ctx.font = "bold 11px 'DM Sans', sans-serif";
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.textAlign = 'left';
    ctx.fillText('HINT: PRESS SPACEBAR', 24, ch - 35);
    
    ctx.textAlign = 'right';
    ctx.fillText('HINT: PRESS SPACEBAR', cw - 24, ch - 35);

    // Get Ready / Stimulus drawing
    if (this.gameState.phase === 'ready') {
      const dots = '.'.repeat(this.gameState.waitDots);
      ctx.font = "bold 16px 'Press Start 2P', monospace";
      ctx.fillStyle = '#00b894';
      ctx.textAlign = 'center';
      ctx.fillText(`GET READY${dots}`, midX, ch / 2 + 10);
    }

    // FALSE START overlay
    if (this.gameState.phase === 'false-start' && this.gameState.falseStart) {
      const isMe = this.gameState.falseStart === this.mySocketId;
      ctx.save();
      ctx.font = "bold 20px 'Press Start 2P', monospace";
      ctx.fillStyle = '#ff7675';
      ctx.textAlign = 'center';
      
      // Draw "TOO EARLY" over false starter's half
      const textX = isMe ? midX / 2 : midX + midX / 2;
      ctx.fillText('TOO EARLY', textX, ch / 2 + 20);
      ctx.restore();
    }

    // Reaction times slides in centered from the bottom
    if ((this.gameState.phase === 'result' || this.gameState.phase === 'false-start') && this.gameState.lastResult) {
      this._renderSlideResult(ctx, cw, ch);
    }

    // History dots
    this._renderHistoryDots(ctx, cw, ch);
  }

  _renderSlideResult(ctx, cw, ch) {
    const p = this.gameState.animProgress;
    const easeOut = 1 - Math.pow(1 - p, 4);

    const r = this.gameState.lastResult;
    const oppId = this.opponent?.socketId;
    const myTime = r.reactionTimes?.[this.mySocketId];
    const oppTime = r.reactionTimes?.[oppId];

    const iWon = r.winner === this.mySocketId;
    const isDraw = r.winner === null;

    // Slide up parameters
    const targetY = ch / 2 + 15;
    const startY = ch + 50;
    const y = startY + (targetY - startY) * easeOut;

    ctx.save();
    
    // Label WIN / LOSE
    const text = isDraw ? 'DRAW' : iWon ? 'YOU WIN' : 'THEM WIN';
    const color = isDraw ? '#ffffff' : iWon ? '#00b894' : '#ff7675';
    
    ctx.font = "bold 22px 'Press Start 2P', monospace";
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, cw / 2, y);

    // Timings
    ctx.font = "bold 12px 'JetBrains Mono', monospace";
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const myLabel = myTime === -1 ? 'EARLY' : myTime ? `${Math.round(myTime)}ms` : 'MISS';
    const oppLabel = oppTime === -1 ? 'EARLY' : oppTime ? `${Math.round(oppTime)}ms` : 'MISS';
    ctx.fillText(`YOU: ${myLabel}  •  THEM: ${oppLabel}`, cw / 2, y + 30);
    ctx.restore();
  }

  _renderHistoryDots(ctx, cw, ch) {
    // Draw 10 round indicator dots at the bottom
    const history = this.gameState.lastResult?.roundHistory || [];
    const maxRounds = 10;
    
    const dotW = 12;
    const spacing = 12;
    const totalW = maxRounds * dotW + (maxRounds - 1) * spacing;
    const startX = cw / 2 - totalW / 2;
    const dotY = ch - 20;

    for (let i = 0; i < maxRounds; i++) {
      const dx = startX + i * (dotW + spacing) + dotW / 2;
      
      ctx.beginPath();
      ctx.arc(dx, dotY, 4, 0, Math.PI * 2);
      
      const rResult = history[i];
      if (rResult) {
        const isWinner = rResult.winner === this.mySocketId;
        ctx.fillStyle = isWinner ? '#00b894' : '#ff7675'; // Filled accent for win, filled red for lose
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; // Outline muted for upcoming
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  destroy() {
    document.removeEventListener('keydown', this._onKey);
    this.canvas.removeEventListener('pointerdown', this._onTap);
    for (const [ev, fn] of Object.entries(this._boundHandlers)) {
      this.socket.off(ev, fn);
    }
    super.destroy();
  }
}
