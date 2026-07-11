import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const SERVER_W = 800;
const SERVER_H = 500;

export default class CaptureTheFlagGame extends MultiplayerGameBase {
  static logicalWidth = 780;
  static logicalHeight = 500;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.state = null;

    this.inputState = {
      up: false,
      down: false,
      left: false,
      right: false,
      shoot: false,
      aimAngle: 0,
      melee: false
    };

    this.mousePos = { x: 390, y: 250 };
    this.scaleX = CaptureTheFlagGame.logicalWidth / SERVER_W;
    this.scaleY = CaptureTheFlagGame.logicalHeight / SERVER_H;

    this._boundHandlers = {};
  }

  async init() {
    this.bindSocket();
    this.bindInput();

    this.socket.emit('ctf:ready', { code: this.room.code });
  }

  bindSocket() {
    const bind = (ev, fn) => {
      this._boundHandlers[ev] = fn;
      this.socket.on(ev, fn);
    };

    bind('ctf:tick', (data) => {
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
      // Sync scores with sidebar panel
      const myP = this.state.players[this.mySocketId];
      if (myP) {
        const myTeam = myP.team;
        const oppTeam = myTeam === 0 ? 1 : 0;
        this.container.updateScore(this.state.scores[myTeam]);
        this.container.updateOpponentScore(this.state.scores[oppTeam]);
      }
    }
  }

  bindInput() {
    const updateInputs = () => {
      const myP = this.state?.players[this.mySocketId];
      if (!myP || !myP.alive) return;

      const px = myP.x * this.scaleX;
      const py = myP.y * this.scaleY;
      this.inputState.aimAngle = Math.atan2(this.mousePos.y - py, this.mousePos.x - px);

      this.socket.emit('ctf:input', {
        code: this.room.code,
        ...this.inputState
      });
      // Reset one-shot states
      this.inputState.shoot = false;
      this.inputState.melee = false;
    };

    const handleKey = (e, isDown) => {
      let changed = false;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') { this.inputState.up = isDown; changed = true; }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') { this.inputState.down = isDown; changed = true; }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') { this.inputState.left = isDown; changed = true; }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') { this.inputState.right = isDown; changed = true; }
      
      if (e.code === 'KeyF' || e.code === 'KeyE') {
        if (isDown) this.inputState.melee = true;
        changed = true;
      }

      if (changed && this.state) {
        e.preventDefault();
        updateInputs();
      }
    };

    this._onKeyDown = (e) => handleKey(e, true);
    this._onKeyUp = (e) => handleKey(e, false);

    this._onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = (e.clientX - rect.left) * (CaptureTheFlagGame.logicalWidth / rect.width);
      this.mousePos.y = (e.clientY - rect.top)  * (CaptureTheFlagGame.logicalHeight / rect.height);
      if (this.state) updateInputs();
    };

    this._onMouseDown = (e) => {
      if (e.button === 0 && this.state) {
        this.inputState.shoot = true;
        updateInputs();
      }
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
  }

  update(dt) {
    // client logic update if needed
  }

  render(ctx) {
    const cw = CaptureTheFlagGame.logicalWidth;
    const ch = CaptureTheFlagGame.logicalHeight;

    // Arena Floor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, cw, ch);

    if (!this.state) return;

    // Draw bases layout dividing line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cw/2, 0); ctx.lineTo(cw/2, ch);
    ctx.stroke();

    // Draw Bases Zones (Blue Team 0 is Left, Red Team 1 is Right)
    ctx.fillStyle = 'rgba(9, 132, 227, 0.06)';
    ctx.fillRect(0, 0, cw/2, ch);
    ctx.fillStyle = 'rgba(255, 107, 107, 0.06)';
    ctx.fillRect(cw/2, 0, cw/2, ch);

    // Draw flags on field if status !== 'carried'
    this.state.flags.forEach(flag => {
      if (flag.status === 'carried') return;

      const fx = (flag.status === 'base' ? flag.x : flag.dropX) * this.scaleX;
      const fy = (flag.status === 'base' ? flag.y : flag.dropY) * this.scaleY;

      this.drawFlagPole(ctx, fx, fy, flag.team === 0 ? '#0984e3' : '#ff6b6b');
    });

    // Draw bullets
    this.state.bullets.forEach(b => {
      const bx = b.x * this.scaleX;
      const by = b.y * this.scaleY;
      ctx.fillStyle = b.team === 0 ? '#0984e3' : '#ff6b6b';
      ctx.beginPath();
      ctx.arc(bx, by, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Players
    for (const [id, player] of Object.entries(this.state.players)) {
      if (!player.alive) continue;

      const px = player.x * this.scaleX;
      const py = player.y * this.scaleY;
      const pr = player.radius * this.scaleX;

      const isMe = id === this.mySocketId;
      const teamColor = player.team === 0 ? '#0984e3' : '#ff6b6b';

      ctx.save();
      ctx.fillStyle = teamColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isMe ? 2.5 : 1.5;

      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw carrying flag above player head
      if (player.hasFlag) {
        this.drawFlagPole(ctx, px, py - pr - 14, player.team === 0 ? '#ff6b6b' : '#0984e3'); // opponent's flag color
      }

      // Draw invincible protect bubble
      const now = Date.now();
      if (player.invincibleUntil && now < player.invincibleUntil) {
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, pr + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.font = '10px "DM Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(isMe ? 'YOU' : player.displayName, px, py - pr - 6);

      // Hearts HP
      const hearts = '♥'.repeat(Math.max(0, player.hp));
      ctx.fillStyle = '#ef4444';
      ctx.fillText(hearts, px, py + pr + 12);
      ctx.restore();
    }

    // Capture score indicator HUD at top center
    ctx.font = "bold 13px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    
    ctx.fillStyle = '#0984e3';
    ctx.fillText(this.state.scores[0].toString(), cw/2 - 40, 35);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(':', cw/2, 35);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText(this.state.scores[1].toString(), cw/2 + 40, 35);

    // Timer countdown
    ctx.font = "bold 11px 'Press Start 2P', monospace";
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const minutes = Math.floor(this.state.timeLeft / 60);
    const seconds = Math.floor(this.state.timeLeft % 60).toString().padStart(2, '0');
    ctx.fillText(`${minutes}:${seconds}`, cw/2, 60);

    // Minimap (Bottom Left)
    this.drawMiniMap(ctx, cw, ch);
  }

  drawFlagPole(ctx, x, y, color) {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    
    // Pole line
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x, y - 10);
    ctx.stroke();

    // Flag triangle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + 12, y - 5);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawMiniMap(ctx, cw, ch) {
    const mw = 100;
    const mh = 60;
    const mx = 20;
    const my = ch - mh - 20;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeRect(mx, my, mw, mh);

    const mScaleX = mw / SERVER_W;
    const mScaleY = mh / SERVER_H;

    // Team divisions
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(mx + mw/2, my); ctx.lineTo(mx + mw/2, my + mh);
    ctx.stroke();

    // Flag bases dots
    ctx.fillStyle = '#0984e3';
    ctx.fillRect(mx + 60 * mScaleX - 2, my + 250 * mScaleY - 2, 4, 4);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(mx + 740 * mScaleX - 2, my + 250 * mScaleY - 2, 4, 4);

    // Players dots
    for (const player of Object.values(this.state.players)) {
      if (!player.alive) continue;
      ctx.fillStyle = player.team === 0 ? '#0984e3' : '#ff6b6b';
      ctx.beginPath();
      ctx.arc(mx + player.x * mScaleX, my + player.y * mScaleY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    for (const [ev, fn] of Object.entries(this._boundHandlers)) {
      this.socket.off(ev, fn);
    }
    super.destroy();
  }
}
