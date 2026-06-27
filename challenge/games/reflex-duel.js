/**
 * challenge/games/reflex-duel.js — Reflex Duel Client
 */

import { updateHudScores, updateHudRound } from '../js/game-runner.js';

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

export default class ReflexDuelGame {
  constructor(canvas, room, mySocketId, SocketClient) {
    this.canvas  = canvas;
    this.room    = room;
    this.myId    = mySocketId;
    this.SC      = SocketClient;
    this.ctx     = canvas.getContext('2d');
    this.oppId   = room.players.find(p => p.socketId !== mySocketId)?.socketId;

    this.state = {
      phase: 'waiting',    // 'waiting' | 'ready' | 'stimulus' | 'result' | 'false-start'
      round: 0,
      total: 10,
      myScore: 0,
      oppScore: 0,
      stimulus: null,      // { type, value }
      lastResult: null,    // { winner, reactionTimes }
      falseStart: null,    // socketId
      stimulusFlashAlpha: 0,
      bgFlash: null,
      waitDots: 0,
    };

    this._handlers = {};
    this._rafId    = null;
    this._dotTimer = null;
    this._pressed  = false;
  }

  async init() {
    this.canvas.width  = 700;
    this.canvas.height = 500;
    this.canvas.style.cssText = 'border-radius:12px;outline:none;max-width:100%;max-height:100%;';

    this.bindSocket();
    this.bindInput();
    this.startRender();

    // Notify server
    this.SC.emit('reflex:ready', { code: this.room.code });
    this.state.phase = 'ready';
  }

  bindSocket() {
    const on = (ev, fn) => { this._handlers[ev] = fn; this.SC.on(ev, fn); };

    on('reflex:round-start', ({ round, total }) => {
      this.state.round   = round;
      this.state.total   = total;
      this.state.phase   = 'ready';
      this.state.stimulus = null;
      this.state.bgFlash  = null;
      this.state.lastResult = null;
      this.state.falseStart = null;
      this._pressed = false;
      updateHudRound(`ROUND ${round} / ${total}`);
    });

    on('reflex:stimulus', ({ type, value }) => {
      this.state.stimulus = { type, value };
      this.state.phase    = 'stimulus';
      this.state.bgFlash  = { color: type === 'color' ? value : '#ffffff', alpha: 1 };
      this._pressed = false;
    });

    on('reflex:result', ({ round, winner, reactionTimes, scores }) => {
      this.state.myScore  = scores[this.myId]  || 0;
      this.state.oppScore = scores[this.oppId] || 0;
      this.state.lastResult = { winner, reactionTimes };
      this.state.phase = 'result';
      updateHudScores(this.state.myScore, this.state.oppScore);
    });

    on('reflex:false-start', ({ socketId }) => {
      this.state.falseStart = socketId;
      this.state.phase = 'false-start';
    });
  }

  bindInput() {
    this._onKey = (e) => {
      if (e.code === 'Space' && !this._pressed) {
        e.preventDefault();
        this._press();
      }
    };
    this._onTap = (e) => {
      if (!this._pressed) this._press();
    };

    document.addEventListener('keydown', this._onKey);
    this.canvas.addEventListener('pointerdown', this._onTap);
  }

  _press() {
    this._pressed = true;
    this.SC.emit('reflex:press', { code: this.room.code });
  }

  startRender() {
    let lastDotTime = 0;
    const tick = (ts) => {
      if (ts - lastDotTime > 400) { this.state.waitDots = (this.state.waitDots + 1) % 4; lastDotTime = ts; }

      // Fade bg flash
      if (this.state.bgFlash && this.state.bgFlash.alpha > 0) {
        this.state.bgFlash.alpha = Math.max(0, this.state.bgFlash.alpha - 0.03);
      }

      this.render();
      this._rafId = requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  render() {
    const c = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    // Clear
    c.fillStyle = '#060810';
    c.fillRect(0, 0, cw, ch);

    // Full bg flash on stimulus
    if (this.state.bgFlash && this.state.bgFlash.alpha > 0) {
      c.globalAlpha = this.state.bgFlash.alpha * 0.25;
      c.fillStyle   = this.state.bgFlash.color;
      c.fillRect(0, 0, cw, ch);
      c.globalAlpha = 1;
    }

    // Split divider
    c.beginPath();
    c.moveTo(cw / 2, 0); c.lineTo(cw / 2, ch);
    c.strokeStyle = 'rgba(255,255,255,0.06)';
    c.lineWidth   = 1;
    c.setLineDash([6, 4]);
    c.stroke();
    c.setLineDash([]);

    // Left half (you), right half (opp)
    this._renderHalf(c, 0, ch, 'YOU', this.state.myScore, true);
    this._renderHalf(c, cw / 2, ch, 'OPP', this.state.oppScore, false);

    // Center stimulus
    if (this.state.phase === 'stimulus' && this.state.stimulus) {
      this._renderStimulus(c, cw, ch);
    }

    // Phase overlay
    if (this.state.phase === 'ready') {
      this._renderReady(c, cw, ch);
    } else if (this.state.phase === 'result' && this.state.lastResult) {
      this._renderResult(c, cw, ch);
    } else if (this.state.phase === 'false-start') {
      this._renderFalseStart(c, cw, ch);
    }

    // Press hint
    if (this.state.phase === 'stimulus' || this.state.phase === 'ready') {
      c.font = '10px "JetBrains Mono", monospace';
      c.fillStyle = '#475569';
      c.textAlign = 'center';
      c.fillText('PRESS SPACE / TAP TO REACT', cw / 2, ch - 18);
    }
  }

  _renderHalf(c, x, ch, label, score, isMe) {
    const hw = this.canvas.width / 2;
    const midX = x + hw / 2;

    // Score
    c.font = 'bold 40px "Press Start 2P", monospace';
    c.textAlign = 'center';
    c.fillStyle = isMe ? '#8B5CF6' : '#EF4444';
    c.fillText(score, midX, 80);

    c.font = '9px "JetBrains Mono", monospace';
    c.fillStyle = '#475569';
    c.fillText(label, midX, 100);
  }

  _renderStimulus(c, cw, ch) {
    const s    = this.state.stimulus;
    const midX = cw / 2, midY = ch / 2 + 20;

    if (s.type === 'color') {
      c.fillStyle = s.value;
      SHAPES.circle(c, midX, midY, 48);
    } else if (s.type === 'shape') {
      c.fillStyle = '#ffffff';
      const draw = SHAPES[s.value] || SHAPES.circle;
      draw(c, midX, midY, 48);
    } else {
      c.font = 'bold 22px "Press Start 2P", monospace';
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('PRESS NOW', midX, midY);
      c.textBaseline = 'alphabetic';
    }

    // Pulse ring
    c.beginPath();
    c.arc(midX, midY, 64, 0, Math.PI * 2);
    c.strokeStyle = 'rgba(255,255,255,0.15)';
    c.lineWidth   = 2;
    c.stroke();
  }

  _renderReady(c, cw, ch) {
    const dots = '. . .'.slice(0, this.state.waitDots * 2 + 1);
    c.font = '12px "JetBrains Mono", monospace';
    c.fillStyle = '#475569';
    c.textAlign = 'center';
    c.fillText(`GET READY ${dots}`, cw / 2, ch / 2 + 20);

    // Tension dots
    for (let i = 0; i < 8; i++) {
      const theta = (i / 8) * Math.PI * 2 + Date.now() / 2000;
      const dx = Math.cos(theta) * 30;
      const dy = Math.sin(theta) * 12;
      const alpha = 0.15 + 0.15 * Math.sin(Date.now() / 300 + i);
      c.beginPath();
      c.arc(cw / 2 + dx, ch / 2 + 40 + dy, 2, 0, Math.PI * 2);
      c.globalAlpha = alpha;
      c.fillStyle = '#8B5CF6';
      c.fill();
      c.globalAlpha = 1;
    }
  }

  _renderResult(c, cw, ch) {
    const r    = this.state.lastResult;
    const myTime  = r.reactionTimes?.[this.myId];
    const oppTime = r.reactionTimes?.[this.oppId];
    const iWon = r.winner === this.myId;
    const isDraw = r.winner === null;

    const text  = isDraw ? 'DRAW' : iWon ? 'YOU REACT FASTER!' : 'TOO SLOW!';
    const color = isDraw ? '#F59E0B' : iWon ? '#00d4aa' : '#EF4444';

    c.font = 'bold 16px "Press Start 2P", monospace';
    c.textAlign = 'center';
    c.fillStyle = color;
    c.fillText(text, cw / 2, ch / 2);

    if (myTime && myTime > 0) {
      c.font = '11px "JetBrains Mono", monospace';
      c.fillStyle = '#94A3B8';
      c.fillText(`You: ${myTime}ms   Them: ${oppTime || '—'}ms`, cw / 2, ch / 2 + 28);
    }
  }

  _renderFalseStart(c, cw, ch) {
    const isMe = this.state.falseStart === this.myId;
    c.font = 'bold 14px "Press Start 2P", monospace';
    c.textAlign = 'center';
    c.fillStyle = '#EF4444';
    c.fillText(isMe ? 'FALSE START — YOU LOSE ROUND' : 'FALSE START — THEY LOSE ROUND', cw / 2, ch / 2);
  }

  destroy() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    document.removeEventListener('keydown', this._onKey);
    this.canvas.removeEventListener('pointerdown', this._onTap);
    for (const [ev, fn] of Object.entries(this._handlers)) this.SC.off(ev, fn);
  }
}
