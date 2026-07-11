import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const GRID_SIZE = 12;
const CELL_SIZE = 36;
const GRID_X = 74;
const GRID_Y = 50;

const COLORS = [
  '#ff7675', // Red
  '#2ecc71', // Green
  '#f1c40f', // Yellow
  '#0984e3', // Blue
  '#a29bfe'  // Purple
];

export default class ColorFloodDuelGame extends MultiplayerGameBase {
  static logicalWidth = 580;
  static logicalHeight = 580;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.state = null;
    this.mousePos = { x: 0, y: 0 };
    this.popTimers = {}; // key -> remaining animation time

    this._boundHandlers = {};
  }

  async init() {
    this.bindSocket();
    this.bindInput();

    this.socket.emit('flood:ready', { code: this.room.code });
  }

  bindSocket() {
    const bind = (ev, fn) => {
      this._boundHandlers[ev] = fn;
      this.socket.on(ev, fn);
    };

    bind('flood:state', (data) => {
      // Trigger pop animations for new cells in territory
      if (this.state && data.territories) {
        const oldMyTerritory = new Set(this.state.territories[this.mySocketId] || []);
        const newMyTerritory = data.territories[this.mySocketId] || [];
        
        newMyTerritory.forEach(cellStr => {
          if (!oldMyTerritory.has(cellStr)) {
            this.popTimers[cellStr] = 0.35; // 350ms pop animation
          }
        });
      }

      this.state = data;
      this.updateHud();
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
      const myScore = this.state.scores[this.mySocketId] || 0;
      const oppScore = this.state.scores[oppId] || 0;

      this.container.updateScore(myScore);
      this.container.updateOpponentScore(oppScore);
    }
  }

  bindInput() {
    this._onClick = (e) => {
      if (!this.state || this.state.currentTurn !== this.mySocketId) return;

      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (ColorFloodDuelGame.logicalWidth / rect.width);
      const my = (e.clientY - rect.top)  * (ColorFloodDuelGame.logicalHeight / rect.height);

      // Check clicks on the 5 color picker circles below grid
      const pickerY = 525;
      const startX = 110;
      const gap = 90;

      for (let i = 0; i < 5; i++) {
        const cx = startX + i * gap;
        const dist = Math.hypot(mx - cx, my - pickerY);
        if (dist < 22) {
          // Check if color is grayed out (cannot pick my current color or opponent's current color)
          const myColor = this.state.grid[0][0];
          const oppColor = this.state.grid[GRID_SIZE - 1][GRID_SIZE - 1];
          
          if (i !== myColor && i !== oppColor) {
            this.socket.emit('flood:choose', { code: this.room.code, colorIndex: i });
            if (this.container) {
              this.container.audio.play('hit');
            }
          }
          break;
        }
      }
    };

    this._onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = (e.clientX - rect.left) * (ColorFloodDuelGame.logicalWidth / rect.width);
      this.mousePos.y = (e.clientY - rect.top)  * (ColorFloodDuelGame.logicalHeight / rect.height);
    };

    this.canvas.addEventListener('click', this._onClick);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
  }

  update(dt) {
    // Tick pop timers
    for (const key in this.popTimers) {
      this.popTimers[key] -= dt;
      if (this.popTimers[key] <= 0) {
        delete this.popTimers[key];
      }
    }
  }

  render(ctx) {
    const cw = ColorFloodDuelGame.logicalWidth;
    const ch = ColorFloodDuelGame.logicalHeight;

    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, cw, ch);

    if (!this.state) return;

    const myTerritory = new Set(this.state.territories[this.mySocketId] || []);
    const oppId = this.opponent?.socketId;
    const oppTerritory = new Set(this.state.territories[oppId] || []);

    const myColor = this.state.grid[0][0];
    const oppColor = this.state.grid[GRID_SIZE - 1][GRID_SIZE - 1];

    // Draw grid border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(GRID_X - 1, GRID_Y - 1, GRID_SIZE * CELL_SIZE + 2, GRID_SIZE * CELL_SIZE + 2);

    // Draw Grid cells
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const colIdx = this.state.grid[r][c];
        const key = `${c},${r}`;
        const isMyCell = myTerritory.has(key);
        const isOppCell = oppTerritory.has(key);

        const gx = GRID_X + c * CELL_SIZE;
        const gy = GRID_Y + r * CELL_SIZE;

        ctx.save();
        ctx.fillStyle = COLORS[colIdx];
        ctx.fillRect(gx, gy, CELL_SIZE, CELL_SIZE);

        // Apply dark overlay to opponent cells, bright highlight to yours
        if (isMyCell) {
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(gx, gy, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.0;
          ctx.strokeRect(gx, gy, CELL_SIZE, CELL_SIZE);
        } else if (isOppCell) {
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(gx, gy, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.lineWidth = 1.0;
          ctx.strokeRect(gx, gy, CELL_SIZE, CELL_SIZE);
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.03)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(gx, gy, CELL_SIZE, CELL_SIZE);
        }

        // Draw pop animation scaling
        if (this.popTimers[key] > 0) {
          const t = this.popTimers[key] / 0.35;
          const popSize = CELL_SIZE * (1.0 + Math.sin(t * Math.PI) * 0.15);
          ctx.fillStyle = COLORS[colIdx];
          ctx.fillRect(gx + (CELL_SIZE - popSize)/2, gy + (CELL_SIZE - popSize)/2, popSize, popSize);
        }
        ctx.restore();
      }
    }

    // Turn info Banner / Stats
    ctx.font = 'bold 12px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    
    if (this.state.currentTurn === null) {
      ctx.fillStyle = '#ffffff';
      ctx.fillText('MATCH COMPLETED', cw/2, 32);
    } else {
      const myTurn = this.state.currentTurn === this.mySocketId;
      ctx.fillStyle = myTurn ? '#00d4aa' : '#ff7675';
      ctx.fillText(myTurn ? 'YOUR TURN' : "OPPONENT'S TURN", cw/2, 32);
    }

    // Color Pickers below grid
    const pickerY = 525;
    const startX = 110;
    const gap = 90;

    for (let i = 0; i < 5; i++) {
      const cx = startX + i * gap;
      const isSelectable = i !== myColor && i !== oppColor;
      const isHovered = isSelectable && Math.hypot(this.mousePos.x - cx, this.mousePos.y - pickerY) < 22;

      ctx.save();
      ctx.fillStyle = COLORS[i];
      ctx.shadowBlur = isHovered ? 12 : 0;
      ctx.shadowColor = COLORS[i];

      // Draw color option
      ctx.beginPath();
      ctx.arc(cx, pickerY, isHovered ? 20 : 18, 0, Math.PI * 2);
      ctx.fill();

      // Border outline
      ctx.strokeStyle = isSelectable ? '#ffffff' : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.stroke();

      // Draw cross indicator on non-selectable options
      if (!isSelectable) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.arc(cx, pickerY, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(cx - 8, pickerY - 8); ctx.lineTo(cx + 8, pickerY + 8);
        ctx.moveTo(cx + 8, pickerY - 8); ctx.lineTo(cx - 8, pickerY + 8);
        ctx.stroke();
      }
      ctx.restore();
    }
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
