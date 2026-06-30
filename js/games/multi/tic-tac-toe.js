import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const CELL_SIZE = 130;
const GRID_GAP  = 8;
const GRID_START_X = (600 - CELL_SIZE * 3 - GRID_GAP * 2) / 2;
const GRID_START_Y = 120;

export default class TicTacToeGame extends MultiplayerGameBase {
  static logicalWidth = 600;
  static logicalHeight = 600;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    // Determine my symbol
    this.isHost   = room.players[0]?.socketId === mySocketId;
    this.mySymbol = this.isHost ? 'X' : 'O';
    this.oppId    = room.players.find(p => p.socketId !== mySocketId)?.socketId;

    this.board      = Array(9).fill(null);
    this.myTurn     = this.isHost;
    this.winLine    = null;
    this.scores     = { x: 0, o: 0, draws: 0 };
    this.game       = 1;
    this.phase      = 'playing'; // 'playing' | 'won' | 'draw'
    this.turnTime   = 30;
    this.cellAnims  = {};
    this._hover     = -1;
    this._boundHandlers = {};
  }

  async init() {
    this.bindSocket();
    this.bindInput();
    this.startTurnTimer();

    this.socket.emit('ttt:sync', { code: this.room.code });
  }

  bindSocket() {
    const bind = (ev, fn) => {
      this._boundHandlers[ev] = fn;
      this.socket.on(ev, fn);
    };

    bind('ttt:state', ({ board, currentTurn, lastMove }) => {
      this.board  = board;
      this.myTurn = currentTurn === this.mySocketId;
      this.phase  = 'playing';
      this.winLine= null;

      if (lastMove !== null && lastMove !== undefined) {
        const symbol = board[lastMove];
        if (symbol) {
          this.cellAnims[lastMove] = { progress: 0, symbol };
          if (this.container) {
            this.container.audio.play('score');
          }
        }
      }

      this.resetTurnTimer();
    });

    bind('ttt:win', ({ winner, symbol, winLine, scores, game }) => {
      this.phase   = 'won';
      this.winLine = winLine;
      this.scores  = scores;
      this.myTurn  = false;
      this.stopTurnTimer();

      const myScore  = this.mySymbol === 'X' ? scores.x : scores.o;
      const oppScore = this.mySymbol === 'X' ? scores.o : scores.x;
      if (this.container) {
        this.container.updateScore(myScore);
        this.container.updateOpponentScore(oppScore);
      }
    });

    bind('ttt:draw', ({ scores, game }) => {
      this.phase  = 'draw';
      this.scores = scores;
      this.myTurn = false;
      this.stopTurnTimer();
      const myScore  = this.mySymbol === 'X' ? scores.x : scores.o;
      const oppScore = this.mySymbol === 'X' ? scores.o : scores.x;
      if (this.container) {
        this.container.updateScore(myScore);
        this.container.updateOpponentScore(oppScore);
      }
    });

    bind('ttt:new-game', ({ game, board, currentTurn }) => {
      this.board    = board;
      this.myTurn   = currentTurn === this.mySocketId;
      this.game     = game;
      this.phase    = 'playing';
      this.winLine  = null;
      this.cellAnims = {};
      this.resetTurnTimer();
    });
  }

  bindInput() {
    this._onClick = (e) => {
      if (!this.myTurn || this.phase !== 'playing') return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (600 / rect.width);
      const my = (e.clientY - rect.top)  * (600 / rect.height);
      const cell = this._hitCell(mx, my);
      if (cell >= 0 && this.board[cell] === null) {
        this.socket.emit('ttt:move', { code: this.room.code, cellIndex: cell });
        this.myTurn = false;
      }
    };

    this._onMove = (e) => {
      if (!this.myTurn || this.phase !== 'playing') {
        this._hover = -1;
        this.canvas.style.cursor = 'default';
        return;
      }
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (600 / rect.width);
      const my = (e.clientY - rect.top)  * (600 / rect.height);
      this._hover = this._hitCell(mx, my);
      this.canvas.style.cursor = (this._hover >= 0 && this.board[this._hover] === null) ? 'pointer' : 'default';
    };

    this.canvas.addEventListener('click', this._onClick);
    this.canvas.addEventListener('mousemove', this._onMove);
  }

  _cellPos(index) {
    const col = index % 3;
    const row = Math.floor(index / 3);
    return {
      x: GRID_START_X + col * (CELL_SIZE + GRID_GAP),
      y: GRID_START_Y + row * (CELL_SIZE + GRID_GAP),
    };
  }

  _hitCell(mx, my) {
    for (let i = 0; i < 9; i++) {
      const { x, y } = this._cellPos(i);
      if (mx >= x && mx < x + CELL_SIZE && my >= y && my < y + CELL_SIZE) return i;
    }
    return -1;
  }

  startTurnTimer() {
    this.turnTime = 30;
    this._turnTimerInterval = setInterval(() => {
      if (!this.myTurn || this.phase !== 'playing') return;
      this.turnTime--;
      if (this.turnTime <= 0) {
        this.stopTurnTimer();
      }
    }, 1000);
  }

  resetTurnTimer() {
    this.turnTime = 30;
  }

  stopTurnTimer() {
    if (this._turnTimerInterval) {
      clearInterval(this._turnTimerInterval);
      this._turnTimerInterval = null;
    }
  }

  update(dt) {
    // Process animations
    for (const i in this.cellAnims) {
      const anim = this.cellAnims[i];
      if (anim.progress < 1) {
        anim.progress = Math.min(1, anim.progress + 6.0 * dt);
      }
    }
  }

  render(ctx) {
    const cw = 600;
    const ch = 600;

    // Dark radial gradient
    const grad = ctx.createRadialGradient(cw / 2, ch / 2, 50, cw / 2, ch / 2, cw / 1.4);
    grad.addColorStop(0, '#0d0d18');
    grad.addColorStop(1, '#05050a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    // Draw Status Bar
    this._renderStatus(ctx, cw);

    // Draw Grid Lines
    this._renderGrid(ctx);

    // Draw Cells
    for (let i = 0; i < 9; i++) {
      const { x, y } = this._cellPos(i);
      const symbol = this.board[i];
      const anim = this.cellAnims[i];

      // Hover glow cell
      if (this._hover === i && this.myTurn && !symbol && this.phase === 'playing') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.beginPath();
        ctx.roundRect(x, y, CELL_SIZE, CELL_SIZE, 12);
        ctx.fill();
      }

      const isWinCell = this.winLine?.includes(i);
      if (this.winLine && !isWinCell) {
        ctx.globalAlpha = 0.25;
      }

      if (symbol) {
        const progress = anim ? anim.progress : 1;
        if (symbol === 'X') {
          this._drawX(ctx, x, y, CELL_SIZE, progress);
        } else {
          this._drawO(ctx, x, y, CELL_SIZE, progress);
        }
      }

      ctx.globalAlpha = 1.0;
    }

    // Win strike line
    if (this.winLine) {
      this._drawWinLine(ctx);
    }

    // Render outcome text
    if (this.phase === 'won' || this.phase === 'draw') {
      this._renderOutcome(ctx, cw, ch);
    }
  }

  _renderStatus(ctx, cw) {
    const myColor  = this.mySymbol === 'X' ? '#6c63ff' : '#00d4aa';
    const oppColor = this.mySymbol === 'X' ? '#00d4aa' : '#6c63ff';

    ctx.font = '700 12px "DM Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.myTurn && this.phase === 'playing' ? myColor : 'rgba(255,255,255,0.4)';
    ctx.fillText(this.mySymbol === 'X' ? '✕ YOU (X)' : '○ YOU (O)', 40, 50);

    ctx.textAlign = 'right';
    ctx.fillStyle = !this.myTurn && this.phase === 'playing' ? oppColor : 'rgba(255,255,255,0.4)';
    ctx.fillText(this.mySymbol === 'X' ? '○ OPPONENT (O)' : '✕ OPPONENT (X)', cw - 40, 50);

    ctx.textAlign = 'center';
    if (this.phase === 'playing') {
      if (this.myTurn) {
        ctx.fillStyle = this.turnTime <= 10 ? '#EF4444' : '#6c63ff';
        ctx.fillText(`YOUR TURN (${this.turnTime}s)`, cw / 2, 50);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText("OPPONENT'S TURN", cw / 2, 50);
      }
    }
  }

  _renderGrid(ctx) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';

    for (let i = 1; i <= 2; i++) {
      const vx = GRID_START_X + i * (CELL_SIZE + GRID_GAP) - GRID_GAP / 2;
      ctx.beginPath();
      ctx.moveTo(vx, GRID_START_Y + 10);
      ctx.lineTo(vx, GRID_START_Y + CELL_SIZE * 3 + GRID_GAP * 2 - 10);
      ctx.stroke();

      const hy = GRID_START_Y + i * (CELL_SIZE + GRID_GAP) - GRID_GAP / 2;
      ctx.beginPath();
      ctx.moveTo(GRID_START_X + 10, hy);
      ctx.lineTo(GRID_START_X + CELL_SIZE * 3 + GRID_GAP * 2 - 10, hy);
      ctx.stroke();
    }
  }

  _drawX(ctx, cx, cy, size, progress) {
    const pad = 30;
    ctx.strokeStyle = '#6c63ff';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';

    const x1 = cx + pad, y1 = cy + pad;
    const x2 = cx + size - pad, y2 = cy + size - pad;

    // Line 1
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + (x2 - x1) * Math.min(1, progress * 2), y1 + (y2 - y1) * Math.min(1, progress * 2));
    ctx.stroke();

    // Line 2
    if (progress > 0.5) {
      const p2 = (progress - 0.5) * 2;
      ctx.beginPath();
      ctx.moveTo(x2, y1);
      ctx.lineTo(x2 - (x2 - x1) * p2, y1 + (y2 - y1) * p2);
      ctx.stroke();
    }
  }

  _drawO(ctx, cx, cy, size, progress) {
    const pad = 26;
    const r = (size - pad * 2) / 2;
    const ox = cx + size / 2, oy = cy + size / 2;

    ctx.strokeStyle = '#00d4aa';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(ox, oy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
  }

  _drawWinLine(ctx) {
    const cells = this.winLine;
    if (!cells || cells.length < 2) return;
    const { x: x1, y: y1 } = this._cellPos(cells[0]);
    const { x: x2, y: y2 } = this._cellPos(cells[2]);

    ctx.beginPath();
    ctx.moveTo(x1 + CELL_SIZE / 2, y1 + CELL_SIZE / 2);
    ctx.lineTo(x2 + CELL_SIZE / 2, y2 + CELL_SIZE / 2);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  _renderOutcome(ctx, cw, ch) {
    const y = GRID_START_Y + 3 * CELL_SIZE + 2 * GRID_GAP + 55;

    let text, color;
    if (this.phase === 'draw') {
      text = 'DRAW GAME';
      color = '#F59E0B';
    } else {
      const mySymbolWon = (this.winLine && this.board[this.winLine[0]] === this.mySymbol);
      text = mySymbolWon ? 'YOU WIN!' : 'THEY WIN';
      color = mySymbolWon ? '#10b981' : '#EF4444';
    }

    ctx.font = 'bold 20px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(text, cw / 2, y);
  }

  destroy() {
    this.stopTurnTimer();
    this.canvas.removeEventListener('click', this._onClick);
    this.canvas.removeEventListener('mousemove', this._onMove);
    for (const [ev, fn] of Object.entries(this._boundHandlers)) {
      this.socket.off(ev, fn);
    }
    super.destroy();
  }
}
