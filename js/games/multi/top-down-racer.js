import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const TRACK_A = [
  [100, 100], [400, 80], [700, 100], [720, 250],
  [700, 400], [400, 420], [100, 400], [80, 250]
];
const TRACK_B = [
  [100, 100], [300, 150], [400, 250], [500, 350], [700, 400], [720, 250],
  [700, 100], [500, 150], [400, 250], [300, 350], [100, 400], [80, 250]
];

export default class TopDownRacerGame extends MultiplayerGameBase {
  static logicalWidth = 800;
  static logicalHeight = 500;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.state = null;

    this.inputState = {
      steer: null, // 'left' | 'right' | null
      accel: null, // 'forward' | 'reverse' | null
      drift: false,
      usePowerup: false
    };

    this._boundHandlers = {};
  }

  async init() {
    this.bindSocket();
    this.bindInput();

    this.socket.emit('racer:ready', { code: this.room.code });
  }

  bindSocket() {
    const bind = (ev, fn) => {
      this._boundHandlers[ev] = fn;
      this.socket.on(ev, fn);
    };

    bind('racer:tick', (data) => {
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
        this.container.updateScore(myP.lap);
        this.container.updateOpponentScore(oppP.lap);
      }
    }
  }

  bindInput() {
    const updateInputs = () => {
      this.socket.emit('racer:input', {
        code: this.room.code,
        ...this.inputState
      });
      this.inputState.usePowerup = false; // reset after sending
    };

    const handleKey = (e, isDown) => {
      let changed = false;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        const next = isDown ? 'forward' : null;
        if (this.inputState.accel !== next) { this.inputState.accel = next; changed = true; }
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        const next = isDown ? 'reverse' : null;
        if (this.inputState.accel !== next) { this.inputState.accel = next; changed = true; }
      }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        const next = isDown ? 'left' : null;
        if (this.inputState.steer !== next) { this.inputState.steer = next; changed = true; }
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        const next = isDown ? 'right' : null;
        if (this.inputState.steer !== next) { this.inputState.steer = next; changed = true; }
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (this.inputState.drift !== isDown) { this.inputState.drift = isDown; changed = true; }
      }
      if (e.code === 'Space' || e.code === 'Enter') {
        if (isDown) {
          this.inputState.usePowerup = true;
          changed = true;
        }
      }

      if (changed && this.state) {
        e.preventDefault();
        updateInputs();
      }
    };

    this._onKeyDown = (e) => handleKey(e, true);
    this._onKeyUp = (e) => handleKey(e, false);

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  update(dt) {
    // client logic update if needed
  }

  render(ctx) {
    const cw = TopDownRacerGame.logicalWidth;
    const ch = TopDownRacerGame.logicalHeight;

    // Grass Background
    ctx.fillStyle = '#0f3813';
    ctx.fillRect(0, 0, cw, ch);

    if (!this.state) return;

    // Draw Curving Tarmac Track road
    const trackPoints = this.state.isTrackB ? TRACK_B : TRACK_A;

    // Road borders / Curbs
    ctx.strokeStyle = '#c0392b'; // red-white checkerboard curbs
    ctx.lineWidth = 52;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    trackPoints.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    });
    ctx.closePath();
    ctx.stroke();

    // Road asphalt
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 44;
    ctx.stroke();

    // Center Dashed Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([15, 20]);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // Draw Items box (Spinning rainbow items box)
    this.state.items.forEach(it => {
      if (!it.active) return;
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(Date.now() * 0.003);

      // Rainbow color gradient rotating
      const grad = ctx.createLinearGradient(-10, -10, 10, 10);
      grad.addColorStop(0, '#ffd93d');
      grad.addColorStop(0.5, '#6c5ce7');
      grad.addColorStop(1, '#ff7675');

      ctx.fillStyle = grad;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.roundRect(-10, -10, 20, 20, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // Draw Bananas on track
    this.state.bananas.forEach(b => {
      ctx.fillStyle = '#ffd93d';
      ctx.strokeStyle = '#b58900';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Draw Shell projectiles
    this.state.shells.forEach(s => {
      ctx.fillStyle = '#ff7675';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Draw Cars
    const colors = ['#6c5ce7', '#ffd93d', '#ff7675', '#00d4aa'];
    let idx = 0;
    for (const [id, player] of Object.entries(this.state.players)) {
      const isMe = id === this.mySocketId;
      const col = colors[idx % colors.length];
      idx++;

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);

      // Draw car body rectangle
      ctx.fillStyle = col;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isMe ? 2 : 1;

      ctx.beginPath();
      ctx.roundRect(-14, -8, 28, 16, 4);
      ctx.fill();
      ctx.stroke();

      // Windshield
      ctx.fillStyle = '#060810';
      ctx.fillRect(2, -5, 6, 10);

      // Spoiler on back
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-16, -9, 3, 18);

      // Spinout effect
      if (Date.now() < player.spinUntil) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Shield shield overlay
      if (Date.now() < player.shieldUntil) {
        ctx.strokeStyle = 'rgba(78, 205, 196, 0.6)';
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      // Display player label
      ctx.font = '10px "DM Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(isMe ? 'YOU' : player.displayName, player.x, player.y - 18);

      // Draw power-up text next to name if holding one
      if (player.powerup) {
        ctx.font = '9px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffd93d';
        ctx.fillText(`[${player.powerup.toUpperCase()}]`, player.x, player.y + 24);
      }
    }

    // Top Center Lap display
    const myCar = this.state.players[this.mySocketId];
    if (myCar) {
      ctx.font = 'bold 12px "Press Start 2P", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`LAP ${Math.min(3, myCar.lap)}/3`, cw/2, 35);
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
