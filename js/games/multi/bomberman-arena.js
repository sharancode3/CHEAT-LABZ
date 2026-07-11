import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const GRID_SIZE = 16;
const CELL_SIZE = 32.5; // 520 / 16 = 32.5

export default class BombermanArenaGame extends MultiplayerGameBase {
  static logicalWidth = 520;
  static logicalHeight = 520;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.state = null;

    this.inputState = {
      up: false,
      down: false,
      left: false,
      right: false,
      placeBomb: false
    };

    this._boundHandlers = {};
  }

  async init() {
    this.bindSocket();
    this.bindInput();

    this.socket.emit('bomberman:ready', { code: this.room.code });
  }

  bindSocket() {
    const bind = (ev, fn) => {
      this._boundHandlers[ev] = fn;
      this.socket.on(ev, fn);
    };

    bind('bomberman:tick', (data) => {
      this.state = data;
      this.updateHud();
    });

    bind('bomberman:player-died', ({ socketId }) => {
      if (this.container && socketId === this.mySocketId) {
        this.container.audio.play('damage');
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
        this.container.updateScore(myP.alive ? 1 : 0);
        this.container.updateOpponentScore(oppP.alive ? 1 : 0);
      }
    }
  }

  bindInput() {
    const handleKey = (e, isDown) => {
      let changed = false;
      let placeBomb = false;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (this.inputState.up !== isDown) { this.inputState.up = isDown; changed = true; }
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        if (this.inputState.down !== isDown) { this.inputState.down = isDown; changed = true; }
      }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        if (this.inputState.left !== isDown) { this.inputState.left = isDown; changed = true; }
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        if (this.inputState.right !== isDown) { this.inputState.right = isDown; changed = true; }
      }
      if (e.code === 'Space' || e.code === 'Enter') {
        if (isDown) {
          placeBomb = true;
          changed = true;
        }
      }

      if (changed && this.state) {
        e.preventDefault();
        this.socket.emit('bomberman:input', {
          code: this.room.code,
          ...this.inputState,
          placeBomb
        });
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
    const cw = BombermanArenaGame.logicalWidth;
    const ch = BombermanArenaGame.logicalHeight;

    ctx.fillStyle = '#0f172a'; // dark background
    ctx.fillRect(0, 0, cw, ch);

    if (!this.state) return;

    // Draw Grid (Arena Map)
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const type = this.state.grid[r][c];
        const gx = c * CELL_SIZE;
        const gy = r * CELL_SIZE;

        if (type === 'HARD') {
          // Hard walls - beveled grey boxes
          ctx.fillStyle = '#334155';
          ctx.fillRect(gx, gy, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(gx + 1, gy + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        } else if (type === 'SOFT') {
          // Soft breakable walls - beveled brown boxes
          ctx.fillStyle = '#b45309';
          ctx.fillRect(gx, gy, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(gx + 1, gy + 1, CELL_SIZE - 2, CELL_SIZE - 2);

          // Brick lines pattern
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.beginPath();
          ctx.moveTo(gx, gy + CELL_SIZE/2); ctx.lineTo(gx + CELL_SIZE, gy + CELL_SIZE/2);
          ctx.moveTo(gx + CELL_SIZE/2, gy); ctx.lineTo(gx + CELL_SIZE/2, gy + CELL_SIZE/2);
          ctx.moveTo(gx + CELL_SIZE/4, gy + CELL_SIZE/2); ctx.lineTo(gx + CELL_SIZE/4, gy + CELL_SIZE);
          ctx.stroke();
        } else {
          // Floor details
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(gx, gy, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = 'rgba(255,255,255,0.015)';
          ctx.strokeRect(gx, gy, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    // Powerups
    this.state.powerups.forEach(pu => {
      const px = pu.gridX * CELL_SIZE + CELL_SIZE/2;
      const py = pu.gridY * CELL_SIZE + CELL_SIZE/2;
      
      ctx.save();
      ctx.fillStyle = pu.type === 'bomb' ? '#e2e8f0' : (pu.type === 'range' ? '#ef4444' : '#ffd93d');
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    });

    // Draw Bombs
    this.state.bombs.forEach(b => {
      ctx.save();
      // Draw pulsing bomb
      const scale = 1.0 + Math.sin(Date.now() * 0.015) * 0.1;
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#312e81';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(b.x, b.y, 11 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Fuse line
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y - 10 * scale);
      ctx.quadraticCurveTo(b.x + 8, b.y - 18, b.x + 12, b.y - 12);
      ctx.stroke();

      // Fuse spark
      ctx.fillStyle = '#ffd93d';
      ctx.beginPath();
      ctx.arc(b.x + 12, b.y - 12, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw Active Blasts (Explosion)
    this.state.blasts.forEach(b => {
      ctx.save();
      ctx.fillStyle = 'rgba(249, 115, 22, 0.75)'; // Orange fire
      
      b.cells.forEach(([gx, gy]) => {
        const x = gx * CELL_SIZE + 1;
        const y = gy * CELL_SIZE + 1;
        const size = CELL_SIZE - 2;

        ctx.fillRect(x, y, size, size);

        // Core white flame inside center cells
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + size*0.25, y + size*0.25, size*0.5, size*0.5);
        ctx.fillStyle = 'rgba(249, 115, 22, 0.75)';
      });
      ctx.restore();
    });

    // Draw Players
    for (const [id, player] of Object.entries(this.state.players)) {
      if (!player.alive) continue;

      const px = player.x;
      const py = player.y;
      const pr = 10; // player collision radius is 10

      const isMe = id === this.mySocketId;

      ctx.save();
      ctx.fillStyle = player.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isMe ? 2.5 : 1.5;

      // Draw player circle body
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Face indicator (eyes/head outline)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Player name text
      ctx.font = '10px "DM Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(isMe ? 'YOU' : player.displayName, px, py - 14);

      ctx.restore();
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
