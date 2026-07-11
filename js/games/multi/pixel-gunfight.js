import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const SERVER_W = 600;
const SERVER_H = 500;

export default class PixelGunfightGame extends MultiplayerGameBase {
  static logicalWidth = 680;
  static logicalHeight = 480;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.state = null;

    this.inputState = {
      left: false,
      right: false,
      jump: false,
      shoot: false,
      dodge: false
    };

    this.scaleX = PixelGunfightGame.logicalWidth / SERVER_W;
    this.scaleY = PixelGunfightGame.logicalHeight / SERVER_H;

    this.playerSquish = {}; // id -> current squish scaleY
    this.prevJumpsLeft = {}; // id -> jumpsLeft
    this.recoilOffset = {}; // id -> offset dx

    this._boundHandlers = {};
  }

  async init() {
    this.bindSocket();
    this.bindInput();

    this.socket.emit('gunfight:ready', { code: this.room.code });
  }

  bindSocket() {
    const bind = (ev, fn) => {
      this._boundHandlers[ev] = fn;
      this.socket.on(ev, fn);
    };

    bind('gunfight:tick', (data) => {
      if (this.state && data.players) {
        for (const [id, p] of Object.entries(data.players)) {
          const oldP = this.state.players[id];
          
          // Land landing squish animation
          if (oldP && oldP.jumpsLeft < 2 && p.jumpsLeft === 2) {
            this.playerSquish[id] = 0.7; // squish to 0.7 scale
            if (this.container) this.container.audio.play('hit');
          }

          // Gun recoil triggers
          const oldBulletsCount = this.state.bullets.filter(b => b.ownerId === id).length;
          const newBulletsCount = data.bullets.filter(b => b.ownerId === id).length;
          if (newBulletsCount > oldBulletsCount) {
            this.recoilOffset[id] = p.facing === 'left' ? 6 : -6;
            if (this.container && id === this.mySocketId) {
              this.container.audio.play('hit');
            }
          }
        }
      }

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
        this.container.updateScore(myP.kills);
        this.container.updateOpponentScore(oppP.kills);
      }
    }
  }

  bindInput() {
    const updateInputs = () => {
      this.socket.emit('gunfight:input', {
        code: this.room.code,
        ...this.inputState
      });
      // reset one-shot keys
      this.inputState.jump = false;
      this.inputState.shoot = false;
      this.inputState.dodge = false;
    };

    const handleKey = (e, isDown) => {
      let changed = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') { this.inputState.left = isDown; changed = true; }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') { this.inputState.right = isDown; changed = true; }
      
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (isDown) this.inputState.jump = true;
        changed = true;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        if (isDown) this.inputState.dodge = true;
        changed = true;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (isDown) this.inputState.shoot = true;
        changed = true;
      }

      if (changed && this.state) {
        updateInputs();
      }
    };

    this._onKeyDown = (e) => handleKey(e, true);
    this._onKeyUp = (e) => handleKey(e, false);

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  update(dt) {
    // Lerp squish back to 1.0
    for (const id in this.playerSquish) {
      this.playerSquish[id] += (1.0 - this.playerSquish[id]) * 10 * dt;
      if (Math.abs(this.playerSquish[id] - 1.0) < 0.01) {
        this.playerSquish[id] = 1.0;
      }
    }

    // Lerp recoil offset back to 0
    for (const id in this.recoilOffset) {
      this.recoilOffset[id] += (0 - this.recoilOffset[id]) * 12 * dt;
      if (Math.abs(this.recoilOffset[id]) < 0.1) {
        this.recoilOffset[id] = 0;
      }
    }
  }

  render(ctx) {
    const cw = PixelGunfightGame.logicalWidth;
    const ch = PixelGunfightGame.logicalHeight;

    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, cw, ch);

    if (!this.state) return;

    // Draw Platforms
    this.state.platforms.forEach(plat => {
      const px = plat.x * this.scaleX;
      const py = plat.y * this.scaleY;
      const pw = plat.w * this.scaleX;
      const ph = plat.h * this.scaleY;

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 4);
      ctx.fill();
      ctx.stroke();

      // Top glowing indicator line
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px + 4, py + 1);
      ctx.lineTo(px + pw - 4, py + 1);
      ctx.stroke();
    });

    // Draw Bullets with speed trails
    this.state.bullets.forEach(b => {
      const bx = b.x * this.scaleX;
      const by = b.y * this.scaleY;
      
      ctx.save();
      ctx.fillStyle = '#ffd93d';
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();

      // Fast bullet speed lines
      ctx.strokeStyle = 'rgba(255, 217, 61, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - b.vx * this.scaleX * 1.5, by);
      ctx.stroke();
      ctx.restore();
    });

    // Draw Players
    const colors = ['#ff7675', '#00d4aa'];
    let idx = 0;
    for (const [id, player] of Object.entries(this.state.players)) {
      if (!player.alive) continue;

      const basePx = player.x * this.scaleX;
      const py = player.y * this.scaleY;
      const pw = player.width * this.scaleX;
      const ph = player.height * this.scaleY;

      const isMe = id === this.mySocketId;
      const col = colors[idx % 2];
      idx++;

      const squish = this.playerSquish[id] || 1.0;
      const recoil = this.recoilOffset[id] || 0;
      const px = basePx + recoil;

      ctx.save();
      ctx.translate(px, py + ph); // scale relative to feet
      ctx.scale(1.0 / squish, squish);

      // Character body
      ctx.fillStyle = col;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isMe ? 2 : 1;

      ctx.beginPath();
      ctx.roundRect(-pw/2, -ph, pw, ph, 4);
      ctx.fill();
      ctx.stroke();

      // Eye dots indicating facing direction
      ctx.fillStyle = '#000000';
      const eyeX = player.facing === 'left' ? -pw/4 - 2 : pw/4;
      ctx.beginPath();
      ctx.arc(eyeX, -ph + 8, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Downed or Invincible protective shield bubble
      if (player.dodgeActive > 0) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py + ph/2, ph * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Display Hearts Above
      ctx.font = '10px "DM Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(isMe ? 'YOU' : player.displayName, px, py - 14);

      const hearts = '♥'.repeat(Math.max(0, player.hp));
      ctx.fillStyle = '#ef4444';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText(hearts, px, py - 3);
    }
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
