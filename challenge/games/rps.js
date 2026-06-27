/**
 * challenge/games/rps.js — Rock Paper Scissors Client
 */

import { updateHudScores, updateHudRound } from '../js/game-runner.js';

const CHOICES = ['rock', 'paper', 'scissors'];
const BEATS   = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
const EMOJIS  = { rock: '✊', paper: '🖐', scissors: '✌️' };
const COLORS  = { rock: '#EF4444', paper: '#6c63ff', scissors: '#00d4aa' };

export default class RPSGame {
  constructor(canvas, room, mySocketId, SocketClient) {
    this.canvas       = canvas;
    this.room         = room;
    this.myId         = mySocketId;
    this.SC           = SocketClient;
    this.ctx          = canvas.getContext('2d');

    this.state = {
      phase: 'choosing', // 'choosing' | 'waiting' | 'revealing' | 'result'
      myChoice: null,
      oppChoice: null,
      round: 1,
      myScore: 0,
      oppScore: 0,
      roundHistory: [],
      roundWinner: null,
      animProgress: 0,
    };

    this._boundHandlers = {};
    this._rafId = null;
    this._btnHover = null;
  }

  async init() {
    this.resize();
    this.bindSocket();
    this.bindInput();
    this.startRender();

    // Notify server we're ready
    this.SC.emit('game:client-ready', { code: this.room.code, gameId: 'rock-paper-scissors' });
  }

  // ── Canvas sizing ─────────────────────────────────────────────────────────
  resize() {
    const wrap = this.canvas.parentElement;
    const w = Math.min(wrap.clientWidth, 720);
    const h = Math.min(wrap.clientHeight, 520);
    this.canvas.width  = w;
    this.canvas.height = h;
    this.canvas.style.cssText = 'border-radius:12px;outline:none;';
    this._buildButtons();
  }

  _buildButtons() {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const bw = 160, bh = 160;
    const y  = ch * 0.48 - bh / 2;
    const gap = (cw - bw * 3) / 4;

    this.buttons = CHOICES.map((choice, i) => ({
      choice,
      x: gap + i * (bw + gap),
      y, w: bw, h: bh,
    }));
  }

  // ── Socket Bindings ───────────────────────────────────────────────────────
  bindSocket() {
    const h = (event, fn) => {
      this._boundHandlers[event] = fn;
      this.SC.on(event, fn);
    };

    h('rps:choice-received', () => {
      this.state.phase = 'waiting';
    });

    h('rps:result', ({ round, choices, roundWinner, scores, roundHistory }) => {
      const oppId = this.room.players.find(p => p.socketId !== this.myId)?.socketId;
      this.state.oppChoice  = choices[oppId]  || null;
      this.state.myChoice   = choices[this.myId] || null;
      this.state.roundWinner = roundWinner;
      this.state.roundHistory = roundHistory;

      // Update scores
      const myScore  = scores[this.myId]  || 0;
      const oppScore = scores[oppId] || 0;
      this.state.myScore  = myScore;
      this.state.oppScore = oppScore;
      updateHudScores(myScore, oppScore);
      updateHudRound(`ROUND ${round} OF 5`);

      this.state.phase = 'revealing';
      this.state.animProgress = 0;
    });

    h('rps:next-round', ({ round }) => {
      this.state.round    = round;
      this.state.phase    = 'choosing';
      this.state.myChoice = null;
      this.state.oppChoice= null;
      this.state.roundWinner = null;
      updateHudRound(`ROUND ${round} OF 5`);
    });
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  bindInput() {
    this._onClick = (e) => {
      if (this.state.phase !== 'choosing') return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const my = (e.clientY - rect.top)  * (this.canvas.height / rect.height);

      for (const btn of this.buttons) {
        if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
          this.state.myChoice = btn.choice;
          this.state.phase    = 'waiting';
          this.SC.emit('rps:choose', { code: this.room.code, choice: btn.choice });
          break;
        }
      }
    };

    this._onMove = (e) => {
      if (this.state.phase !== 'choosing') { this._btnHover = null; return; }
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const my = (e.clientY - rect.top)  * (this.canvas.height / rect.height);
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

  // ── Render Loop ───────────────────────────────────────────────────────────
  startRender() {
    const tick = () => {
      this.render();
      this._rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  render() {
    const c   = this.ctx;
    const cw  = this.canvas.width;
    const ch  = this.canvas.height;

    // Background
    c.fillStyle = '#060810';
    c.fillRect(0, 0, cw, ch);

    if (this.state.phase === 'choosing') {
      this._renderChoosing(c, cw, ch);
    } else if (this.state.phase === 'waiting') {
      this._renderWaiting(c, cw, ch);
    } else if (this.state.phase === 'revealing') {
      this._renderRevealing(c, cw, ch);
      this.state.animProgress = Math.min(1, this.state.animProgress + 0.035);
    }

    this._renderHistory(c, cw, ch);
  }

  _renderChoosing(c, cw, ch) {
    // Prompt
    c.fillStyle = '#94A3B8';
    c.font = '11px "JetBrains Mono", monospace';
    c.textAlign = 'center';
    c.fillText('MAKE YOUR CHOICE', cw / 2, ch * 0.28);

    for (const btn of this.buttons) {
      const hover = this._btnHover === btn.choice;
      const color = COLORS[btn.choice];

      // Card background
      const radius = 16;
      c.beginPath();
      c.roundRect(btn.x, btn.y, btn.w, btn.h, radius);

      if (hover) {
        c.fillStyle = `${color}22`;
        c.fill();
        c.strokeStyle = color;
        c.lineWidth = 2;
        c.stroke();
      } else {
        c.fillStyle = '#0f1421';
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.08)';
        c.lineWidth = 1;
        c.stroke();
      }

      // Top color bar
      c.beginPath();
      c.roundRect(btn.x, btn.y, btn.w, 3, [radius, radius, 0, 0]);
      c.fillStyle = hover ? color : `${color}55`;
      c.fill();

      // Emoji
      c.font = `${hover ? 72 : 64}px serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(EMOJIS[btn.choice], btn.x + btn.w / 2, btn.y + btn.h / 2 - 8);

      // Label
      c.font = 'bold 11px "JetBrains Mono", monospace';
      c.textBaseline = 'alphabetic';
      c.fillStyle = hover ? color : '#64748B';
      c.fillText(btn.choice.toUpperCase(), btn.x + btn.w / 2, btn.y + btn.h - 18);
    }
  }

  _renderWaiting(c, cw, ch) {
    // Show chosen card
    const choice = this.state.myChoice;
    if (choice) {
      const color = COLORS[choice];
      // Large chosen card center
      const bw = 160, bh = 160;
      const bx = cw / 2 - bw / 2, by = ch * 0.35;

      c.beginPath();
      c.roundRect(bx, by, bw, bh, 16);
      c.fillStyle = `${color}20`;
      c.fill();
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.stroke();

      c.font = '72px serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(EMOJIS[choice], cw / 2, by + bh / 2 - 8);

      c.font = 'bold 11px "JetBrains Mono", monospace';
      c.textBaseline = 'alphabetic';
      c.fillStyle = color;
      c.fillText('YOUR CHOICE', cw / 2, by + bh - 16);
    }

    // Waiting dots animation
    const dots = '. . .'.slice(0, Math.floor(Date.now() / 400) % 6 + 1);
    c.font = '11px "JetBrains Mono", monospace';
    c.fillStyle = '#475569';
    c.textBaseline = 'alphabetic';
    c.fillText(`WAITING FOR OPPONENT ${dots}`, cw / 2, ch * 0.78);
  }

  _renderRevealing(c, cw, ch) {
    const p  = this.state.animProgress;
    const easeOut = 1 - Math.pow(1 - p, 3);

    const myChoice  = this.state.myChoice;
    const oppChoice = this.state.oppChoice;
    if (!myChoice || !oppChoice) return;

    const bw = 160, bh = 160;
    const cy = ch * 0.4;

    // My choice slides in from left
    const myX = -bw + easeOut * (cw / 2 - bw - 32);
    // Opp choice slides in from right
    const opX = cw + (easeOut - 1) * (bw + 32) + cw / 2 + 32;

    this._drawRevealCard(c, myChoice, myX, cy - bh / 2, bw, bh, 'YOU');
    this._drawRevealCard(c, oppChoice, opX, cy - bh / 2, bw, bh, 'OPP');

    if (p > 0.8) {
      // Result text
      const rw = this.state.roundWinner;
      const text = rw === null ? 'DRAW'
                 : rw === this.myId ? 'YOU WIN' : 'THEY WIN';
      const col  = rw === null ? '#F59E0B'
                 : rw === this.myId ? '#00d4aa' : '#EF4444';
      const alpha = (p - 0.8) / 0.2;

      c.globalAlpha = alpha;
      c.font = 'bold 32px "Press Start 2P", monospace';
      c.fillStyle = col;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text, cw / 2, cy - bh / 2 - 32);
      c.globalAlpha = 1;
    }
  }

  _drawRevealCard(c, choice, x, y, w, h, label) {
    const color = COLORS[choice];
    c.beginPath();
    c.roundRect(x, y, w, h, 14);
    c.fillStyle = `${color}18`;
    c.fill();
    c.strokeStyle = color;
    c.lineWidth = 2;
    c.stroke();

    c.font = '64px serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(EMOJIS[choice], x + w / 2, y + h / 2 - 8);

    c.font = '9px "JetBrains Mono", monospace';
    c.fillStyle = '#64748B';
    c.textBaseline = 'alphabetic';
    c.fillText(label, x + w / 2, y + h - 14);
  }

  _renderHistory(c, cw, ch) {
    if (!this.state.roundHistory.length) return;

    const dotR = 7;
    const startX = cw / 2 - (this.state.roundHistory.length * (dotR * 2 + 8)) / 2;
    const y = ch - 36;

    for (let i = 0; i < this.state.roundHistory.length; i++) {
      const r    = this.state.roundHistory[i];
      const color = r.winner === this.myId ? '#00d4aa'
                  : r.winner === null ? '#64748B' : '#EF4444';
      const x = startX + i * (dotR * 2 + 8) + dotR;

      c.beginPath();
      c.arc(x, y, dotR, 0, Math.PI * 2);
      c.fillStyle = color;
      c.fill();
    }
  }

  destroy() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this.canvas.removeEventListener('click', this._onClick);
    this.canvas.removeEventListener('mousemove', this._onMove);
    for (const [event, fn] of Object.entries(this._boundHandlers)) {
      this.SC.off(event, fn);
    }
  }
}
