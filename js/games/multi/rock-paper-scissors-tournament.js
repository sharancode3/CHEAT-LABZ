import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

export default class RpsTournamentGame extends MultiplayerGameBase {
  static logicalWidth = 700;
  static logicalHeight = 460;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.state = null;
    this.mousePos = { x: 0, y: 0 };
    this.confetti = [];

    this._boundHandlers = {};
  }

  async init() {
    this.bindSocket();
    this.bindInput();

    this.socket.emit('tourney:ready', { code: this.room.code });
  }

  bindSocket() {
    const bind = (ev, fn) => {
      this._boundHandlers[ev] = fn;
      this.socket.on(ev, fn);
    };

    bind('tourney:state', ({ state }) => {
      // Trigger confetti on tournament completed results
      if (state.phase === 'results' && (!this.state || this.state.phase !== 'results')) {
        this.spawnConfetti();
      }
      this.state = state;
      this.updateHud();
    });

    bind('game:over', ({ winner }) => {
      if (this.container) {
        this.container.audio.play('coin');
      }
    });
  }

  updateHud() {
    if (this.state && this.container) {
      // Basic score tracking inside current match
      const activeMatch = this.findMyActiveMatch();
      if (activeMatch) {
        const isP1 = activeMatch.p1 === this.mySocketId;
        this.container.updateScore(isP1 ? activeMatch.p1Score : activeMatch.p2Score);
        this.container.updateOpponentScore(isP1 ? activeMatch.p2Score : activeMatch.p1Score);
      }
    }
  }

  findMyActiveMatch() {
    if (!this.state) return null;
    const m = this.state.matches;
    if (this.state.phase === 'semi') {
      if (m.semi1.p1 === this.mySocketId || m.semi1.p2 === this.mySocketId) return m.semi1;
      if (m.semi2.p1 === this.mySocketId || m.semi2.p2 === this.mySocketId) return m.semi2;
    } else if (this.state.phase === 'finals') {
      if (m.final.p1 === this.mySocketId || m.final.p2 === this.mySocketId) return m.final;
      if (m.third.p1 === this.mySocketId || m.third.p2 === this.mySocketId) return m.third;
    }
    return null;
  }

  findActiveMatchForSpectator() {
    if (!this.state) return null;
    const m = this.state.matches;
    if (this.state.phase === 'semi') {
      if (m.semi1.winner === null) return m.semi1;
      if (m.semi2.winner === null) return m.semi2;
    } else if (this.state.phase === 'finals') {
      if (m.final.winner === null) return m.final;
    }
    return null;
  }

  bindInput() {
    this._onClick = (e) => {
      const activeMatch = this.findMyActiveMatch();
      if (!activeMatch || activeMatch.winner) return; // not my turn or match is finished

      // Check choice already submitted
      const isP1 = activeMatch.p1 === this.mySocketId;
      const alreadyChosen = isP1 ? activeMatch.p1Choice : activeMatch.p2Choice;
      if (alreadyChosen) return;

      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (RpsTournamentGame.logicalWidth / rect.width);
      const my = (e.clientY - rect.top)  * (RpsTournamentGame.logicalHeight / rect.height);

      // Buttons drawn at x = 110 + i * 180, y = 330, width 140, height 80
      for (let i = 0; i < 3; i++) {
        const bx = 110 + i * 180;
        const by = 320;
        if (mx >= bx && mx <= bx + 140 && my >= by && my <= by + 80) {
          const choices = ['rock', 'paper', 'scissors'];
          this.socket.emit('tourney:choose', { code: this.room.code, choice: choices[i] });
          if (this.container) {
            this.container.audio.play('hit');
          }
          break;
        }
      }
    };

    this._onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = (e.clientX - rect.left) * (RpsTournamentGame.logicalWidth / rect.width);
      this.mousePos.y = (e.clientY - rect.top)  * (RpsTournamentGame.logicalHeight / rect.height);
    };

    this.canvas.addEventListener('click', this._onClick);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
  }

  spawnConfetti() {
    const corners = [
      { x: 20, y: 20, vx: 180, vy: 180 },
      { x: 680, y: 20, vx: -180, vy: 180 },
      { x: 20, y: 440, vx: 180, vy: -180 },
      { x: 680, y: 440, vx: -180, vy: -180 }
    ];

    const colors = ['#ff7675', '#ffd93d', '#74b9ff', '#55efc4', '#a29bfe'];

    for (let i = 0; i < 60; i++) {
      const c = corners[i % 4];
      const vx = c.vx * (0.6 + Math.random() * 0.8);
      const vy = c.vy * (0.6 + Math.random() * 0.8);
      this.confetti.push({
        x: c.x,
        y: c.y,
        vx,
        vy,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 2.0 // 2 seconds
      });
    }
  }

  update(dt) {
    // Confetti particles physics
    this.confetti = this.confetti.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt; // gravity force
      p.life -= dt;
      return p.life > 0;
    });
  }

  render(ctx) {
    const cw = RpsTournamentGame.logicalWidth;
    const ch = RpsTournamentGame.logicalHeight;

    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, cw, ch);

    if (!this.state) return;

    // Draw Tournament Bracket overview
    this.drawBracket(ctx);

    // Active Duel HUD
    const activeMatch = this.findMyActiveMatch();
    const spectatorMatch = this.findActiveMatchForSpectator();

    if (this.state.phase === 'results') {
      this.drawResultsScreen(ctx, cw, ch);
    } else if (activeMatch) {
      this.drawActiveDuel(ctx, activeMatch, true);
    } else if (spectatorMatch) {
      this.drawActiveDuel(ctx, spectatorMatch, false);
    }

    // Render Confetti particles
    this.confetti.forEach(p => {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.min(1.0, p.life / 0.5);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawBracket(ctx) {
    const m = this.state.matches;
    const getPName = (id) => {
      if (!id) return 'WAITING';
      const p = this.state.players[id];
      return p ? p.displayName.toUpperCase() : 'UNKNOWN';
    };

    // Connections lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2.0;

    // Semi 1 to Final connection
    ctx.beginPath();
    ctx.moveTo(250, 85); ctx.lineTo(310, 85); ctx.lineTo(310, 160); ctx.lineTo(360, 160);
    ctx.stroke();

    // Semi 2 to Final connection
    ctx.beginPath();
    ctx.moveTo(250, 215); ctx.lineTo(310, 215); ctx.lineTo(310, 190); ctx.lineTo(360, 190);
    ctx.stroke();

    // Match boxes
    this.drawMatchBox(ctx, 110, 60, getPName(m.semi1.p1), getPName(m.semi1.p2), m.semi1.p1Score, m.semi1.p2Score, 'SEMI 1', m.semi1.winner);
    this.drawMatchBox(ctx, 110, 190, getPName(m.semi2.p1), getPName(m.semi2.p2), m.semi2.p1Score, m.semi2.p2Score, 'SEMI 2', m.semi2.winner);
    this.drawMatchBox(ctx, 360, 140, getPName(m.final.p1), getPName(m.final.p2), m.final.p1Score, m.final.p2Score, 'FINAL', m.final.winner);
    
    if (m.third.p1 || m.third.p2) {
      this.drawMatchBox(ctx, 360, 245, getPName(m.third.p1), getPName(m.third.p2), m.third.p1Score, m.third.p2Score, '3RD PLACE', m.third.winner);
    }
  }

  drawMatchBox(ctx, x, y, name1, name2, s1, s2, title, winner) {
    const w = 140;
    const h = 52;

    ctx.fillStyle = '#111118';
    ctx.strokeStyle = winner ? 'rgba(255,255,255,0.06)' : '#ff6b6b';
    ctx.lineWidth = winner ? 1.0 : 1.5;

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 8px "Press Start 2P", monospace';
    ctx.fillStyle = winner ? 'rgba(255,255,255,0.3)' : '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(title, x + 8, y - 8);

    // Player 1 line
    ctx.fillStyle = winner === name1 ? '#00d4aa' : '#ffffff';
    ctx.fillText(name1.slice(0, 8), x + 8, y + 20);
    ctx.textAlign = 'right';
    ctx.fillText(s1.toString(), x + w - 8, y + 20);

    // Player 2 line
    ctx.textAlign = 'left';
    ctx.fillStyle = winner === name2 ? '#00d4aa' : '#ffffff';
    ctx.fillText(name2.slice(0, 8), x + 8, y + 40);
    ctx.textAlign = 'right';
    ctx.fillText(s2.toString(), x + w - 8, y + 40);
  }

  drawActiveDuel(ctx, match, isMyTurn) {
    const getPName = (id) => {
      if (!id) return '';
      const p = this.state.players[id];
      return p ? p.displayName.toUpperCase() : 'UNKNOWN';
    };

    ctx.font = 'bold 11px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';

    if (isMyTurn) {
      const isP1 = match.p1 === this.mySocketId;
      const alreadyChosen = isP1 ? match.p1Choice : match.p2Choice;

      if (alreadyChosen) {
        ctx.fillStyle = '#00d4aa';
        ctx.fillText('CHOICE SUBMITTED. WAITING...', 350, 310);
      } else {
        ctx.fillStyle = '#ff6b6b';
        ctx.fillText('CHOOSE YOUR ACTION:', 350, 305);
        this.drawChoiceButtons(ctx);
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(`SPECTATING: ${getPName(match.p1)} VS ${getPName(match.p2)}`, 350, 340);
    }
  }

  drawChoiceButtons(ctx) {
    const choices = ['ROCK', 'PAPER', 'SCISSORS'];
    const icons = ['✊', '✋', '✌️'];
    const startY = 320;

    for (let i = 0; i < 3; i++) {
      const bx = 110 + i * 180;
      const isHovered = this.mousePos.x >= bx && this.mousePos.x <= bx + 140 && this.mousePos.y >= startY && this.mousePos.y <= startY + 80;

      ctx.save();
      ctx.fillStyle = isHovered ? 'rgba(255, 107, 107, 0.15)' : '#111118';
      ctx.strokeStyle = isHovered ? '#ff6b6b' : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = isHovered ? 2.5 : 1.5;

      ctx.beginPath();
      ctx.roundRect(bx, startY, 140, 80, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(choices[i], bx + 70, startY + 32);

      ctx.font = '26px "DM Sans", sans-serif';
      ctx.fillText(icons[i], bx + 70, startY + 65);
      ctx.restore();
    }
  }

  drawResultsScreen(ctx, cw, ch) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, cw, ch);

    ctx.font = 'bold 18px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffd93d';
    ctx.textAlign = 'center';
    ctx.fillText('TOURNAMENT OVER', cw/2, ch/2 - 40);

    const winnerId = this.state.matches.final.winner;
    const winnerName = winnerId ? this.state.players[winnerId]?.displayName.toUpperCase() : 'NOBODY';

    ctx.font = 'bold 14px "Press Start 2P", monospace';
    ctx.fillStyle = '#00d4aa';
    ctx.fillText(`CHAMPION: ${winnerName}`, cw/2, ch/2 + 10);
  }

  destroy() {
    this.canvas.removeEventListener('click', this._onClick);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    for (const [ev, fn] of Object.entries(this._boundHandlers)) {
      this.socket.off(ev, fn);
    }
    super.destroy();
  }
}
