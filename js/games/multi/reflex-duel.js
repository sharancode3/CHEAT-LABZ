import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const SHAPES = {
  circle:   (c, cx, cy, r) => { c.beginPath(); c.arc(cx, cy, r, 0, Math.PI*2); c.fill(); },
  triangle: (c, cx, cy, r) => {
    c.beginPath();
    c.moveTo(cx, cy - r);
    c.lineTo(cx + r * 0.87, cy + r * 0.5);
    c.lineTo(cx - r * 0.87, cy + r * 0.5);
    c.closePath(); c.fill();
  },
  star: (c, cx, cy, r) => {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad  = i % 2 === 0 ? r : r * 0.4;
      const angle = (i * Math.PI * 2) / 10 - Math.PI / 2;
      i === 0 ? c.moveTo(cx + Math.cos(angle)*rad, cy + Math.sin(angle)*rad)
              : c.lineTo(cx + Math.cos(angle)*rad, cy + Math.sin(angle)*rad);
    }
    c.closePath(); c.fill();
  },
  hexagon: (c, cx, cy, r) => {
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6 - Math.PI / 6;
      i === 0 ? c.moveTo(cx + Math.cos(angle)*r, cy + Math.sin(angle)*r)
              : c.lineTo(cx + Math.cos(angle)*r, cy + Math.sin(angle)*r);
    }
    c.closePath(); c.fill();
  },
};

export default class ReflexDuelGame extends MultiplayerGameBase {
  static logicalWidth = 600;
  static logicalHeight = 600;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.gameState = {
      phase: 'ready', // 'waiting' | 'ready' | 'stimulus' | 'result' | 'false-start'
      round: 0,
      total: 10,
      myScore: 0,
      oppScore: 0,
      stimulus: null,
      lastResult: null,
      falseStart: null,
      bgFlash: null,
      waitDots: 0,
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
      this._pressed = false;
    });

    bind('reflex:stimulus', ({ type, value }) => {
      this.gameState.stimulus = { type, value };
      this.gameState.phase = 'stimulus';
      this.gameState.bgFlash = { color: type === 'color' ? value : '#ffffff', alpha: 1.0 };
      this._pressed = false;
      if (this.container) {
        this.container.audio.play('score');
      }
    });

    bind('reflex:result', ({ round, winner, reactionTimes, scores }) => {
      const oppId = this.opponent?.socketId;
      this.gameState.myScore = scores[this.mySocketId] || 0;
      this.gameState.oppScore = scores[oppId] || 0;
      this.gameState.lastResult = { winner, reactionTimes };
      this.gameState.phase = 'result';

      if (this.container) {
        this.container.updateScore(this.gameState.myScore);
        this.container.updateOpponentScore(this.gameState.oppScore);
      }
    });

    bind('reflex:false-start', ({ socketId }) => {
      this.gameState.falseStart = socketId;
      this.gameState.phase = 'false-start';
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
    // Increment dots animation timer
    this._dotsTimer += dt;
    if (this._dotsTimer > 0.4) {
      this.gameState.waitDots = (this.gameState.waitDots + 1) % 4;
      this._dotsTimer = 0;
    }

    // Fade background stimulus flash
    if (this.gameState.bgFlash && this.gameState.bgFlash.alpha > 0) {
      this.gameState.bgFlash.alpha = Math.max(0, this.gameState.bgFlash.alpha - 2.0 * dt);
    }
  }

  render(ctx) {
    const cw = ReflexDuelGame.logicalWidth;
    const ch = ReflexDuelGame.logicalHeight;

    // Background color
    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, cw, ch);

    // Render flash
    if (this.gameState.bgFlash && this.gameState.bgFlash.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.gameState.bgFlash.alpha * 0.25;
      ctx.fillStyle = this.gameState.bgFlash.color;
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    }

    // Centered vertical dotted divider
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cw / 2, 0);
    ctx.lineTo(cw / 2, ch);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.restore();

    // Render local player and opponent split HUD halves
    this._renderHalf(ctx, 0, ch, 'YOU', this.gameState.myScore, true);
    this._renderHalf(ctx, cw / 2, ch, this.getOpponentName().toUpperCase(), this.gameState.oppScore, false);

    // Stimulus Drawing
    if (this.gameState.phase === 'stimulus' && this.gameState.stimulus) {
      this._renderStimulus(ctx, cw, ch);
    }

    // Overlay phase notifications
    if (this.gameState.phase === 'ready') {
      this._renderReady(ctx, cw, ch);
    } else if (this.gameState.phase === 'result' && this.gameState.lastResult) {
      this._renderResult(ctx, cw, ch);
    } else if (this.gameState.phase === 'false-start') {
      this._renderFalseStart(ctx, cw, ch);
    }

    // Footer reaction hint
    if (this.gameState.phase === 'stimulus' || this.gameState.phase === 'ready') {
      ctx.font = '700 11px "DM Sans", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.textAlign = 'center';
      ctx.fillText('PRESS SPACE OR TAP CANVAS TO REACT', cw / 2, ch - 30);
    }
  }

  _renderHalf(ctx, x, ch, label, score, isMe) {
    const hw = ReflexDuelGame.logicalWidth / 2;
    const midX = x + hw / 2;

    ctx.font = 'bold 36px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isMe ? '#6c63ff' : '#ff6b6b';
    ctx.fillText(score, midX, 100);

    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillText(label, midX, 140);
  }

  _renderStimulus(ctx, cw, ch) {
    const s = this.gameState.stimulus;
    const midX = cw / 2, midY = ch / 2 + 30;

    if (s.type === 'color') {
      ctx.fillStyle = s.value;
      SHAPES.circle(ctx, midX, midY, 50);
    } else if (s.type === 'shape') {
      ctx.fillStyle = '#ffffff';
      const draw = SHAPES[s.value] || SHAPES.circle;
      draw(ctx, midX, midY, 50);
    } else {
      ctx.font = 'bold 24px "Press Start 2P", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NOW!', midX, midY);
    }

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(midX, midY, 68, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  _renderReady(ctx, cw, ch) {
    const dots = '.'.repeat(this.gameState.waitDots);
    ctx.font = '700 14px "DM Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'center';
    ctx.fillText(`GET READY${dots}`, cw / 2, ch / 2 + 30);
  }

  _renderResult(ctx, cw, ch) {
    const r = this.gameState.lastResult;
    const oppId = this.opponent?.socketId;
    const myTime = r.reactionTimes?.[this.mySocketId];
    const oppTime = r.reactionTimes?.[oppId];
    const iWon = r.winner === this.mySocketId;
    const isDraw = r.winner === null;

    const text = isDraw ? 'DRAW' : iWon ? 'YOU WINS!' : 'THEY WIN';
    const color = isDraw ? '#F59E0B' : iWon ? '#10b981' : '#EF4444';

    ctx.font = 'bold 16px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(text, cw / 2, ch / 2 + 20);

    if (myTime && myTime > 0) {
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(`YOU: ${myTime}ms  •  THEM: ${oppTime || '—'}ms`, cw / 2, ch / 2 + 50);
    }
  }

  _renderFalseStart(ctx, cw, ch) {
    const isMe = this.gameState.falseStart === this.mySocketId;
    ctx.font = 'bold 12px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#EF4444';
    ctx.fillText(isMe ? 'FALSE START - YOU FORFEIT!' : 'FALSE START - THEY FORFEIT!', cw / 2, ch / 2 + 20);
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
