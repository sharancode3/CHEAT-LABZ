import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const SHAPE_LABELS = ['Circle', 'Triangle', 'Square', 'Diamond', 'Star', 'Cross', 'Pentagon', 'Hexagon', 'Heart', 'Arrow'];

export default class MiniPartyPackGame extends MultiplayerGameBase {
  static logicalWidth = 620;
  static logicalHeight = 480;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.state = null;
    this.mousePos = { x: 0, y: 0 };
    this.prevKey = null;

    this._boundHandlers = {};
  }

  async init() {
    this.bindSocket();
    this.bindInput();

    this.socket.emit('party:ready', { code: this.room.code });
  }

  bindSocket() {
    const bind = (ev, fn) => {
      this._boundHandlers[ev] = fn;
      this.socket.on(ev, fn);
    };

    bind('party:tick', (data) => {
      this.state = data;
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
      const oppId = this.opponent?.socketId;
      const myP = this.state.players[this.mySocketId];
      const oppP = this.state.players[oppId];

      if (myP && oppP) {
        this.container.updateScore(myP.score);
        this.container.updateOpponentScore(oppP.score);
      }
    }
  }

  bindInput() {
    this._onClick = (e) => {
      if (!this.state || this.state.phase !== 'playing') return;

      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (MiniPartyPackGame.logicalWidth / rect.width);
      const my = (e.clientY - rect.top)  * (MiniPartyPackGame.logicalHeight / rect.height);

      const type = this.state.gameType;

      if (type === 0 || type === 3) {
        // Last Button or Click Frenzy (Center Button)
        const bx = 310, by = 240, br = 60;
        if (Math.hypot(mx - bx, my - by) < br) {
          this.socket.emit('party:action', { code: this.room.code, clickButton: true });
          if (this.container) this.container.audio.play('hit');
        }
      } else if (type === 2) {
        // Memory Flash card clicks
        // 10 cards drawn in 2x5 grid: x = 110 + col * 90, y = 170 + row * 110, size 70x80
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 5; c++) {
            const cardX = 110 + c * 85;
            const cardY = 170 + r * 110;
            if (mx >= cardX && mx <= cardX + 70 && my >= cardY && my <= cardY + 90) {
              const idx = r * 5 + c;
              this.socket.emit('party:action', { code: this.room.code, memorySelect: idx });
              if (this.container) this.container.audio.play('hit');
              break;
            }
          }
        }
      }
    };

    this._onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = (e.clientX - rect.left) * (MiniPartyPackGame.logicalWidth / rect.width);
      this.mousePos.y = (e.clientY - rect.top)  * (MiniPartyPackGame.logicalHeight / rect.height);
    };

    this._onKeyDown = (e) => {
      if (!this.state || this.state.phase !== 'playing') return;

      const type = this.state.gameType;

      if (type === 1) {
        // Balance challenge
        let steer = null;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') steer = 'left';
        if (e.code === 'KeyD' || e.code === 'ArrowRight') steer = 'right';

        if (steer) {
          e.preventDefault();
          this.socket.emit('party:action', { code: this.room.code, tapSteer: steer });
        }
      } else if (type === 0 || type === 3) {
        if (e.code === 'Space') {
          e.preventDefault();
          this.socket.emit('party:action', { code: this.room.code, clickButton: true });
          if (this.container) this.container.audio.play('hit');
        }
      }
    };

    this.canvas.addEventListener('click', this._onClick);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('keydown', this._onKeyDown);
  }

  update(dt) {
    // client logic update if needed
  }

  render(ctx) {
    const cw = MiniPartyPackGame.logicalWidth;
    const ch = MiniPartyPackGame.logicalHeight;

    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, cw, ch);

    if (!this.state) return;

    // Display Title
    ctx.font = 'bold 12px "Press Start 2P", monospace';
    ctx.fillStyle = '#ff6b6b';
    ctx.textAlign = 'center';
    ctx.fillText('MINI PARTY PACK', cw/2, 40);

    const type = this.state.gameType;
    const pNames = ['LAST BUTTON', 'BALANCE BEAM', 'MEMORY FLASH', 'CLICK FRENZY'];
    const pName = pNames[type] || 'PARTY GAME';

    ctx.font = 'bold 16px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(pName, cw/2, 75);

    // Timer countdown
    ctx.font = 'bold 11px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const secs = (this.state.timer / 1000).toFixed(1);
    ctx.fillText(`TIME: ${secs}s`, cw/2, 110);

    if (this.state.phase === 'transition') {
      this.drawTransitionScreen(ctx, cw, ch, type);
    } else if (this.state.phase === 'playing') {
      this.drawGameplayScreen(ctx, cw, ch, type);
    } else if (this.state.phase === 'results') {
      this.drawResultsScreen(ctx, cw, ch);
    }
  }

  drawTransitionScreen(ctx, cw, ch, type) {
    const desc = [
      'Click the button as close to 0s as possible!',
      'Tap A/LEFT and D/RIGHT to stay balanced.',
      'Memorize the shapes, then click them.',
      'Mash the spacebar or click as fast as possible!'
    ];

    ctx.font = '13px "DM Sans", sans-serif';
    ctx.fillStyle = '#ff7675';
    ctx.textAlign = 'center';
    ctx.fillText(desc[type] || 'Get ready!', cw/2, ch/2 - 20);

    ctx.font = 'bold 20px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('READY...', cw/2, ch/2 + 20);
  }

  drawGameplayScreen(ctx, cw, ch, type) {
    if (type === 0 || type === 3) {
      // Last Button or Click Frenzy (Center Button)
      const bx = 310, by = 240, br = 60;
      const isHovered = Math.hypot(this.mousePos.x - bx, this.mousePos.y - by) < br;

      ctx.save();
      ctx.fillStyle = isHovered ? '#ff7675' : '#ff6b6b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.shadowBlur = isHovered ? 15 : 5;
      ctx.shadowColor = '#ff6b6b';

      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 11px "Press Start 2P", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fillText(type === 0 ? 'TAP!' : 'CLICK!', bx, by + 5);
      ctx.restore();

      // Clicks counters or states
      let textY = 360;
      for (const [id, player] of Object.entries(this.state.players)) {
        const isMe = id === this.mySocketId;
        const color = isMe ? '#00d4aa' : '#ff7675';
        ctx.fillStyle = color;
        ctx.font = '11px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        if (type === 0) {
          const clicked = player.lastClickTime > 0;
          ctx.fillText(`${isMe ? 'YOU' : 'OPP'}: ${clicked ? 'LOCKED IN' : 'WAITING'}`, cw/2, textY);
        } else {
          ctx.fillText(`${isMe ? 'YOU' : 'OPP'}: ${player.clicks} CLICKS`, cw/2, textY);
        }
        textY += 25;
      }
    } else if (type === 1) {
      // Balance needle challenge
      const rx = 160;
      const ry = 220;
      const rw = 300;
      const rh = 15;

      // Balance channel track
      ctx.fillStyle = '#1e1e24';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.strokeRect(rx, ry, rw, rh);

      // Center safe bounds indicators
      ctx.fillStyle = 'rgba(39, 174, 96, 0.2)';
      ctx.fillRect(rx + rw * 0.1, ry, rw * 0.8, rh);

      const colors = ['#00d4aa', '#ff7675'];
      let idx = 0;
      for (const [id, player] of Object.entries(this.state.players)) {
        const isMe = id === this.mySocketId;
        const col = colors[idx % 2];
        idx++;

        const isDead = player.balance <= 10 || player.balance >= 90;
        const needleX = rx + (player.balance / 100) * rw;

        ctx.fillStyle = col;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;

        // Draw needle indicator
        ctx.beginPath();
        ctx.moveTo(needleX, ry - 15);
        ctx.lineTo(needleX - 6, ry);
        ctx.lineTo(needleX + 6, ry);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.font = '9px "Press Start 2P", monospace';
        ctx.fillText(isMe ? 'YOU' : 'OPP', needleX, ry - 22);

        if (isDead) {
          ctx.fillStyle = '#ef4444';
          ctx.fillText('FALLEN', needleX, ry + 35);
        }
      }
    } else if (type === 2) {
      // Memory Flash (Show 10 shapes in a grid, highlight target 5 shapes during first 5 seconds)
      const showTargets = this.state.timer > 25000;
      const myP = this.state.players[this.mySocketId];

      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 5; c++) {
          const idx = r * 5 + c;
          const cardX = 110 + c * 85;
          const cardY = 170 + r * 110;

          // Check target highlights or clicked
          const isTarget = this.state.memoryShapes.includes(idx);
          const isClicked = myP && myP.memoryAnswers.includes(idx);

          ctx.fillStyle = '#1c1c24';
          ctx.strokeStyle = (showTargets && isTarget) ? '#ffd93d' : (isClicked ? '#00d4aa' : 'rgba(255,255,255,0.1)');
          ctx.lineWidth = 2.0;

          ctx.beginPath();
          ctx.roundRect(cardX, cardY, 70, 90, 6);
          ctx.fill();
          ctx.stroke();

          // Render shape placeholder
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px "DM Sans", sans-serif';
          ctx.fillText(SHAPE_LABELS[idx], cardX + 35, cardY + 50);
        }
      }

      if (showTargets) {
        ctx.fillStyle = '#ffd93d';
        ctx.font = 'bold 10px "Press Start 2P", monospace';
        ctx.fillText('MEMORIZE TARGET SHAPES!', cw/2, 420);
      } else {
        ctx.fillStyle = '#00d4aa';
        ctx.font = 'bold 10px "Press Start 2P", monospace';
        ctx.fillText('CLICK THE 5 SHAPES YOU SAW!', cw/2, 420);
      }
    }
  }

  drawResultsScreen(ctx, cw, ch) {
    ctx.font = 'bold 14px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffd93d';
    ctx.fillText('SUBGAME RESULTS', cw/2, ch/2 - 50);

    let textY = ch/2 - 10;
    for (const [id, player] of Object.entries(this.state.players)) {
      const isMe = id === this.mySocketId;
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.fillStyle = isMe ? '#00d4aa' : '#ff7675';
      ctx.fillText(`${player.displayName || (isMe ? 'YOU' : 'OPP')}: +${player.subScore || 0} POINTS`, cw/2, textY);
      textY += 30;
    }
  }

  destroy() {
    this.canvas.removeEventListener('click', this._onClick);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('keydown', this._onKeyDown);
    for (const [ev, fn] of Object.entries(this._boundHandlers)) {
      this.socket.off(ev, fn);
    }
    super.destroy();
  }
}
