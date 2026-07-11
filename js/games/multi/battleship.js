import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const GRID_SIZE = 10;
const CELL_SIZE = 24;
const MY_GRID_X = 40;
const MY_GRID_Y = 100;
const OPP_GRID_X = 400;
const OPP_GRID_Y = 100;

const SHIP_TYPES = [
  { name: 'Carrier',    size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser',    size: 3 },
  { name: 'Submarine',  size: 3 },
  { name: 'Destroyer',  size: 2 },
];

export default class BattleshipGame extends MultiplayerGameBase {
  static logicalWidth = 680;
  static logicalHeight = 460;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.phase = 'placement'; // 'placement' | 'waiting-ready' | 'battle' | 'finished'
    
    // My board setup
    this.myShips = []; // { name, size, x, y, horizontal, cells }
    this.myHits = [];  // { x, y }
    this.myMisses = []; // { x, y }
    this.currentPlacingIndex = 0; // index of SHIP_TYPES currently placing
    this.placingHorizontal = true;

    // Opponent board setup (fog of war)
    this.oppHits = []; // { x, y }
    this.oppMisses = []; // { x, y }
    this.oppSunkShips = []; // { name, cells }

    this.currentTurn = null;
    this.winner = null;

    // Animation states
    this.projectile = null; // { startX, startY, endX, endY, progress, hit, color }
    
    this._boundHandlers = {};
  }

  async init() {
    this.bindSocket();
    this.bindInput();
  }

  bindSocket() {
    const bind = (ev, fn) => {
      this._boundHandlers[ev] = fn;
      this.socket.on(ev, fn);
    };

    bind('battleship:player-ready', ({ socketId }) => {
      if (socketId === this.mySocketId) {
        this.phase = 'waiting-ready';
      }
    });

    bind('battleship:battle-start', ({ currentTurn }) => {
      this.phase = 'battle';
      this.currentTurn = currentTurn;
    });

    bind('battleship:shot-result', ({ shooterId, x, y, hit, sunkShip, allSunk, currentTurn }) => {
      const isMe = shooterId === this.mySocketId;
      const startGridX = isMe ? MY_GRID_X + 120 : OPP_GRID_X + 120;
      const startGridY = MY_GRID_Y + 120;
      const endGridX = isMe ? OPP_GRID_X + x * CELL_SIZE + CELL_SIZE / 2 : MY_GRID_X + x * CELL_SIZE + CELL_SIZE / 2;
      const endGridY = isMe ? OPP_GRID_Y + y * CELL_SIZE + CELL_SIZE / 2 : MY_GRID_Y + y * CELL_SIZE + CELL_SIZE / 2;

      // Queue projectile animation
      this.projectile = {
        startX: startGridX,
        startY: startGridY,
        endX: endGridX,
        endY: endGridY,
        progress: 0.0,
        hit,
        targetCell: { x, y },
        shooterId,
        sunkShip,
        allSunk,
        nextTurn: currentTurn
      };

      if (this.container) {
        this.container.audio.play('hit');
      }
    });

    bind('game:over', ({ winner }) => {
      this.phase = 'finished';
      this.winner = winner;
    });
  }

  bindInput() {
    this._onClick = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (BattleshipGame.logicalWidth / rect.width);
      const my = (e.clientY - rect.top)  * (BattleshipGame.logicalHeight / rect.height);

      if (this.projectile) return; // ignore clicks during animations

      if (this.phase === 'placement') {
        // Random Placement Button
        if (mx >= 180 && mx <= 340 && my >= 380 && my <= 415) {
          this.autoPlaceShips();
          return;
        }
        // Reset Button
        if (mx >= 350 && mx <= 440 && my >= 380 && my <= 415) {
          this.myShips = [];
          this.currentPlacingIndex = 0;
          return;
        }
        // Submit Button
        if (this.currentPlacingIndex >= SHIP_TYPES.length) {
          if (mx >= 230 && mx <= 430 && my >= 380 && my <= 415) {
            this.socket.emit('battleship:ready', { code: this.room.code, ships: this.myShips });
          }
          return;
        }

        // Placement click inside My Ocean
        const cell = this._getGridCoords(mx, my, MY_GRID_X, MY_GRID_Y);
        if (cell) {
          const shipConfig = SHIP_TYPES[this.currentPlacingIndex];
          const newShip = this._createShipObject(shipConfig.name, shipConfig.size, cell.x, cell.y, this.placingHorizontal);
          if (this._validatePlacement(newShip, this.myShips)) {
            this.myShips.push(newShip);
            this.currentPlacingIndex++;
            if (this.container) this.container.audio.play('hit');
          } else {
            if (this.container) this.container.audio.play('damage');
          }
        }
      } else if (this.phase === 'battle') {
        if (this.currentTurn !== this.mySocketId) return;

        // Click on Enemy Ocean grid
        const cell = this._getGridCoords(mx, my, OPP_GRID_X, OPP_GRID_Y);
        if (cell) {
          // Check if already shot there
          const alreadyShot = this.oppHits.some(h => h.x === cell.x && h.y === cell.y) ||
                              this.oppMisses.some(m => m.x === cell.x && m.y === cell.y);
          if (!alreadyShot) {
            this.socket.emit('battleship:fire', { code: this.room.code, x: cell.x, y: cell.y });
          }
        }
      }
    };

    this._onRightClick = (e) => {
      e.preventDefault();
      if (this.phase === 'placement') {
        this.placingHorizontal = !this.placingHorizontal;
      }
    };

    this._onMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (BattleshipGame.logicalWidth / rect.width);
      const my = (e.clientY - rect.top)  * (BattleshipGame.logicalHeight / rect.height);
      
      this.mousePos = { x: mx, y: my };
    };

    this._onKey = (e) => {
      if (this.phase === 'placement' && (e.code === 'Space' || e.code === 'KeyR')) {
        e.preventDefault();
        this.placingHorizontal = !this.placingHorizontal;
      }
    };

    this.canvas.addEventListener('click', this._onClick);
    this.canvas.addEventListener('contextmenu', this._onRightClick);
    this.canvas.addEventListener('mousemove', this._onMove);
    document.addEventListener('keydown', this._onKey);
  }

  _getGridCoords(mx, my, gridX, gridY) {
    if (mx >= gridX && mx < gridX + CELL_SIZE * GRID_SIZE &&
        my >= gridY && my < gridY + CELL_SIZE * GRID_SIZE) {
      return {
        x: Math.floor((mx - gridX) / CELL_SIZE),
        y: Math.floor((my - gridY) / CELL_SIZE)
      };
    }
    return null;
  }

  _createShipObject(name, size, x, y, horizontal) {
    const cells = [];
    for (let i = 0; i < size; i++) {
      cells.push({
        x: horizontal ? x + i : x,
        y: horizontal ? y : y + i
      });
    }
    return { name, size, x, y, horizontal, cells };
  }

  _validatePlacement(ship, existingShips) {
    // Check bounds
    for (const cell of ship.cells) {
      if (cell.x < 0 || cell.x >= GRID_SIZE || cell.y < 0 || cell.y >= GRID_SIZE) {
        return false;
      }
    }
    // Check overlap
    for (const other of existingShips) {
      for (const c1 of ship.cells) {
        for (const c2 of other.cells) {
          if (c1.x === c2.x && c1.y === c2.y) return false;
        }
      }
    }
    return true;
  }

  autoPlaceShips() {
    this.myShips = [];
    SHIP_TYPES.forEach(shipConfig => {
      let placed = false;
      let tries = 0;
      while (!placed && tries < 100) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        const horiz = Math.random() < 0.5;
        const newShip = this._createShipObject(shipConfig.name, shipConfig.size, x, y, horiz);
        if (this._validatePlacement(newShip, this.myShips)) {
          this.myShips.push(newShip);
          placed = true;
        }
        tries++;
      }
    });
    this.currentPlacingIndex = SHIP_TYPES.length;
  }

  update(dt) {
    // Projectile Animation update
    if (this.projectile) {
      this.projectile.progress += 2.0 * dt; // slide over 500ms
      if (this.projectile.progress >= 1.0) {
        const p = this.projectile;
        this.projectile = null;

        // Apply results
        const isMe = p.shooterId === this.mySocketId;
        const target = p.targetCell;
        if (isMe) {
          if (p.hit) {
            this.oppHits.push(target);
            if (p.sunkShip) {
              this.oppSunkShips.push(p.sunkShip);
            }
          } else {
            this.oppMisses.push(target);
          }
        } else {
          if (p.hit) {
            this.myHits.push(target);
          } else {
            this.myMisses.push(target);
          }
        }

        if (p.allSunk) {
          this.phase = 'finished';
        } else {
          this.currentTurn = p.nextTurn;
        }
      }
    }
  }

  render(ctx) {
    const cw = BattleshipGame.logicalWidth;
    const ch = BattleshipGame.logicalHeight;

    // Background
    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, cw, ch);

    // Title / Status Banner
    this._renderBanner(ctx, cw);

    // Draw Ocean grids
    this._drawGrid(ctx, MY_GRID_X, MY_GRID_Y, 'YOUR OCEAN', '#4ecdc4');
    this._drawGrid(ctx, OPP_GRID_X, OPP_GRID_Y, 'ENEMY OCEAN', '#ff6b6b');

    // Draw My Ships
    this.myShips.forEach(ship => {
      ctx.fillStyle = 'rgba(78, 205, 196, 0.25)';
      ctx.strokeStyle = '#4ecdc4';
      ctx.lineWidth = 1.5;
      this._drawRoundedRect(ctx, MY_GRID_X + ship.x * CELL_SIZE + 1, MY_GRID_Y + ship.y * CELL_SIZE + 1,
                            (ship.horizontal ? ship.size : 1) * CELL_SIZE - 2,
                            (ship.horizontal ? 1 : ship.size) * CELL_SIZE - 2, 4);
      ctx.fill();
      ctx.stroke();
    });

    // Draw Hover Placing Ship Outline
    if (this.phase === 'placement' && this.currentPlacingIndex < SHIP_TYPES.length && this.mousePos) {
      const coords = this._getGridCoords(this.mousePos.x, this.mousePos.y, MY_GRID_X, MY_GRID_Y);
      if (coords) {
        const shipConfig = SHIP_TYPES[this.currentPlacingIndex];
        const newShip = this._createShipObject(shipConfig.name, shipConfig.size, coords.x, coords.y, this.placingHorizontal);
        const valid = this._validatePlacement(newShip, this.myShips);

        ctx.fillStyle = valid ? 'rgba(78, 205, 196, 0.15)' : 'rgba(255, 107, 107, 0.15)';
        ctx.strokeStyle = valid ? '#4ecdc4' : '#ff6b6b';
        ctx.lineWidth = 1.5;
        this._drawRoundedRect(ctx, MY_GRID_X + newShip.x * CELL_SIZE + 1, MY_GRID_Y + newShip.y * CELL_SIZE + 1,
                              (newShip.horizontal ? newShip.size : 1) * CELL_SIZE - 2,
                              (newShip.horizontal ? 1 : newShip.size) * CELL_SIZE - 2, 4);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Draw My Hits/Misses
    this.myHits.forEach(h => this._drawMark(ctx, MY_GRID_X, MY_GRID_Y, h.x, h.y, true));
    this.myMisses.forEach(m => this._drawMark(ctx, MY_GRID_X, MY_GRID_Y, m.x, m.y, false));

    // Draw Opponent Hits/Misses on Enemy Ocean
    this.oppHits.forEach(h => this._drawMark(ctx, OPP_GRID_X, OPP_GRID_Y, h.x, h.y, true));
    this.oppMisses.forEach(m => this._drawMark(ctx, OPP_GRID_X, OPP_GRID_Y, m.x, m.y, false));

    // Draw Revealed Sunk Ships on Enemy Ocean
    this.oppSunkShips.forEach(ship => {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.0;
      const minX = Math.min(...ship.cells.map(c => c.x));
      const minY = Math.min(...ship.cells.map(c => c.y));
      const maxX = Math.max(...ship.cells.map(c => c.x));
      const maxY = Math.max(...ship.cells.map(c => c.y));
      ctx.strokeRect(OPP_GRID_X + minX * CELL_SIZE + 2, OPP_GRID_Y + minY * CELL_SIZE + 2,
                     (maxX - minX + 1) * CELL_SIZE - 4, (maxY - minY + 1) * CELL_SIZE - 4);
    });

    // Draw Projectile Arc Animation
    if (this.projectile) {
      const p = this.projectile;
      const t = p.progress;

      // Arc via quadratic Bezier
      const currentX = p.startX + (p.endX - p.startX) * t;
      const midY = Math.min(p.startY, p.endY) - 100;
      const currentY = (1 - t) * (1 - t) * p.startY + 2 * (1 - t) * t * midY + t * t * p.endY;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(currentX, currentY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bottom UI buttons in Placement Phase
    if (this.phase === 'placement') {
      if (this.currentPlacingIndex < SHIP_TYPES.length) {
        // Random Placement Button
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        this._drawRoundedRect(ctx, 180, 380, 160, 35, 6);
        ctx.fill(); ctx.stroke();
        ctx.font = 'bold 11px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('RANDOM', 260, 402);

        // Reset Button
        this._drawRoundedRect(ctx, 350, 380, 90, 35, 6);
        ctx.stroke();
        ctx.fillText('RESET', 395, 402);
      } else {
        // Submit Ready Button
        ctx.fillStyle = 'rgba(78, 205, 196, 0.15)';
        ctx.strokeStyle = '#4ecdc4';
        this._drawRoundedRect(ctx, 230, 380, 200, 35, 6);
        ctx.fill(); ctx.stroke();
        ctx.font = 'bold 11px "Press Start 2P", monospace';
        ctx.fillStyle = '#4ecdc4';
        ctx.textAlign = 'center';
        ctx.fillText('SUBMIT SHIPS', 330, 402);
      }
    }
  }

  _renderBanner(ctx, cw) {
    ctx.font = "bold 13px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    
    if (this.phase === 'placement') {
      const shipConfig = SHIP_TYPES[this.currentPlacingIndex];
      ctx.fillStyle = '#4ecdc4';
      ctx.fillText(`PLACE YOUR SHIPS: ${shipConfig ? shipConfig.name.toUpperCase() : 'DONE'} (${shipConfig ? shipConfig.size : 0} CELLS)`, cw / 2, 50);
      ctx.font = '11px "DM Sans", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText('Press SPACE/KeyR to rotate placement direction', cw / 2, 72);
    } else if (this.phase === 'waiting-ready') {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText('WAITING FOR OPPONENT TO PLACE SHIPS...', cw / 2, 50);
    } else if (this.phase === 'battle') {
      const myTurn = this.currentTurn === this.mySocketId;
      ctx.fillStyle = myTurn ? '#4ecdc4' : '#ff6b6b';
      ctx.fillText(myTurn ? 'YOUR TURN' : "OPPONENT'S TURN", cw / 2, 50);
    } else if (this.phase === 'finished') {
      const win = this.winner === this.mySocketId;
      ctx.fillStyle = win ? '#4ecdc4' : '#ff6b6b';
      ctx.fillText(win ? 'YOU WIN!' : 'OPPONENT WINS', cw / 2, 50);
    }
  }

  _drawGrid(ctx, startX, startY, label, accent) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    // Draw borders
    ctx.strokeRect(startX, startY, CELL_SIZE * GRID_SIZE, CELL_SIZE * GRID_SIZE);

    // Grid cells lines
    ctx.beginPath();
    for (let i = 1; i < GRID_SIZE; i++) {
      ctx.moveTo(startX + i * CELL_SIZE, startY);
      ctx.lineTo(startX + i * CELL_SIZE, startY + CELL_SIZE * GRID_SIZE);
      ctx.moveTo(startX, startY + i * CELL_SIZE);
      ctx.lineTo(startX + CELL_SIZE * GRID_SIZE, startY + i * CELL_SIZE);
    }
    ctx.stroke();

    // Labels
    ctx.font = "bold 11px 'DM Sans', sans-serif";
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'center';
    ctx.fillText(label, startX + (CELL_SIZE * GRID_SIZE) / 2, startY - 14);
  }

  _drawMark(ctx, gridX, gridY, x, y, hit) {
    const cx = gridX + x * CELL_SIZE + CELL_SIZE / 2;
    const cy = gridY + y * CELL_SIZE + CELL_SIZE / 2;

    ctx.save();
    if (hit) {
      // Red X
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 5);
      ctx.lineTo(cx + 5, cy + 5);
      ctx.moveTo(cx + 5, cy - 5);
      ctx.lineTo(cx - 5, cy + 5);
      ctx.stroke();
    } else {
      // White circle dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawRoundedRect(ctx, x, y, w, h, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  destroy() {
    this.canvas.removeEventListener('click', this._onClick);
    this.canvas.removeEventListener('contextmenu', this._onRightClick);
    this.canvas.removeEventListener('mousemove', this._onMove);
    document.removeEventListener('keydown', this._onKey);
    for (const [ev, fn] of Object.entries(this._boundHandlers)) {
      this.socket.off(ev, fn);
    }
    super.destroy();
  }
}
