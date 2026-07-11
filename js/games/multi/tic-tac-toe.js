import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const CELL_SIZE = 110;
const GRID_GAP  = 8;
const GRID_START_X = (500 - CELL_SIZE * 3 - GRID_GAP * 2) / 2; // 77px
const GRID_START_Y = 130;

export default class TicTacToeGame extends MultiplayerGameBase {
  static logicalWidth = 500;
  static logicalHeight = 560;

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
    this.turnTime   = 30.0;
    this.cellAnims  = {}; // index -> { progress, symbol, speed }
    this.winLineProgress = 0.0;
    this._hover     = -1;
    this._boundHandlers = {};
  }

  async init() {
    this.bindSocket();
    this.bindInput();
    this.resetTurnTimer();

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
          const duration = symbol === 'X' ? 150 : 200; // X takes 150ms, O takes 200ms
          this.cellAnims[lastMove] = { progress: 0.0, symbol, speed: 1000 / duration };
          if (this.container) {
            this.container.audio.play('hit');
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
      this.winLineProgress = 0.0;
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
      this.winLineProgress = 0.0;
      this.cellAnims = {};
      this.resetTurnTimer();
    });
  }

  bindInput() {
    this._onClick = (e) => {
      if (!this.myTurn || this.phase !== 'playing') return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (TicTacToeGame.logicalWidth / rect.width);
      const my = (e.clientY - rect.top)  * (TicTacToeGame.logicalHeight / rect.height);
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
      const mx = (e.clientX - rect.left) * (TicTacToeGame.logicalWidth / rect.width);
      const my = (e.clientY - rect.top)  * (TicTacToeGame.logicalHeight / rect.height);
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

  resetTurnTimer() {
    this.turnTime = 30.0;
    
    // Clear existing timer content in mounts
    const myMount = document.getElementById('my-timer-mount');
    const oppMount = document.getElementById('opp-timer-mount');
    if (myMount) myMount.innerHTML = '';
    if (oppMount) oppMount.innerHTML = '';

    const activeMount = this.myTurn ? myMount : oppMount;
    const ringColor = this.myTurn ? '#6c63ff' : '#ffffff';

    if (activeMount) {
      activeMount.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" stroke-width="2.5" fill="none"/>
          <circle id="active-timer-circle" cx="12" cy="12" r="10" stroke="${ringColor}" stroke-width="2.5" fill="none" stroke-dasharray="62.83" stroke-dashoffset="0" transform="rotate(-90 12 12)" style="transition: stroke-dashoffset 0.1s linear;"/>
        </svg>
      `;
    }
  }

  stopTurnTimer() {
    const myMount = document.getElementById('my-timer-mount');
    const oppMount = document.getElementById('opp-timer-mount');
    if (myMount) myMount.innerHTML = '';
    if (oppMount) oppMount.innerHTML = '';
  }

  update(dt) {
    // Progress turn timer
    if (this.phase === 'playing' && this.turnTime > 0) {
      this.turnTime = Math.max(0, this.turnTime - dt);
      
      const circle = document.getElementById('active-timer-circle');
      if (circle) {
        const progress = this.turnTime / 30.0;
        const offset = 62.83 * (1 - progress);
        circle.setAttribute('stroke-dashoffset', offset);
      }
    }

    // Process cell placement animations
    for (const i in this.cellAnims) {
      const anim = this.cellAnims[i];
      if (anim.progress < 1.0) {
        anim.progress = Math.min(1.0, anim.progress + anim.speed * dt);
      }
    }

    // Win strike progress: over 250ms
    if (this.phase === 'won' && this.winLineProgress < 1.0) {
      this.winLineProgress = Math.min(1.0, this.winLineProgress + 4.0 * dt);
    }
  }

  render(ctx) {
    const cw = TicTacToeGame.logicalWidth;
    const ch = TicTacToeGame.logicalHeight;

    // Dark radial gradient
    const grad = ctx.createRadialGradient(cw / 2, ch / 2, 50, cw / 2, ch / 2, cw / 1.4);
    grad.addColorStop(0, '#0d0d18');
    grad.addColorStop(1, '#05050a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    // Draw Status Bar
    this._renderStatus(ctx, cw);

    // Draw Grid Lines (no bounding rect)
    this._renderGrid(ctx);

    // Draw Cells
    for (let i = 0; i < 9; i++) {
      const { x, y } = this._cellPos(i);
      const symbol = this.board[i];
      const anim = this.cellAnims[i];

      // Hover glow cell
      if (this._hover === i && this.myTurn && !symbol && this.phase === 'playing') {
        ctx.fillStyle = 'rgba(108, 99, 255, 0.05)';
        ctx.fillRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);
      }

      // Non-winning cells dim to 25% opacity simultaneously
      const isWinCell = this.winLine?.includes(i);
      if (this.winLine && !isWinCell) {
        ctx.globalAlpha = 0.25;
      } else {
        ctx.globalAlpha = 1.0;
      }

      if (symbol) {
        const progress = anim ? anim.progress : 1.0;
        const isMySymbol = symbol === this.mySymbol;
        
        ctx.save();
        ctx.strokeStyle = isMySymbol ? '#6c63ff' : '#ffffff'; // My symbol accent, Opponent muted white
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';

        if (symbol === 'X') {
          this._drawX(ctx, x, y, CELL_SIZE, progress);
        } else {
          this._drawO(ctx, x, y, CELL_SIZE, progress);
        }
        ctx.restore();
      }

      ctx.globalAlpha = 1.0; // reset
    }

    // Win strike line drawing over 250ms
    if (this.winLine) {
      this._drawWinLine(ctx);
    }

    // Render outcome text
    if (this.phase === 'won' || this.phase === 'draw') {
      this._renderOutcome(ctx, cw, ch);
    }
  }

  _renderStatus(ctx, cw) {
    ctx.font = '700 12px "DM Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.myTurn && this.phase === 'playing' ? '#6c63ff' : 'rgba(255,255,255,0.4)';
    ctx.fillText(this.mySymbol === 'X' ? '✕ YOU (X)' : '○ YOU (O)', 40, 50);

    ctx.textAlign = 'right';
    ctx.fillStyle = !this.myTurn && this.phase === 'playing' ? '#ffffff' : 'rgba(255,255,255,0.4)';
    ctx.fillText(this.mySymbol === 'X' ? '○ OPPONENT (O)' : '✕ OPPONENT (X)', cw - 40, 50);

    ctx.textAlign = 'center';
    if (this.phase === 'playing') {
      if (this.myTurn) {
        ctx.fillStyle = this.turnTime <= 8 ? '#ff7675' : '#6c63ff';
        ctx.fillText(`YOUR TURN (${Math.ceil(this.turnTime)}s)`, cw / 2, 50);
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
      // vertical lines
      const vx = GRID_START_X + i * (CELL_SIZE + GRID_GAP) - GRID_GAP / 2;
      ctx.beginPath();
      ctx.moveTo(vx, GRID_START_Y + 10);
      ctx.lineTo(vx, GRID_START_Y + CELL_SIZE * 3 + GRID_GAP * 2 - 10);
      ctx.stroke();

      // horizontal lines
      const hy = GRID_START_Y + i * (CELL_SIZE + GRID_GAP) - GRID_GAP / 2;
      ctx.beginPath();
      ctx.moveTo(GRID_START_X + 10, hy);
      ctx.lineTo(GRID_START_X + CELL_SIZE * 3 + GRID_GAP * 2 - 10, hy);
      ctx.stroke();
    }
  }

  _drawX(ctx, cx, cy, size, progress) {
    const pad = 24;
    const center = cx + size / 2;
    const maxLen = (size / 2) - pad;
    const len = maxLen * progress;

    // Draw diagonal 1 from center outward simultaneously
    ctx.beginPath();
    ctx.moveTo(center - len, center - len);
    ctx.lineTo(center + len, center + len);
    ctx.stroke();

    // Draw diagonal 2 from center outward simultaneously
    ctx.beginPath();
    ctx.moveTo(center + len, center - len);
    ctx.lineTo(center - len, center + len);
    ctx.stroke();
  }

  _drawO(ctx, cx, cy, size, progress) {
    const pad = 24;
    const r = (size - pad * 2) / 2;
    const ox = cx + size / 2, oy = cy + size / 2;

    // clockwise from 12 o'clock (-Math.PI / 2)
    ctx.beginPath();
    ctx.arc(ox, oy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
  }

  _drawWinLine(ctx) {
    const cells = this.winLine;
    if (!cells || cells.length < 3) return;

    const p1 = this._cellPos(cells[0]);
    const p2 = this._cellPos(cells[2]);

    const startX = p1.x + CELL_SIZE / 2;
    const startY = p1.y + CELL_SIZE / 2;

    const targetX = p2.x + CELL_SIZE / 2;
    const targetY = p2.y + CELL_SIZE / 2;

    // Lerped Win strike line
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(
      startX + (targetX - startX) * this.winLineProgress,
      startY + (targetY - startY) * this.winLineProgress
    );
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  _renderOutcome(ctx, cw, ch) {
    const y = GRID_START_Y + 3 * CELL_SIZE + 2 * GRID_GAP + 55;

    let text, color;
    if (this.phase === 'draw') {
      text = 'DRAW GAME';
      color = '#F59E0B';
    } else {
      const mySymbolWon = (this.winLine && this.board[this.winLine[0]] === this.mySymbol);
      text = mySymbolWon ? 'YOU WIN!' : 'YOU LOSE';
      color = mySymbolWon ? '#6c63ff' : '#ff7675';
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
