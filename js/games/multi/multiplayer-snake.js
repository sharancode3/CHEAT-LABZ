import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const KEY_TO_DIR = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

const POWERUP_COLORS = {
  speed: '#3b82f6',
  shrink: '#eab308',
  ghost: '#a855f7'
};

export default class SnakeArenaGame extends MultiplayerGameBase {
  static logicalWidth = 600;
  static logicalHeight = 600;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.gameState = {
      snakes: {},     // id -> { body, direction, alive, score, color, ghost, boost }
      food: [],
      goldFood: null,
      powerups: [],
      gridSize: 30,
      roundWins: {},
      round: 1,
      phase: 'waiting', // 'waiting' | 'playing' | 'round-over'
    };

    // Interpolation state
    this.interpolatedSnakes = {}; // id -> body segments [{x, y}]
    this.interpolationTime = 0;
    this.interpolationDuration = 0.10; // 100ms (10Hz tick rate)

    this.cellSize = 20;
    this._boundHandlers = {};
    this._lastDir = null;
  }

  async init() {
    this.cellSize = 600 / this.gameState.gridSize;
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
      this.gameState.gridSize = data.gridSize;
      this.cellSize = 600 / this.gameState.gridSize;
      this.gameState.snakes = data.snakes;
      this.gameState.food = data.food;
      this.gameState.phase = 'playing';

      this.gameState.roundWins = {};
      data.players.forEach(p => this.gameState.roundWins[p.socketId] = 0);
      
      // Initialize interpolated state
      this.interpolatedSnakes = {};
      for (const id in data.snakes) {
        this.interpolatedSnakes[id] = data.snakes[id].body.map(([x, y]) => ({ x, y }));
      }
      this.interpolationTime = 0;
      this.updateHud();
    });

    bind('game:tick', (data) => {
      // Store current interpolated positions as start point
      const prevSnakes = {};
      for (const id in this.gameState.snakes) {
        const snake = this.gameState.snakes[id];
        if (this.interpolatedSnakes[id]) {
          prevSnakes[id] = this.interpolatedSnakes[id].map(seg => ({ ...seg }));
        } else {
          prevSnakes[id] = snake.body.map(([x, y]) => ({ x, y }));
        }
      }

      this.gameState.snakes = data.snakes;
      this.gameState.food = data.food;
      this.gameState.goldFood = data.goldFood;
      this.gameState.powerups = data.powerups;

      // Setup interpolation targets
      for (const id in data.snakes) {
        const targetBody = data.snakes[id].body;
        const prevBody = prevSnakes[id] || targetBody.map(([x, y]) => ({ x, y }));
        
        // If length changed or doesn't match, snap to target
        if (prevBody.length !== targetBody.length) {
          this.interpolatedSnakes[id] = targetBody.map(([x, y]) => ({ x, y }));
        } else {
          this.interpolatedSnakes[id] = prevBody;
        }
      }
      
      this.interpolationTime = 0;
      this.updateHud();
    });

    bind('snake:new-round', ({ round, roundWins }) => {
      this.gameState.round = round;
      this.gameState.roundWins = roundWins;
      this.gameState.phase = 'playing';
      this.updateHud();
    });

    bind('snake:round-over', ({ winner, roundWins }) => {
      this.gameState.roundWins = roundWins;
      this.gameState.phase = 'round-over';
      this.updateHud();
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
    // Increment interpolation step
    this.interpolationTime = Math.min(this.interpolationDuration, this.interpolationTime + dt);
    const t = this.interpolationTime / this.interpolationDuration;

    // Linearly interpolate positions of snake segments
    for (const id in this.gameState.snakes) {
      const targetSnake = this.gameState.snakes[id];
      if (!targetSnake || !targetSnake.alive) continue;

      const currentInterp = this.interpolatedSnakes[id];
      const targetBody = targetSnake.body;

      if (currentInterp && targetBody && currentInterp.length === targetBody.length) {
        for (let i = 0; i < targetBody.length; i++) {
          const start = currentInterp[i];
          const end = targetBody[i];
          // Handle grid wrapping if any by wrapping coords correctly
          let dx = end[0] - start.x;
          let dy = end[1] - start.y;

          // Simple wrap interpolation support if boundaries are wrapped
          if (Math.abs(dx) > 1.5) dx = dx > 0 ? dx - this.gameState.gridSize : dx + this.gameState.gridSize;
          if (Math.abs(dy) > 1.5) dy = dy > 0 ? dy - this.gameState.gridSize : dy + this.gameState.gridSize;

          start.x += dx * t;
          start.y += dy * t;
        }
      }
    }
  }

  render(ctx) {
    const cw = SnakeArenaGame.logicalWidth;
    const ch = SnakeArenaGame.logicalHeight;
    const cs = this.cellSize;

    // Dark grid background
    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, cw, ch);

    // Subtle background lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= this.gameState.gridSize; i++) {
      ctx.moveTo(i * cs, 0); ctx.lineTo(i * cs, ch);
      ctx.moveTo(0, i * cs); ctx.lineTo(cw, i * cs);
    }
    ctx.stroke();

    // Food
    this.gameState.food.forEach(([fx, fy]) => {
      ctx.fillStyle = '#EF4444';
      ctx.shadowColor = '#EF4444';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(fx * cs + cs/2, fy * cs + cs/2, cs*0.4, 0, Math.PI*2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // Gold Food
    if (this.gameState.goldFood) {
      const [gx, gy] = this.gameState.goldFood;
      ctx.fillStyle = '#F59E0B';
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(gx * cs + cs/2, gy * cs + cs/2, cs*0.5, 0, Math.PI*2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Powerups
    this.gameState.powerups.forEach(p => {
      const [px, py] = p.pos;
      const col = POWERUP_COLORS[p.type] || '#ffffff';
      ctx.fillStyle = col;
      ctx.beginPath();
      const cx = px*cs + cs/2, cy = py*cs + cs/2;
      ctx.moveTo(cx, cy - cs*0.4);
      ctx.lineTo(cx + cs*0.4, cy + cs*0.4);
      ctx.lineTo(cx - cs*0.4, cy + cs*0.4);
      ctx.fill();
    });

    // Snakes
    for (const [id, snake] of Object.entries(this.gameState.snakes)) {
      if (!snake.alive) continue;

      const isMe = id === this.mySocketId;
      let color = snake.color || (isMe ? '#6c63ff' : '#ff6b6b');

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
          ctx.fillStyle = color;
          if (i === 0) {
            // Head
            ctx.beginPath();
            ctx.roundRect(seg.x * cs + 1, seg.y * cs + 1, cs - 2, cs - 2, 5);
            ctx.fill();
            // Eye dots
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(seg.x * cs + cs/2, seg.y * cs + cs/2, 2.5, 0, Math.PI*2);
            ctx.fill();
          } else {
            // Tail scaling down
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

    if (this.gameState.phase === 'round-over') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, cw, ch);
      ctx.font = 'bold 20px "Press Start 2P", monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText('ROUND OVER', cw/2, ch/2);
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
