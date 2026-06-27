/**
 * challenge/games/snake-arena.js — Snake Arena Client
 */

import { updateHudScores, updateHudRound } from '../js/game-runner.js';

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

export default class SnakeArenaGame {
  constructor(canvas, room, mySocketId, SocketClient) {
    this.canvas = canvas;
    this.room   = room;
    this.myId   = mySocketId;
    this.SC     = SocketClient;
    this.ctx    = canvas.getContext('2d');
    
    this.state = {
      snakes: {},     // id -> { body, direction, alive, score, color, ghost, boost }
      food: [],
      goldFood: null,
      powerups: [],
      gridSize: 30,
      roundWins: {},
      round: 1,
      phase: 'waiting', // 'waiting' | 'playing' | 'round-over'
    };

    this.cellSize = 15;
    this._handlers = {};
    this._rafId = null;
    this._lastDir = null;
  }

  async init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    this.bindSocket();
    this.bindInput();
    this.startRender();

    this.SC.emit('snake:ready', { code: this.room.code });
  }

  resize() {
    // Want a square canvas that fits inside the container
    const wrap = this.canvas.parentElement;
    const minDim = Math.min(wrap.clientWidth - 40, wrap.clientHeight - 40, 600);
    this.canvas.width = minDim;
    this.canvas.height = minDim;
    this.canvas.style.cssText = 'border-radius:12px;outline:none;';
    this.cellSize = minDim / (this.state.gridSize || 30);
  }

  bindSocket() {
    const on = (ev, fn) => { this._handlers[ev] = fn; this.SC.on(ev, fn); };

    on('snake:init', (data) => {
      this.state.gridSize = data.gridSize;
      this.resize();
      this.state.snakes = data.snakes;
      this.state.food = data.food;
      this.state.phase = 'playing';
      
      this.state.roundWins = {};
      data.players.forEach(p => this.state.roundWins[p.socketId] = 0);
      this.updateHud();
    });

    on('game:tick', (data) => {
      this.state.snakes = data.snakes;
      this.state.food = data.food;
      this.state.goldFood = data.goldFood;
      this.state.powerups = data.powerups;
      
      // Update my score if changed (simplification, server tracks actual score but this is for UI)
      this.updateHud();
    });

    on('snake:new-round', ({ round, roundWins }) => {
      this.state.round = round;
      this.state.roundWins = roundWins;
      this.state.phase = 'playing';
      this.updateHud();
    });

    on('snake:round-over', ({ winner, roundWins }) => {
      this.state.roundWins = roundWins;
      this.state.phase = 'round-over';
      this.updateHud();
    });
  }

  updateHud() {
    // Find my score and opp score
    const myScore = this.state.roundWins[this.myId] || 0;
    const oppId = this.room.players.find(p => p.socketId !== this.myId)?.socketId;
    const oppScore = this.state.roundWins[oppId] || 0;
    
    updateHudScores(myScore, oppScore);
    updateHudRound(`ROUND ${this.state.round} OF 3`);
  }

  bindInput() {
    this._onKey = (e) => {
      const dir = KEY_TO_DIR[e.code];
      if (dir && dir !== this._lastDir && this.state.phase === 'playing') {
        e.preventDefault();
        this._lastDir = dir;
        this.SC.emit('snake:direction', { code: this.room.code, dir });
      }
    };
    document.addEventListener('keydown', this._onKey);
  }

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
    const cs = this.cellSize;

    // Background
    c.fillStyle = '#060810';
    c.fillRect(0, 0, cw, ch);

    // Grid lines
    c.strokeStyle = 'rgba(255,255,255,0.03)';
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i <= this.state.gridSize; i++) {
      c.moveTo(i * cs, 0); c.lineTo(i * cs, ch);
      c.moveTo(0, i * cs); c.lineTo(cw, i * cs);
    }
    c.stroke();

    // Food
    this.state.food.forEach(([fx, fy]) => {
      c.fillStyle = '#EF4444';
      c.beginPath(); c.arc(fx * cs + cs/2, fy * cs + cs/2, cs*0.4, 0, Math.PI*2); c.fill();
    });

    // Gold Food
    if (this.state.goldFood) {
      const [gx, gy] = this.state.goldFood;
      c.fillStyle = '#F59E0B';
      c.shadowColor = '#F59E0B';
      c.shadowBlur = 10;
      c.beginPath(); c.arc(gx * cs + cs/2, gy * cs + cs/2, cs*0.5, 0, Math.PI*2); c.fill();
      c.shadowBlur = 0;
    }

    // Powerups
    this.state.powerups.forEach(p => {
      const [px, py] = p.pos;
      const col = POWERUP_COLORS[p.type] || '#ffffff';
      c.fillStyle = col;
      c.beginPath();
      // Triangle
      const cx = px*cs + cs/2, cy = py*cs + cs/2;
      c.moveTo(cx, cy - cs*0.4);
      c.lineTo(cx + cs*0.4, cy + cs*0.4);
      c.lineTo(cx - cs*0.4, cy + cs*0.4);
      c.fill();
    });

    // Snakes
    for (const [id, snake] of Object.entries(this.state.snakes)) {
      if (!snake.alive) continue;
      
      const isMe = id === this.myId;
      // Look up color from initial state if needed, fallback to generic
      let color = snake.color || (isMe ? '#8B5CF6' : '#00d4aa');
      
      if (snake.ghost) {
        c.globalAlpha = 0.4;
      }
      
      if (snake.boost) {
        c.shadowColor = color;
        c.shadowBlur = 8;
      }

      snake.body.forEach(([bx, by], i) => {
        c.fillStyle = i === 0 ? color : color; // Could make body slightly darker
        // Head gets slightly different drawing
        if (i === 0) {
          c.beginPath();
          c.roundRect(bx * cs + 1, by * cs + 1, cs - 2, cs - 2, 4);
          c.fill();
          // Eyes
          c.fillStyle = '#000';
          // (Simplified eyes - always center)
          c.beginPath(); c.arc(bx * cs + cs/2, by * cs + cs/2, 2, 0, Math.PI*2); c.fill();
        } else {
          // Shrink tail slightly based on index
          const s = Math.max(0.5, 1 - (i / snake.body.length) * 0.4);
          const pad = (cs - (cs * s)) / 2;
          c.beginPath();
          c.roundRect(bx * cs + pad, by * cs + pad, cs * s, cs * s, 2);
          c.fill();
        }
      });
      
      c.globalAlpha = 1;
      c.shadowBlur = 0;
    }

    if (this.state.phase === 'round-over') {
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.fillRect(0,0,cw,ch);
      c.font = 'bold 24px "Press Start 2P", monospace';
      c.fillStyle = '#fff';
      c.textAlign = 'center';
      c.fillText('ROUND OVER', cw/2, ch/2);
    }
  }

  destroy() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    document.removeEventListener('keydown', this._onKey);
    window.removeEventListener('resize', this.resize);
    for (const [ev, fn] of Object.entries(this._handlers)) this.SC.off(ev, fn);
  }
}
