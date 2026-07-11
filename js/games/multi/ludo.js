import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const GRID_CELLS = 15;
const CELL_SIZE = 40; // 600 / 15 = 40

const COLORS = ['red', 'green', 'yellow', 'blue'];

const COLOR_HEX = {
  red: '#ff7675',
  green: '#2ecc71',
  yellow: '#fdcb6e',
  blue: '#0984e3'
};

const BASE_BOXES = {
  red: { x: 0, y: 0, color: COLOR_HEX.red },
  green: { x: 9 * CELL_SIZE, y: 0, color: COLOR_HEX.green },
  yellow: { x: 9 * CELL_SIZE, y: 9 * CELL_SIZE, color: COLOR_HEX.yellow },
  blue: { x: 0, y: 9 * CELL_SIZE, color: COLOR_HEX.blue }
};

// Safe absolute cells on the 52-cell main track
const SAFE_ABS = [0, 8, 13, 21, 26, 34, 39, 47];

const TRACK_ABS = [
  { r: 6, c: 1 }, { r: 6, c: 2 }, { r: 6, c: 3 }, { r: 6, c: 4 }, { r: 6, c: 5 },
  { r: 5, c: 6 }, { r: 4, c: 6 }, { r: 3, c: 6 }, { r: 2, c: 6 }, { r: 1, c: 6 }, { r: 0, c: 6 },
  { r: 0, c: 7 },
  { r: 0, c: 8 }, { r: 1, c: 8 }, { r: 2, c: 8 }, { r: 3, c: 8 }, { r: 4, c: 8 }, { r: 5, c: 8 },
  { r: 6, c: 9 }, { r: 6, c: 10 }, { r: 6, c: 11 }, { r: 6, c: 12 }, { r: 6, c: 13 }, { r: 6, c: 14 },
  { r: 7, c: 14 },
  { r: 8, c: 14 }, { r: 8, c: 13 }, { r: 8, c: 12 }, { r: 8, c: 11 }, { r: 8, c: 10 }, { r: 8, c: 9 },
  { r: 9, c: 8 }, { r: 10, c: 8 }, { r: 11, c: 8 }, { r: 12, c: 8 }, { r: 13, c: 8 }, { r: 14, c: 8 },
  { r: 14, c: 7 },
  { r: 14, c: 6 }, { r: 13, c: 6 }, { r: 12, c: 6 }, { r: 11, c: 6 }, { r: 10, c: 6 }, { r: 9, c: 6 },
  { r: 8, c: 5 }, { r: 8, c: 4 }, { r: 8, c: 3 }, { r: 8, c: 2 }, { r: 8, c: 1 }, { r: 8, c: 0 },
  { r: 7, c: 0 }, { r: 6, c: 0 }
];

const BASE_TOKEN_OFFSETS = {
  red:    [{ r: 2, c: 2 }, { r: 2, c: 3 }, { r: 3, c: 2 }, { r: 3, c: 3 }],
  green:  [{ r: 2, c: 11 }, { r: 2, c: 12 }, { r: 3, c: 11 }, { r: 3, c: 12 }],
  yellow: [{ r: 11, c: 11 }, { r: 11, c: 12 }, { r: 12, c: 11 }, { r: 12, c: 12 }],
  blue:   [{ r: 11, c: 2 }, { r: 11, c: 3 }, { r: 12, c: 2 }, { r: 12, c: 3 }]
};

const START_ABS = [0, 13, 26, 39];

export default class LudoGame extends MultiplayerGameBase {
  static logicalWidth = 600;
  static logicalHeight = 600;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.state = null; // direct server state sync
    this.diceRollAnim = 0; // dice rolling countdown frames
    this.diceFaces = [1, 2, 3, 4, 5, 6];
    this.currDiceFace = 1;

    this._boundHandlers = {};
  }

  async init() {
    this.bindSocket();
    this.bindInput();

    this.socket.emit('ludo:ready', { code: this.room.code });
  }

  bindSocket() {
    const bind = (ev, fn) => {
      this._boundHandlers[ev] = fn;
      this.socket.on(ev, fn);
    };

    bind('ludo:state-updated', ({ state }) => {
      this.state = state;
      this.updateHud();
    });

    bind('ludo:dice-rolled', ({ socketId, roll, hasMoves }) => {
      if (this.state) {
        this.state.diceRoll = roll;
        this.state.diceRolledThisTurn = true;
      }
      this.diceRollAnim = 12; // 12 frames of rapid face switching (~200ms)
      this.currDiceFace = roll;
      if (this.container) {
        this.container.audio.play('hit');
      }
    });

    bind('ludo:token-captured', ({ socketId, tokenIndex }) => {
      if (this.container) {
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
      // Find my color and opponent's color
      const oppId = this.opponent?.socketId;
      const myP = this.state.players[this.mySocketId];
      const oppP = this.state.players[oppId];

      if (myP && oppP) {
        this.container.updateScore(myP.completed);
        this.container.updateOpponentScore(oppP.completed);
      }
    }
  }

  bindInput() {
    this._onClick = (e) => {
      if (!this.state) return;
      if (this.state.currentTurn !== this.mySocketId) return;

      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (LudoGame.logicalWidth / rect.width);
      const my = (e.clientY - rect.top)  * (LudoGame.logicalHeight / rect.height);

      // 1. Click Dice area in home/center
      const cx = 300, cy = 300;
      const isOverDice = mx >= cx - 30 && mx <= cx + 30 && my >= cy - 30 && my <= cy + 30;
      if (isOverDice && !this.state.diceRolledThisTurn) {
        this.socket.emit('ludo:roll-dice', { code: this.room.code });
        return;
      }

      // 2. Click My Tokens to move
      if (this.state.diceRolledThisTurn && this.state.diceRoll !== null) {
        const myP = this.state.players[this.mySocketId];
        if (!myP) return;

        myP.tokens.forEach((t, i) => {
          const tPos = this.getTokenCoords(myP.playerIndex, myP.color, i, t.pos);
          const tX = tPos.c * CELL_SIZE + CELL_SIZE/2;
          const tY = tPos.r * CELL_SIZE + CELL_SIZE/2;

          const dist = Math.hypot(mx - tX, my - tY);
          if (dist < 18) {
            // Check if valid move locally
            const roll = this.state.diceRoll;
            const canMove = (t.pos === -1 && roll === 6) || (t.pos >= 0 && t.pos + roll <= 57);
            if (canMove) {
              this.socket.emit('ludo:move-token', { code: this.room.code, tokenIndex: i });
            }
          }
        });
      }
    };

    this.canvas.addEventListener('click', this._onClick);
  }

  getTokenCoords(playerIndex, color, tokenIndex, pos) {
    if (pos === -1) {
      // Base placement
      return BASE_TOKEN_OFFSETS[color][tokenIndex];
    }
    if (pos === 57) {
      // Home
      const homes = [
        { r: 7, c: 6 }, // red
        { r: 6, c: 7 }, // green
        { r: 7, c: 8 }, // yellow
        { r: 8, c: 7 }  // blue
      ];
      return homes[playerIndex];
    }
    if (pos >= 51 && pos <= 56) {
      // Home stretch
      const idx = pos - 51;
      if (color === 'red') return { r: 7, c: 1 + idx };
      if (color === 'green') return { r: 1 + idx, c: 7 };
      if (color === 'yellow') return { r: 7, c: 13 - idx };
      if (color === 'blue') return { r: 13 - idx, c: 7 };
    }

    // Main loop mapping
    const absIdx = (START_ABS[playerIndex] + pos) % 52;
    return TRACK_ABS[absIdx];
  }

  update(dt) {
    if (this.diceRollAnim > 0) {
      this.diceRollAnim--;
      if (this.diceRollAnim > 0) {
        this.currDiceFace = Math.floor(Math.random() * 6) + 1;
      } else if (this.state) {
        this.currDiceFace = this.state.diceRoll || 1;
      }
    }
  }

  render(ctx) {
    const cw = LudoGame.logicalWidth;
    const ch = LudoGame.logicalHeight;

    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, cw, ch);

    // 1. Draw 4 Base boxes
    for (const [color, box] of Object.entries(BASE_BOXES)) {
      ctx.fillStyle = box.color + '22'; // 15% opacity
      ctx.strokeStyle = box.color;
      ctx.lineWidth = 3;
      ctx.fillRect(box.x, box.y, 6 * CELL_SIZE, 6 * CELL_SIZE);
      ctx.strokeRect(box.x + 3, box.y + 3, 6 * CELL_SIZE - 6, 6 * CELL_SIZE - 6);

      // Inner white rectangle representing base
      ctx.fillStyle = '#060810';
      ctx.fillRect(box.x + 1.25 * CELL_SIZE, box.y + 1.25 * CELL_SIZE, 3.5 * CELL_SIZE, 3.5 * CELL_SIZE);
    }

    // 2. Draw tracks
    TRACK_ABS.forEach((cell, i) => {
      const x = cell.c * CELL_SIZE;
      const y = cell.r * CELL_SIZE;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#111118';
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

      // Draw special colored cells for starts/safe spots
      SAFE_ABS.forEach((safeIdx, cIdx) => {
        if (safeIdx === i) {
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          
          // Draw a small star
          ctx.fillStyle = '#ffffff';
          ctx.font = '16px "DM Sans", sans-serif';
          ctx.fillText('★', x + CELL_SIZE/2, y + CELL_SIZE/2 + 5);
        }
      });
    });

    // Color code home stretch paths
    for (let idx = 0; idx < 6; idx++) {
      // Red
      ctx.fillStyle = COLOR_HEX.red + '66';
      ctx.fillRect((1 + idx) * CELL_SIZE, 7 * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      // Green
      ctx.fillStyle = COLOR_HEX.green + '66';
      ctx.fillRect(7 * CELL_SIZE, (1 + idx) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      // Yellow
      ctx.fillStyle = COLOR_HEX.yellow + '66';
      ctx.fillRect((13 - idx) * CELL_SIZE, 7 * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      // Blue
      ctx.fillStyle = COLOR_HEX.blue + '66';
      ctx.fillRect(7 * CELL_SIZE, (13 - idx) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    // Center Home area triangles
    const centerColors = [COLOR_HEX.red, COLOR_HEX.green, COLOR_HEX.yellow, COLOR_HEX.blue];
    const cx = 300, cy = 300;
    ctx.lineWidth = 2;

    // Red Left Triangle
    ctx.fillStyle = centerColors[0] + '33';
    ctx.beginPath(); ctx.moveTo(6*CELL_SIZE, 6*CELL_SIZE); ctx.lineTo(cx, cy); ctx.lineTo(6*CELL_SIZE, 9*CELL_SIZE); ctx.closePath(); ctx.fill();

    // Green Top Triangle
    ctx.fillStyle = centerColors[1] + '33';
    ctx.beginPath(); ctx.moveTo(6*CELL_SIZE, 6*CELL_SIZE); ctx.lineTo(cx, cy); ctx.lineTo(9*CELL_SIZE, 6*CELL_SIZE); ctx.closePath(); ctx.fill();

    // Yellow Right Triangle
    ctx.fillStyle = centerColors[2] + '33';
    ctx.beginPath(); ctx.moveTo(9*CELL_SIZE, 6*CELL_SIZE); ctx.lineTo(cx, cy); ctx.lineTo(9*CELL_SIZE, 9*CELL_SIZE); ctx.closePath(); ctx.fill();

    // Blue Bottom Triangle
    ctx.fillStyle = centerColors[3] + '33';
    ctx.beginPath(); ctx.moveTo(6*CELL_SIZE, 9*CELL_SIZE); ctx.lineTo(cx, cy); ctx.lineTo(9*CELL_SIZE, 9*CELL_SIZE); ctx.closePath(); ctx.fill();

    // Draw center frame
    ctx.strokeStyle = '#ffffff55';
    ctx.strokeRect(6*CELL_SIZE, 6*CELL_SIZE, 3*CELL_SIZE, 3*CELL_SIZE);

    if (!this.state) return;

    // 3. Draw Tokens
    for (const [id, p] of Object.entries(this.state.players)) {
      const pColor = COLOR_HEX[p.color];
      const isMe = id === this.mySocketId;

      p.tokens.forEach((t, tIdx) => {
        const coords = this.getTokenCoords(p.playerIndex, p.color, tIdx, t.pos);
        const tx = coords.c * CELL_SIZE + CELL_SIZE/2;
        const ty = coords.r * CELL_SIZE + CELL_SIZE/2;

        ctx.save();
        ctx.fillStyle = pColor;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = isMe ? 2.5 : 1.5;
        
        ctx.beginPath();
        ctx.arc(tx, ty, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner core
        ctx.fillStyle = '#060810';
        ctx.beginPath();
        ctx.arc(tx, ty, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // 4. Draw Center Dice Box
    ctx.fillStyle = '#1c1c24';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 24, cy - 24, 48, 48, 8);
    ctx.fill();
    ctx.stroke();

    // Draw Dice Dots
    ctx.fillStyle = this.state.currentTurn === this.mySocketId ? COLOR_HEX[this.state.players[this.mySocketId].color] : '#ffffff';
    this.drawDiceDots(ctx, cx, cy, this.currDiceFace);
  }

  drawDiceDots(ctx, cx, cy, face) {
    const r = 3;
    const drawDot = (dx, dy) => {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
      ctx.fill();
    };

    if (face === 1) {
      drawDot(0, 0);
    } else if (face === 2) {
      drawDot(-10, -10);
      drawDot(10, 10);
    } else if (face === 3) {
      drawDot(-10, -10);
      drawDot(0, 0);
      drawDot(10, 10);
    } else if (face === 4) {
      drawDot(-10, -10);
      drawDot(10, -10);
      drawDot(-10, 10);
      drawDot(10, 10);
    } else if (face === 5) {
      drawDot(-10, -10);
      drawDot(10, -10);
      drawDot(0, 0);
      drawDot(-10, 10);
      drawDot(10, 10);
    } else if (face === 6) {
      drawDot(-10, -10);
      drawDot(10, -10);
      drawDot(-10, 0);
      drawDot(10, 0);
      drawDot(-10, 10);
      drawDot(10, 10);
    }
  }

  destroy() {
    this.canvas.removeEventListener('click', this._onClick);
    for (const [ev, fn] of Object.entries(this._boundHandlers)) {
      this.socket.off(ev, fn);
    }
    super.destroy();
  }
}
