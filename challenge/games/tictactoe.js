/**
 * challenge/games/tictactoe.js — Tic Tac Toe Client
 */

import { updateHudScores, updateHudRound } from '../js/game-runner.js';

const CELL_SIZE = 110;
const GRID_GAP  = 6;
const GRID_START_X = (500 - CELL_SIZE * 3 - GRID_GAP * 2) / 2;
const GRID_START_Y = 80;

export default class TicTacToeGame {
  constructor(canvas, room, mySocketId, SocketClient) {
    this.canvas  = canvas;
    this.room    = room;
    this.myId    = mySocketId;
    this.SC      = SocketClient;
    this.ctx     = canvas.getContext('2d');

    // Determine my symbol
    this.isHost   = room.players[0]?.socketId === mySocketId;
    this.mySymbol = this.isHost ? 'X' : 'O';
    this.oppId    = room.players.find(p => p.socketId !== mySocketId)?.socketId;

    this.board      = Array(9).fill(null);
    this.myTurn     = this.isHost; // X goes first
    this.winLine    = null;
    this.scores     = { x: 0, o: 0, draws: 0 };
    this.game       = 1;
    this.phase      = 'playing'; // 'playing' | 'won' | 'draw'
    this.turnTime   = 30;
    this._turnTimerInterval = null;

    // Cell draw animations: { cellIndex: { progress, symbol } }
    this.cellAnims = {};

    this._handlers = {};
    this._rafId    = null;
    this._hover    = -1;
  }

  async init() {
    this.canvas.width  = 500;
    this.canvas.height = 580;
    this.canvas.style.cssText = 'border-radius:12px;outline:none;max-width:100%;max-height:100%;';

    this.bindSocket();
    this.bindInput();
    this.startRender();
    this.startTurnTimer();

    this.SC.emit('ttt:sync', { code: this.room.code });
    updateHudRound(`GAME 1 OF 3`);
  }

  bindSocket() {
    const on = (ev, fn) => { this._handlers[ev] = fn; this.SC.on(ev, fn); };

    on('ttt:state', ({ board, currentTurn, lastMove }) => {
      this.board  = board;
      this.myTurn = currentTurn === this.myId;
      this.phase  = 'playing';
      this.winLine= null;

      if (lastMove !== null && lastMove !== undefined) {
        const symbol = board[lastMove];
        if (symbol) {
          this.cellAnims[lastMove] = { progress: 0, symbol };
        }
      }

      this.resetTurnTimer();
    });

    on('ttt:win', ({ winner, symbol, winLine, scores, game }) => {
      this.phase   = 'won';
      this.winLine = winLine;
      this.scores  = scores;
      this.myTurn  = false;
      this.stopTurnTimer();

      const myScore  = this.mySymbol === 'X' ? scores.x : scores.o;
      const oppScore = this.mySymbol === 'X' ? scores.o : scores.x;
      updateHudScores(myScore, oppScore);
      updateHudRound(`GAME ${game} OF 3`);
    });

    on('ttt:draw', ({ scores, game }) => {
      this.phase  = 'draw';
      this.scores = scores;
      this.myTurn = false;
      this.stopTurnTimer();
      const myScore  = this.mySymbol === 'X' ? scores.x : scores.o;
      const oppScore = this.mySymbol === 'X' ? scores.o : scores.x;
      updateHudScores(myScore, oppScore);
    });

    on('ttt:new-game', ({ game, board, currentTurn }) => {
      this.board    = board;
      this.myTurn   = currentTurn === this.myId;
      this.game     = game;
      this.phase    = 'playing';
      this.winLine  = null;
      this.cellAnims = {};
      updateHudRound(`GAME ${game} OF 3`);
      this.resetTurnTimer();
    });
  }

  bindInput() {
    this._onClick = (e) => {
      if (!this.myTurn || this.phase !== 'playing') return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const my = (e.clientY - rect.top)  * (this.canvas.height / rect.height);
      const cell = this._hitCell(mx, my);
      if (cell >= 0 && this.board[cell] === null) {
        this.SC.emit('ttt:move', { code: this.room.code, cellIndex: cell });
        this.myTurn = false;
      }
    };
    this._onMove = (e) => {
      if (!this.myTurn || this.phase !== 'playing') { this._hover = -1; return; }
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const my = (e.clientY - rect.top)  * (this.canvas.height / rect.height);
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
      if (this.turnTime <= 0) this.stopTurnTimer();
    }, 1000);
  }

  resetTurnTimer() { this.turnTime = 30; }
  stopTurnTimer()  { clearInterval(this._turnTimerInterval); }

  startRender() {
    const tick = () => {
      this.render();
      this._rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  render() {
    const c = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    c.fillStyle = '#060810';
    c.fillRect(0, 0, cw, ch);

    // Status bar
    this._renderStatus(c, cw);

    // Draw grid lines
    this._renderGrid(c);

    // Draw cells
    for (let i = 0; i < 9; i++) {
      const { x, y } = this._cellPos(i);
      const symbol = this.board[i];
      const anim   = this.cellAnims[i];

      // Hover highlight
      if (this._hover === i && this.myTurn && !symbol && this.phase === 'playing') {
        c.fillStyle = 'rgba(255,255,255,0.04)';
        c.beginPath(); c.roundRect(x, y, CELL_SIZE, CELL_SIZE, 8); c.fill();
      }

      // Win line dim
      const isWinCell = this.winLine?.includes(i);
      if (this.winLine && !isWinCell) c.globalAlpha = 0.3;

      if (symbol) {
        const progress = anim ? Math.min(1, (anim.progress += 0.08)) : 1;
        if (symbol === 'X') this._drawX(c, x, y, CELL_SIZE, progress);
        else                 this._drawO(c, x, y, CELL_SIZE, progress);
      }

      c.globalAlpha = 1;
    }

    // Win line
    if (this.winLine) this._drawWinLine(c);

    // Phase messages
    if (this.phase === 'won' || this.phase === 'draw') {
      this._renderOutcome(c, cw, ch);
    }

    // Turn timer ring (when my turn)
    if (this.myTurn && this.phase === 'playing') {
      this._renderTimerRing(c, cw, ch);
    }
  }

  _renderStatus(c, cw) {
    const myColor  = this.isHost ? '#6c63ff' : '#00d4aa';
    const oppColor = this.isHost ? '#00d4aa' : '#6c63ff';

    c.font = '10px "JetBrains Mono", monospace';
    c.textAlign = 'left';
    c.fillStyle = this.myTurn ? myColor : '#475569';
    c.fillText(this.mySymbol === 'X' ? '✕ YOU (X)' : '○ YOU (O)', 20, 42);

    c.textAlign = 'right';
    c.fillStyle = !this.myTurn && this.phase === 'playing' ? oppColor : '#475569';
    c.fillText(this.mySymbol === 'X' ? '○ THEM (O)' : '✕ THEM (X)', cw - 20, 42);

    if (this.myTurn && this.phase === 'playing') {
      c.textAlign = 'center';
      c.fillStyle = this.turnTime <= 10 ? '#EF4444' : '#64748B';
      c.fillText(`YOUR TURN — ${this.turnTime}s`, cw / 2, 58);
    } else if (this.phase === 'playing') {
      c.textAlign = 'center';
      c.fillStyle = '#475569';
      c.fillText('THINKING...', cw / 2, 58);
    }
  }

  _renderGrid(c) {
    c.strokeStyle = 'rgba(255,255,255,0.08)';
    c.lineWidth   = 2;
    c.lineCap     = 'round';

    // 2 vertical, 2 horizontal lines
    for (let i = 1; i <= 2; i++) {
      const vx = GRID_START_X + i * (CELL_SIZE + GRID_GAP) - GRID_GAP / 2;
      c.beginPath(); c.moveTo(vx, GRID_START_Y); c.lineTo(vx, GRID_START_Y + 3 * CELL_SIZE + 2 * GRID_GAP); c.stroke();

      const hy = GRID_START_Y + i * (CELL_SIZE + GRID_GAP) - GRID_GAP / 2;
      c.beginPath(); c.moveTo(GRID_START_X, hy); c.lineTo(GRID_START_X + 3 * CELL_SIZE + 2 * GRID_GAP, hy); c.stroke();
    }
  }

  _drawX(c, cx, cy, size, progress) {
    const pad  = 24;
    const half = progress / 2;
    c.strokeStyle = '#6c63ff';
    c.lineWidth   = 7;
    c.lineCap     = 'round';

    const x1 = cx + pad, y1 = cy + pad;
    const x2 = cx + size - pad, y2 = cy + size - pad;

    // Line 1
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x1 + (x2 - x1) * Math.min(1, progress * 2), y1 + (y2 - y1) * Math.min(1, progress * 2));
    c.stroke();

    // Line 2 (starts at half progress)
    if (progress > 0.5) {
      const p2 = (progress - 0.5) * 2;
      c.beginPath();
      c.moveTo(x2, y1);
      c.lineTo(x2 - (x2 - x1) * p2, y1 + (y2 - y1) * p2);
      c.stroke();
    }
  }

  _drawO(c, cx, cy, size, progress) {
    const pad = 20;
    const r   = (size - pad * 2) / 2;
    const ox  = cx + size / 2, oy = cy + size / 2;

    c.strokeStyle = '#00d4aa';
    c.lineWidth   = 7;
    c.lineCap     = 'round';
    c.beginPath();
    c.arc(ox, oy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    c.stroke();
  }

  _drawWinLine(c) {
    const cells = this.winLine;
    if (!cells || cells.length < 2) return;
    const { x: x1, y: y1 } = this._cellPos(cells[0]);
    const { x: x2, y: y2 } = this._cellPos(cells[2]);

    c.beginPath();
    c.moveTo(x1 + CELL_SIZE / 2, y1 + CELL_SIZE / 2);
    c.lineTo(x2 + CELL_SIZE / 2, y2 + CELL_SIZE / 2);
    c.strokeStyle = '#ffd93d';
    c.lineWidth   = 6;
    c.lineCap     = 'round';
    c.stroke();
  }

  _renderOutcome(c, cw, ch) {
    const y = GRID_START_Y + 3 * CELL_SIZE + 2 * GRID_GAP + 40;

    let text, color;
    if (this.phase === 'draw') {
      text = 'DRAW'; color = '#F59E0B';
    } else {
      const mySymbolWon = (this.winLine && this.board[this.winLine[0]] === this.mySymbol);
      text  = mySymbolWon ? 'YOU WIN!' : 'YOU LOSE';
      color = mySymbolWon ? '#00d4aa' : '#EF4444';
    }

    c.font = 'bold 18px "Press Start 2P", monospace';
    c.textAlign = 'center';
    c.fillStyle = color;
    c.fillText(text, cw / 2, y);
  }

  _renderTimerRing(c, cw, ch) {
    const pct = this.turnTime / 30;
    const y   = GRID_START_Y + 3 * CELL_SIZE + 2 * GRID_GAP + 40;
    const r   = 18;

    c.beginPath();
    c.arc(cw / 2, y + 10, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    c.strokeStyle = this.turnTime <= 10 ? '#EF4444' : '#6c63ff';
    c.lineWidth   = 3;
    c.stroke();
  }

  destroy() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this.stopTurnTimer();
    this.canvas.removeEventListener('click', this._onClick);
    this.canvas.removeEventListener('mousemove', this._onMove);
    for (const [ev, fn] of Object.entries(this._handlers)) this.SC.off(ev, fn);
  }
}
