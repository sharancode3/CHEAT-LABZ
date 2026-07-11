import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const SERVER_ARENA_SIZE = 700;

export default class KingOfTheHillGame extends MultiplayerGameBase {
  static logicalWidth = 660;
  static logicalHeight = 660;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.state = null;

    this.inputState = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    this.scale = KingOfTheHillGame.logicalWidth / SERVER_ARENA_SIZE;

    this._boundHandlers = {};
  }

  async init() {
    this.bindSocket();
    this.bindInput();

    this.socket.emit('koth:ready', { code: this.room.code });
  }

  bindSocket() {
    const bind = (ev, fn) => {
      this._boundHandlers[ev] = fn;
      this.socket.on(ev, fn);
    };

    bind('koth:tick', (data) => {
      this.state = data;
      this.updateHud();
    });

    bind('koth:zone-moved', ({ zone }) => {
      if (this.state) {
        this.state.zone = zone;
      }
      if (this.container) {
        this.container.audio.play('hit');
      }
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
    const handleKey = (e, isDown) => {
      let changed = false;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') { this.inputState.up = isDown; changed = true; }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') { this.inputState.down = isDown; changed = true; }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') { this.inputState.left = isDown; changed = true; }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') { this.inputState.right = isDown; changed = true; }

      if (changed && this.state) {
        e.preventDefault();
        this.socket.emit('koth:input', {
          code: this.room.code,
          ...this.inputState
        });
      }
    };

    this._onKeyDown = (e) => handleKey(e, true);
    this._onKeyUp = (e) => handleKey(e, false);

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  update(dt) {
    // client-side animation logic
  }

  render(ctx) {
    const cw = KingOfTheHillGame.logicalWidth;
    const ch = KingOfTheHillGame.logicalHeight;

    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, cw, ch);

    if (!this.state) return;

    // Draw grid arena lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.lineWidth = 1;
    const cellSize = 30;
    for (let i = 0; i <= cw; i += cellSize) {
      ctx.moveTo(i, 0); ctx.lineTo(i, ch);
      ctx.moveTo(0, i); ctx.lineTo(cw, i);
    }
    ctx.stroke();

    const zone = this.state.zone;
    const zx = zone.x * this.scale;
    const zy = zone.y * this.scale;
    const zr = zone.radius * this.scale;

    // Check if zone warns 3 seconds before moving
    const timeRemaining = zone.nextMoveAt - Date.now();
    const isWarning = timeRemaining < 3000;
    const flashRed = isWarning && Math.floor(Date.now() / 200) % 2 === 0;

    // Zone glow rendering
    ctx.save();
    ctx.shadowBlur = 15;
    if (flashRed) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.strokeStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
    } else if (this.state.zoneHolder) {
      ctx.fillStyle = 'rgba(253, 203, 110, 0.15)'; // gold claimed tint
      ctx.strokeStyle = '#ffd93d';
      ctx.shadowColor = '#ffd93d';
    } else {
      ctx.fillStyle = 'rgba(0, 206, 201, 0.12)'; // default cyan pulsing
      ctx.strokeStyle = '#00cec9';
      ctx.shadowColor = '#00cec9';
    }

    ctx.beginPath();
    ctx.arc(zx, zy, zr, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // "[Name] holds the hill" center text
    if (this.state.zoneHolder) {
      const holder = this.state.players[this.state.zoneHolder];
      if (holder) {
        ctx.font = 'bold 11px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffd93d';
        ctx.textAlign = 'center';
        ctx.fillText(`${holder.displayName.toUpperCase()} HOLDS THE HILL`, zx, zy - 5);
      }
    } else {
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.textAlign = 'center';
      ctx.fillText('HILL UNCLAIMED', zx, zy - 5);
    }

    // Draw Players
    const colors = ['#00cec9', '#ff7675', '#ffd93d', '#a29bfe'];
    let idx = 0;
    for (const [id, player] of Object.entries(this.state.players)) {
      const px = player.x * this.scale;
      const py = player.y * this.scale;
      const pr = player.radius * this.scale;

      const isMe = id === this.mySocketId;
      const color = colors[idx % colors.length];
      idx++;

      ctx.save();
      // Outer shadow ring when player is inside the zone
      if (player.inZone) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
      }
      
      ctx.fillStyle = color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isMe ? 2.5 : 1.5;

      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '10px "DM Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(isMe ? 'YOU' : player.displayName, px, py - pr - 6);
      ctx.restore();
    }

    // Draw thin score progress bars at top left
    let barY = 20;
    idx = 0;
    for (const [id, player] of Object.entries(this.state.players)) {
      const isMe = id === this.mySocketId;
      const color = colors[idx % colors.length];
      idx++;

      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(20, barY, 150, 6);
      ctx.fillStyle = color;
      ctx.fillRect(20, barY, Math.min(1.0, player.score / 30) * 150, 6);

      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(`${player.displayName || (isMe ? 'YOU' : 'OPP')}: ${player.score}/30`, 180, barY + 7);
      
      barY += 15;
    }

    // Display match timer at top right
    ctx.font = "bold 11px 'Press Start 2P', monospace";
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    const minutes = Math.floor(this.state.timeLeft / 60);
    const seconds = Math.floor(this.state.timeLeft % 60).toString().padStart(2, '0');
    ctx.fillText(`${minutes}:${seconds}`, cw - 20, 26);
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    for (const [ev, fn] of Object.entries(this._boundHandlers)) {
      this.socket.off(ev, fn);
    }
    super.destroy();
  }
}
