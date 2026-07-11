import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const SERVER_FIELD_W = 800;
const SERVER_FIELD_H = 500;

export default class PhysicsSoccerGame extends MultiplayerGameBase {
  static logicalWidth = 720;
  static logicalHeight = 480;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.state = {
      ball: { x: SERVER_FIELD_W/2, y: SERVER_FIELD_H/2, radius: 15 },
      players: {},
      scores: [0, 0],
      timeLeft: 180,
      phase: 'playing',
      powerup: null
    };

    this.scaleX = PhysicsSoccerGame.logicalWidth / SERVER_FIELD_W;
    this.scaleY = PhysicsSoccerGame.logicalHeight / SERVER_FIELD_H;

    // Controls input state
    this.inputState = {
      up: false,
      down: false,
      left: false,
      right: false,
      boost: false
    };

    this.flashTime = 0.0;
    this.prevPhase = 'playing';

    this._boundHandlers = {};
  }

  async init() {
    this.bindSocket();
    this.bindInput();

    this.socket.emit('soccer:ready', { code: this.room.code });
  }

  bindSocket() {
    const bind = (ev, fn) => {
      this._boundHandlers[ev] = fn;
      this.socket.on(ev, fn);
    };

    bind('soccer:tick', (data) => {
      this.state = data;
      this.updateHud();

      // Trigger flash on goal scored
      if (this.state.phase === 'goal_scored' && this.prevPhase === 'playing') {
        this.flashTime = 0.5; // flash for 500ms
        if (this.container) {
          this.container.audio.play('coin');
        }
      }
      this.prevPhase = this.state.phase;
    });

    bind('game:over', ({ winner }) => {
      this.state.phase = 'finished';
      if (this.container) {
        this.container.audio.play('damage');
      }
    });
  }

  updateHud() {
    if (this.container) {
      // Sync scores with sidebar HUD
      const oppId = this.opponent?.socketId;
      const myPlayer = this.state.players[this.mySocketId];
      const oppPlayer = this.state.players[oppId];

      if (myPlayer && oppPlayer) {
        this.container.updateScore(this.state.scores[myPlayer.team]);
        this.container.updateOpponentScore(this.state.scores[oppPlayer.team]);
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
      if (e.code === 'Space') { this.inputState.boost = isDown; changed = true; }

      if (changed && this.state.phase === 'playing') {
        e.preventDefault();
        this.socket.emit('soccer:input', {
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
    if (this.flashTime > 0) {
      this.flashTime -= dt;
    }
  }

  render(ctx) {
    const cw = PhysicsSoccerGame.logicalWidth;
    const ch = PhysicsSoccerGame.logicalHeight;

    // Field (Dark green rectangle)
    ctx.fillStyle = '#1e3f20';
    ctx.fillRect(0, 0, cw, ch);

    // Grid grass texture rows
    ctx.fillStyle = '#17361a';
    const rowH = ch / 10;
    for (let i = 0; i < 10; i += 2) {
      ctx.fillRect(0, i * rowH, cw, rowH);
    }

    // White field markings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    
    // Borders
    ctx.strokeRect(4, 4, cw - 8, ch - 8);

    // Center line
    ctx.beginPath();
    ctx.moveTo(cw/2, 4);
    ctx.lineTo(cw/2, ch - 4);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(cw/2, ch/2, 60, 0, Math.PI*2);
    ctx.stroke();

    // Goal boxes
    const goalH = 120 * this.scaleY;
    const goalY = (ch - goalH) / 2;
    ctx.strokeRect(4, goalY, 50 * this.scaleX, goalH);
    ctx.strokeRect(cw - 50 * this.scaleX - 4, goalY, 50 * this.scaleX, goalH);

    // Goal nets background
    ctx.fillStyle = '#060810';
    ctx.fillRect(0, goalY, 4, goalH);
    ctx.fillRect(cw - 4, goalY, 4, goalH);

    // Power-up
    if (this.state.powerup) {
      const p = this.state.powerup;
      const px = p.x * this.scaleX;
      const py = p.y * this.scaleY;
      const pr = p.radius * this.scaleX;

      const colors = { speed: '#ffd93d', magnet: '#a855f7', kick: '#ff4757' };
      ctx.fillStyle = colors[p.type] || '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Players
    for (const [id, player] of Object.entries(this.state.players)) {
      const px = player.x * this.scaleX;
      const py = player.y * this.scaleY;
      const pr = player.radius * this.scaleX;

      const isMe = id === this.mySocketId;
      const teamColor = player.team === 0 ? '#ffd93d' : '#00d4aa';

      // Player circle
      ctx.fillStyle = teamColor;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI*2);
      ctx.fill();

      // Shadow / Outline
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isMe ? 2 : 1;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI*2);
      ctx.stroke();

      // Draw Boost bar below player circle as an arc
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py + pr + 6, pr * 0.7, 0, Math.PI);
      ctx.stroke();

      // Active / Cooldown boost arc highlight
      if (player.boostCooldown > 0) {
        ctx.strokeStyle = '#ef4444';
        const cooldownAngle = (player.boostCooldown / 3000) * Math.PI;
        ctx.beginPath();
        ctx.arc(px, py + pr + 6, pr * 0.7, 0, cooldownAngle);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#ffd93d';
        ctx.beginPath();
        ctx.arc(px, py + pr + 6, pr * 0.7, 0, Math.PI);
        ctx.stroke();
      }

      // Player Label
      ctx.font = '10px "DM Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(isMe ? 'YOU' : 'OPPONENT', px, py - pr - 6);
    }

    // Draw Ball
    const bx = this.state.ball.x * this.scaleX;
    const by = this.state.ball.y * this.scaleY;
    const br = this.state.ball.radius * this.scaleX;

    this.drawBall(ctx, bx, by, br);

    // Display Goals Text / Timer
    ctx.font = "bold 13px 'Press Start 2P', monospace";
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const minutes = Math.floor(this.state.timeLeft / 60);
    const seconds = Math.floor(this.state.timeLeft % 60).toString().padStart(2, '0');
    ctx.fillText(`${minutes}:${seconds}`, cw / 2, 35);

    if (this.state.phase === 'goal_scored') {
      ctx.font = "bold 20px 'Press Start 2P', monospace";
      ctx.fillStyle = '#ffd93d';
      ctx.fillText('GOAL SCORED!', cw/2, ch/2);
    }

    // White Flash on goals
    if (this.flashTime > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.flashTime / 0.5})`;
      ctx.fillRect(0, 0, cw, ch);
    }
  }

  drawBall(ctx, bx, by, r) {
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();

    // Hexagon pattern
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const hx = bx + Math.cos(angle) * (r * 0.4);
      const hy = by + Math.sin(angle) * (r * 0.4);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();

    // Star lines connecting vertices to outer edge
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      ctx.moveTo(bx + Math.cos(angle) * (r * 0.4), by + Math.sin(angle) * (r * 0.4));
      ctx.lineTo(bx + Math.cos(angle) * r, by + Math.sin(angle) * r);
    }
    ctx.stroke();
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
