import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const KEY_TO_DIR = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

const POWERUP_COLORS = {
  speed: '#ffd93d', // speed = yellow
  shrink: '#3b82f6', // shrink = blue
};

export default class SnakeArenaGame extends MultiplayerGameBase {
  static logicalWidth = 540;
  static logicalHeight = 540;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.gameState = {
      snakes: {},     // id -> { body, direction, alive, score, color, ghost, boost }
      food: [],
      goldFood: null,
      powerups: [],
      gridSize: 30,
      gridShrinkLevel: 0,
      roundWins: {},
      round: 1,
      phase: 'waiting', // 'waiting' | 'playing' | 'round-over'
    };

    this.obstacles = [];
    this.deadSnakes = {}; // id -> { body, progress, color }
    this.powerupRotation = 0.0;
    this.roundWinner = null;

    // Interpolation state
    this.previousSnakes = {};
    this.currentSnakes = {};
    this.interpolatedSnakes = {};
    this.timeSinceLastUpdate = 0;
    this.interpolationDuration = 0.10; // 100ms (10Hz tick rate)

    this._boundHandlers = {};
    this._lastDir = null;
  }

  async init() {
    this.bindSocket();
    this.bindInput();

    this.socket.emit('snake:ready', { code: this.room.code });
  }

  bindSocket() {
    const bind = (ev, fn) => {
      this._boundHandlers[ev] = fn;
      this.socket.on(ev, fn);
    };

    bind('snake:init', (data) => {
      this.gameState.gridSize = data.gridSize || 30;
      this.gameState.snakes = data.snakes;
      this.gameState.food = data.food;
      this.gameState.phase = 'playing';
      this.gameState.gridShrinkLevel = data.gridShrinkLevel || 0;
      this.obstacles = data.obstacles || [];
      this.deadSnakes = {};
      this.roundWinner = null;

      this.gameState.roundWins = {};
      data.players.forEach(p => this.gameState.roundWins[p.socketId] = 0);
      
      // Initialize interpolated state
      this.previousSnakes = {};
      this.currentSnakes = {};
      this.interpolatedSnakes = {};
      for (const id in data.snakes) {
        const bodyCoords = data.snakes[id].body.map(([x, y]) => ({ x, y }));
        this.previousSnakes[id] = bodyCoords.map(c => ({ ...c }));
        this.currentSnakes[id]  = bodyCoords.map(c => ({ ...c }));
        this.interpolatedSnakes[id] = bodyCoords.map(c => ({ ...c }));
      }
      this.timeSinceLastUpdate = 0;
      this.updateHud();
    });

    bind('game:tick', (data) => {
      // Store current positions as start point for new interpolation step
      this.previousSnakes = {};
      for (const id in this.gameState.snakes) {
        const snake = this.gameState.snakes[id];
        if (this.currentSnakes[id]) {
          this.previousSnakes[id] = this.currentSnakes[id].map(seg => ({ ...seg }));
        } else {
          this.previousSnakes[id] = snake.body.map(([x, y]) => ({ x, y }));
        }
      }

      // Merge new data
      if (data.snakes) {
        for (const id in data.snakes) {
          const oldSnake = this.gameState.snakes[id];
          const newSnake = data.snakes[id];
          this.gameState.snakes[id] = newSnake;

          // If a snake just died, transition it to deadSnakes for animation
          if (oldSnake && oldSnake.alive && !newSnake.alive) {
            const isMe = id === this.mySocketId;
            const color = isMe ? '#00d4aa' : '#fd79a8';
            this.deadSnakes[id] = {
              body: oldSnake.body.map(([x, y]) => ({ x, y })),
              color: color,
              progress: 1.0
            };
          }
        }
      }
      if (data.food !== undefined) this.gameState.food = data.food;
      if (data.goldFood !== undefined) this.gameState.goldFood = data.goldFood;
      if (data.powerups !== undefined) this.gameState.powerups = data.powerups;
      if (data.gridShrinkLevel !== undefined) this.gameState.gridShrinkLevel = data.gridShrinkLevel;

      // Set target endpoints
      this.currentSnakes = {};
      for (const id in this.gameState.snakes) {
        const snake = this.gameState.snakes[id];
        this.currentSnakes[id] = snake.body.map(([x, y]) => ({ x, y }));
      }

      this.timeSinceLastUpdate = 0;
      this.updateHud();
    });

    bind('snake:grid-shrink', ({ level }) => {
      this.gameState.gridShrinkLevel = level;
      if (this.container) {
        this.container.audio.play('damage');
      }
    });

    bind('snake:new-round', ({ round, roundWins, obstacles, gridShrinkLevel, food }) => {
      this.gameState.round = round;
      this.gameState.roundWins = roundWins;
      this.gameState.phase = 'playing';
      this.gameState.gridShrinkLevel = gridShrinkLevel || 0;
      this.obstacles = obstacles || [];
      this.previousSnakes = {};
      this.currentSnakes = {};
      this.interpolatedSnakes = {};
      this.deadSnakes = {};
      this.roundWinner = null;
      this.timeSinceLastUpdate = 0;
      if (food) this.gameState.food = food;
      this.updateHud();
    });

    bind('snake:round-over', ({ winner, roundWins }) => {
      this.gameState.roundWins = roundWins;
      this.gameState.phase = 'round-over';
      this.roundWinner = winner;
      this.updateHud();
    });

    bind('snake:died', ({ socketId, reason }) => {
      if (this.container && socketId === this.mySocketId) {
        this.container.audio.play('damage');
      }

      // Add to dead snakes if not already done
      const snake = this.gameState.snakes[socketId];
      if (snake && !this.deadSnakes[socketId]) {
        const isMe = socketId === this.mySocketId;
        const color = isMe ? '#00d4aa' : '#fd79a8';
        this.deadSnakes[socketId] = {
          body: snake.body.map(([x, y]) => ({ x, y })),
          color: color,
          progress: 1.0
        };
      }
    });

    bind('snake:ate', ({ socketId }) => {
      if (this.container && socketId === this.mySocketId) {
        this.container.audio.play('hit');
      }
    });

    bind('snake:ate-gold', ({ socketId }) => {
      if (this.container && socketId === this.mySocketId) {
        this.container.audio.play('coin');
      }
    });
  }

  updateHud() {
    const oppId = this.opponent?.socketId;
    const myScore = this.gameState.roundWins[this.mySocketId] || 0;
    const oppScore = this.gameState.roundWins[oppId] || 0;

    if (this.container) {
      this.container.updateScore(myScore);
      this.container.updateOpponentScore(oppScore);
    }
  }

  bindInput() {
    this._onKey = (e) => {
      const dir = KEY_TO_DIR[e.code];
      if (dir && dir !== this._lastDir && this.gameState.phase === 'playing') {
        e.preventDefault();
        this._lastDir = dir;
        this.socket.emit('snake:direction', { code: this.room.code, dir });
      }
    };
    document.addEventListener('keydown', this._onKey);
  }

  update(dt) {
    this.timeSinceLastUpdate += dt;
    const t = Math.min(1.0, this.timeSinceLastUpdate / this.interpolationDuration);

    // Spin power-ups
    this.powerupRotation += 4.5 * dt;

    // Fade out dead snakes
    for (const id in this.deadSnakes) {
      const ds = this.deadSnakes[id];
      ds.progress -= dt * 2.0;
      if (ds.progress <= 0) {
        delete this.deadSnakes[id];
      }
    }

    // Linearly interpolate positions of snake segments
    this.interpolatedSnakes = {};
    for (const id in this.gameState.snakes) {
      const targetSnake = this.gameState.snakes[id];
      if (!targetSnake || !targetSnake.alive) continue;

      const prev = this.previousSnakes[id] || targetSnake.body.map(([x, y]) => ({ x, y }));
      const curr = this.currentSnakes[id] || targetSnake.body.map(([x, y]) => ({ x, y }));

      this.interpolatedSnakes[id] = curr.map((cSeg, idx) => {
        const pSeg = prev[idx] || cSeg;
        let dx = cSeg.x - pSeg.x;
        let dy = cSeg.y - pSeg.y;

        // Wrap coordinates if they cross the board edge
        if (Math.abs(dx) > 1.5) dx = dx > 0 ? dx - this.gameState.gridSize : dx + this.gameState.gridSize;
        if (Math.abs(dy) > 1.5) dy = dy > 0 ? dy - this.gameState.gridSize : dy + this.gameState.gridSize;

        return {
          x: pSeg.x + dx * t,
          y: pSeg.y + dy * t
        };
      });
    }
  }

  render(ctx) {
    const cw = SnakeArenaGame.logicalWidth;
    const ch = SnakeArenaGame.logicalHeight;
    const cs = 18; // cellSize (540 / 30 = 18)

    // Dark grid background
    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, cw, ch);

    // Subtle background grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= this.gameState.gridSize; i++) {
      ctx.moveTo(i * cs, 0); ctx.lineTo(i * cs, ch);
      ctx.moveTo(0, i * cs); ctx.lineTo(cw, i * cs);
    }
    ctx.stroke();

    // Draw permanent obstacles (Round 2 obstacles)
    if (this.obstacles) {
      this.obstacles.forEach(([ox, oy]) => {
        ctx.fillStyle = '#4a4a5a'; // permanent wall obstacle color
        ctx.strokeStyle = '#2e2e3a';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.roundRect(ox * cs + 1, oy * cs + 1, cs - 2, cs - 2, 4);
        ctx.fill();
        ctx.stroke();

        // Shading cross
        ctx.beginPath();
        ctx.moveTo(ox * cs + 4, oy * cs + 4);
        ctx.lineTo(ox * cs + cs - 4, oy * cs + cs - 4);
        ctx.stroke();
      });
    }

    // Food rendering (Red dots)
    this.gameState.food.forEach(([fx, fy]) => {
      ctx.fillStyle = '#ff7675';
      ctx.shadowColor = '#ff7675';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(fx * cs + cs/2, fy * cs + cs/2, cs * 0.45, 0, Math.PI*2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // Gold Food
    if (this.gameState.goldFood) {
      const [gx, gy] = this.gameState.goldFood;
      ctx.fillStyle = '#ffd93d';
      ctx.shadowColor = '#ffd93d';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(gx * cs + cs/2, gy * cs + cs/2, cs * 0.55, 0, Math.PI*2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Powerups (Spinning diamonds)
    this.gameState.powerups.forEach(p => {
      const [px, py] = p.pos;
      const col = POWERUP_COLORS[p.type] || '#ffffff';
      
      ctx.save();
      const cx = px * cs + cs / 2;
      const cy = py * cs + cs / 2;
      const r = cs * 0.45;

      ctx.translate(cx, cy);
      ctx.rotate(this.powerupRotation);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // Draw hazard border for shrunk boundaries
    if (this.gameState.gridShrinkLevel > 0) {
      const minCoord = this.gameState.gridShrinkLevel;
      const maxCoord = this.gameState.gridSize - 1 - minCoord;

      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'; // red translucent warning area
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.0;

      for (let x = 0; x < this.gameState.gridSize; x++) {
        for (let y = 0; y < this.gameState.gridSize; y++) {
          if (x < minCoord || x > maxCoord || y < minCoord || y > maxCoord) {
            ctx.fillRect(x * cs, y * cs, cs, cs);
            ctx.strokeRect(x * cs, y * cs, cs, cs);
          }
        }
      }
    }

    // Alive Snakes
    for (const [id, snake] of Object.entries(this.gameState.snakes)) {
      if (!snake.alive) continue;

      const isMe = id === this.mySocketId;
      const color = isMe ? '#00d4aa' : '#fd79a8'; // Me = accent color (#00d4aa), Opponent = complementary color (#fd79a8)

      ctx.save();
      if (snake.ghost) {
        ctx.globalAlpha = 0.4;
      }
      if (snake.boost) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
      }

      const interpBody = this.interpolatedSnakes[id];
      if (interpBody) {
        interpBody.forEach((seg, i) => {
          if (i === 0) {
            // Head (Bright solid color)
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(seg.x * cs + 1, seg.y * cs + 1, cs - 2, cs - 2, 4);
            ctx.fill();
            // Eye dots
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(seg.x * cs + cs/2, seg.y * cs + cs/2, 2.0, 0, Math.PI*2);
            ctx.fill();
          } else {
            // Gradient Tail (fading tail segment scaling down)
            const alpha = Math.max(0.2, 1.0 - (i / interpBody.length) * 0.7);
            ctx.fillStyle = color;
            ctx.globalAlpha = alpha;

            const s = Math.max(0.5, 1 - (i / interpBody.length) * 0.45);
            const pad = (cs - (cs * s)) / 2;
            ctx.beginPath();
            ctx.roundRect(seg.x * cs + pad, seg.y * cs + pad, cs * s, cs * s, 3);
            ctx.fill();
          }
        });
      }
      ctx.restore();
    }

    // Dead Snakes (Flashing and Fading Out)
    for (const [id, ds] of Object.entries(this.deadSnakes)) {
      ctx.save();
      const flash = Math.floor(ds.progress * 15) % 2 === 0;
      ctx.globalAlpha = ds.progress * (flash ? 0.8 : 0.25);
      ctx.fillStyle = ds.color;

      ds.body.forEach((seg, i) => {
        const s = Math.max(0.5, 1 - (i / ds.body.length) * 0.45);
        const pad = (cs - (cs * s)) / 2;
        ctx.beginPath();
        ctx.roundRect(seg.x * cs + pad, seg.y * cs + pad, cs * s, cs * s, 3);
        ctx.fill();
      });
      ctx.restore();
    }

    // Outcome display
    if (this.gameState.phase === 'round-over') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, cw, ch);
      
      const isWinner = this.roundWinner === this.mySocketId;
      const text = isWinner ? 'ROUND WON' : 'ROUND LOST';
      const textColor = isWinner ? '#00d4aa' : '#ff7675';

      ctx.font = 'bold 20px "Press Start 2P", monospace';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.fillText(text, cw/2, ch/2);
    }
  }

  destroy() {
    document.removeEventListener('keydown', this._onKey);
    for (const [ev, fn] of Object.entries(this._boundHandlers)) {
      this.socket.off(ev, fn);
    }
    super.destroy();
  }
}
