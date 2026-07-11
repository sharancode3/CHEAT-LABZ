import { GameBase } from '../../core/game-base.js';

class OrbPopDeluxe extends GameBase {
  static logicalWidth = 480;
  static logicalHeight = 640;

  init() {
    this.score = 0;
    this.lives = 1; // reach bottom = game over
    this.isOver = false;

    this.orbRadius = 14;
    this.orbDiameter = this.orbRadius * 2;
    this.rowHeight = Math.round(this.orbDiameter * 0.866); // Hex row spacing = 24px

    this.gridCols = 15;
    this.gridRows = 22;

    const lvl = this.level;
    this.orbColors = ['#ff7675', '#74b9ff', '#55efc4', '#ffe259', '#a29bfe', '#ff9f43', '#ffffff'];
    const colorCounts = [0, 5, 5, 5, 6, 6, 6, 7, 7, 7, 7];
    const colorCount = colorCounts[lvl] || 7;
    this.activeColors = this.orbColors.slice(0, colorCount);

    this.grid = []; // 2D hex grid cells: { r, c, color, type: 'normal'|'armored'|'bomb'|'stone', armorHits: 1, scale, popTimer: 0 }
    this.setupGrid();

    // Launcher setup
    this.launcher = {
      x: 240,
      y: 600
    };
    
    this.shotCount = 0;
    const shotLimits = [0, 8, 7, 6, 8, 8, 8, 5, 8, 8, 4];
    this.shotsBeforeNewRow = shotLimits[lvl] || 8;

    // Upcoming queue (show next 2)
    this.orbQueue = [this.randomColor(), this.randomColor(), this.randomColor()];

    this.activeOrb = null; // { x, y, vx, vy, color, type }
    this.fallingOrbs = []; // { x, y, vx, vy, color, type }
    this.particles = []; // { x, y, vx, vy, color, size, opacity }

    this.aimAngle = -Math.PI / 2;

    this.warningTopFlash = 0;
    this.totalTime = 0;
  }

  randomColor() {
    return this.randomChoice(this.activeColors);
  }

  setupGrid() {
    this.grid = [];
    const lvl = this.level;
    const startRows = lvl === 1 ? 6 : lvl === 2 ? 8 : lvl === 10 ? 12 : 9;

    for (let r = 0; r < this.gridRows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.gridCols; c++) {
        // Only populate starting top rows
        if (r < startRows) {
          const color = this.randomColor();
          let type = 'normal';
          let hits = 1;

          // L5: Armored orbs
          if (lvl === 5 && Math.random() < 0.15) { type = 'armored'; hits = 2; }
          // L6: Bomb orbs
          if (lvl === 6 && Math.random() < 0.10) { type = 'bomb'; }
          // L8: Stone orbs
          if (lvl === 8 && Math.random() < 0.12) { type = 'stone'; }

          // L9 & L10: Mixed specials
          if ((lvl === 9 || lvl === 10) && Math.random() < 0.20) {
            const rolls = ['armored', 'bomb', 'stone'];
            type = this.randomChoice(rolls);
            if (type === 'armored') hits = 2;
          }

          this.grid[r][c] = {
            r,
            c,
            color,
            type,
            armorHits: hits,
            scale: 1.0,
            popTimer: 0
          };
        } else {
          this.grid[r][c] = null;
        }
      }
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    this.totalTime += delta;
    const dt = delta / 1000;

    // Visual flashes
    if (this.warningTopFlash > 0) this.warningTopFlash = Math.max(0, this.warningTopFlash - delta);

    // Update particles
    this.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.opacity = Math.max(0, p.opacity - delta / 300);
    });
    this.particles = this.particles.filter(p => p.opacity > 0);

    // Update falling/orphaned orbs
    this.fallingOrbs.forEach(fo => {
      fo.vy += 800 * dt; // gravity
      fo.x += fo.vx * dt;
      fo.y += fo.vy * dt;
    });
    this.fallingOrbs = this.fallingOrbs.filter(fo => fo.y < 680);

    // Update active cell scale pops
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const orb = this.grid[r][c];
        if (orb && orb.popTimer > 0) {
          orb.popTimer = Math.max(0, orb.popTimer - delta);
          orb.scale = 1.0 + (1.0 - orb.popTimer / 150) * 0.4;
          if (orb.popTimer === 0) {
            this.grid[r][c] = null;
          }
        }
      }
    }

    // Aim launcher
    const inp = this.input;
    const m = inp.getMousePos();
    let dx = m.x - this.launcher.x;
    let dy = m.y - this.launcher.y;
    if (dy > -10) dy = -10; // clamp aim range up
    this.aimAngle = Math.atan2(dy, dx);

    // Shoot
    if (inp.clicked && !this.activeOrb) {
      this.activeOrb = {
        x: this.launcher.x,
        y: this.launcher.y,
        vx: Math.cos(this.aimAngle) * 550,
        vy: Math.sin(this.aimAngle) * 550,
        color: this.orbQueue.shift(),
        type: 'normal',
        trail: []
      };
      this.orbQueue.push(this.randomColor());
    }

    // Move Active Orb
    if (this.activeOrb) {
      // Update trail
      this.activeOrb.trail.push({ x: this.activeOrb.x, y: this.activeOrb.y });
      if (this.activeOrb.trail.length > 3) this.activeOrb.trail.shift();

      this.activeOrb.x += this.activeOrb.vx * dt;
      this.activeOrb.y += this.activeOrb.vy * dt;

      // Bounce off side walls
      if (this.activeOrb.x - this.orbRadius <= 0) {
        this.activeOrb.x = this.orbRadius;
        this.activeOrb.vx = Math.abs(this.activeOrb.vx);
      } else if (this.activeOrb.x + this.orbRadius >= 480) {
        this.activeOrb.x = 480 - this.orbRadius;
        this.activeOrb.vx = -Math.abs(this.activeOrb.vx);
      }

      // Check collision with grid ceiling or existing orbs
      let collided = false;
      
      if (this.activeOrb.y - this.orbRadius <= 0) {
        collided = true;
      } else {
        // check grid orbs
        for (let r = 0; r < this.gridRows; r++) {
          for (let c = 0; c < this.gridCols; c++) {
            const cell = this.grid[r][c];
            if (cell && cell.popTimer === 0) {
              const pos = this.getHexCoords(r, c);
              const dist = Math.hypot(this.activeOrb.x - pos.x, this.activeOrb.y - pos.y);
              if (dist <= this.orbDiameter - 4) { // overlap threshold
                collided = true;
                break;
              }
            }
          }
          if (collided) break;
        }
      }

      if (collided) {
        this.snapToGrid(this.activeOrb);
        this.activeOrb = null;
      }
    }
  }

  getHexCoords(r, c) {
    const isOdd = (r % 2 === 1);
    const offsetX = isOdd ? this.orbRadius : 0;
    const x = c * this.orbDiameter + this.orbRadius + offsetX;
    const y = r * this.rowHeight + this.orbRadius;
    return { x, y };
  }

  snapToGrid(orb) {
    // Find closest empty grid cell
    let closestCell = null;
    let minDist = Infinity;

    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        if (!this.grid[r][c]) {
          const pos = this.getHexCoords(r, c);
          const dist = Math.hypot(orb.x - pos.x, orb.y - pos.y);
          if (dist < minDist) {
            minDist = dist;
            closestCell = { r, c };
          }
        }
      }
    }

    if (closestCell) {
      const { r, c } = closestCell;
      this.grid[r][c] = {
        r,
        c,
        color: orb.color,
        type: 'normal',
        armorHits: 1,
        scale: 1.0,
        popTimer: 0
      };

      // Check Match
      this.checkMatches(r, c);

      // Increment shot counts
      this.shotCount++;
      if (this.shotCount >= this.shotsBeforeNewRow) {
        this.shotCount = 0;
        this.descendNewRow();
      }

      // Check GameOver threshold (reaches bottom row 20)
      this.verifyGameOver();
    }
  }

  checkMatches(startR, startC) {
    const startOrb = this.grid[startR][startC];
    if (!startOrb) return;

    // 1. BFS to collect same color connected cluster
    const cluster = [];
    const queue = [startOrb];
    const visited = new Set();
    visited.add(startOrb);

    while (queue.length > 0) {
      const curr = queue.shift();
      cluster.push(curr);

      const neighbors = this.getNeighbors(curr.r, curr.c);
      neighbors.forEach(n => {
        const neigh = this.grid[n.r][n.c];
        if (neigh && neigh.popTimer === 0 && !visited.has(neigh)) {
          // color match (ignore stone blocks unless they drop)
          if (neigh.color === startOrb.color && neigh.type !== 'stone') {
            visited.add(neigh);
            queue.push(neigh);
          }
        }
      });
    }

    if (cluster.length >= 3) {
      // Pop matches
      let hasBomb = false;
      cluster.forEach(o => {
        const cell = this.grid[o.r][o.c];
        if (cell) {
          if (cell.type === 'bomb') hasBomb = true;

          cell.armorHits--;
          if (cell.armorHits <= 0) {
            cell.popTimer = 150;
            this.spawnBurstParticles(o.r, o.c, cell.color);
            this.score += 15;
          }
        }
      });

      // Handle Bomb explosion 3x3 surrounding
      if (hasBomb) {
        cluster.forEach(o => {
          const neighbors = this.getNeighbors(o.r, o.c);
          neighbors.forEach(n => {
            const cell = this.grid[n.r][n.c];
            if (cell && cell.type !== 'stone' && cell.popTimer === 0) {
              cell.popTimer = 150;
              this.score += 10;
            }
          });
        });
      }

      // 2. Cascade drops (Orphaned orbs detection)
      setTimeout(() => {
        this.dropOrphans();
      }, 160);
    }
  }

  getNeighbors(r, c) {
    const isOdd = (r % 2 === 1);
    const candidates = [];
    
    // Left, Right
    candidates.push({ r, c: c - 1 }, { r, c: c + 1 });

    if (isOdd) {
      candidates.push(
        { r: r - 1, c }, { r: r - 1, c: c + 1 },
        { r: r + 1, c }, { r: r + 1, c: c + 1 }
      );
    } else {
      candidates.push(
        { r: r - 1, c: c - 1 }, { r: r - 1, c },
        { r: r + 1, c: c - 1 }, { r: r + 1, c }
      );
    }

    // Filter bounds
    return candidates.filter(n => n.r >= 0 && n.r < this.gridRows && n.c >= 0 && n.c < this.gridCols);
  }

  dropOrphans() {
    const visited = new Set();
    const queue = [];

    // Queue top row cells
    for (let c = 0; c < this.gridCols; c++) {
      const topCell = this.grid[0][c];
      if (topCell && topCell.popTimer === 0) {
        queue.push(topCell);
        visited.add(topCell);
      }
    }

    // BFS top-down connectivity
    while (queue.length > 0) {
      const curr = queue.shift();
      const neighbors = this.getNeighbors(curr.r, curr.c);
      
      neighbors.forEach(n => {
        const neigh = this.grid[n.r][n.c];
        if (neigh && neigh.popTimer === 0 && !visited.has(neigh)) {
          visited.add(neigh);
          queue.push(neigh);
        }
      });
    }

    // Drop any orphaned occupied cell
    let droppedCount = 0;
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const orb = this.grid[r][c];
        if (orb && orb.popTimer === 0 && !visited.has(orb)) {
          const pos = this.getHexCoords(r, c);
          this.fallingOrbs.push({
            x: pos.x,
            y: pos.y,
            vx: this.randomChoice([-80, 80]),
            vy: -100,
            color: orb.color
          });
          this.grid[r][c] = null;
          droppedCount++;
        }
      }
    }

    if (droppedCount > 0) {
      this.score += droppedCount * 50;
      
      // Verify level clear (if grid empty of non-stone items)
      this.verifyLevelClear();
    }
  }

  descendNewRow() {
    this.warningTopFlash = 250;

    // Shift everything down 1 row
    for (let r = this.gridRows - 1; r > 0; r--) {
      this.grid[r] = this.grid[r - 1];
      // update row indexes
      this.grid[r].forEach(cell => {
        if (cell) cell.r = r;
      });
    }

    // Insert new top row
    this.grid[0] = [];
    for (let c = 0; c < this.gridCols; c++) {
      this.grid[0][c] = {
        r: 0,
        c,
        color: this.randomColor(),
        type: 'normal',
        armorHits: 1,
        scale: 1.0,
        popTimer: 0
      };
    }
  }

  verifyGameOver() {
    for (let c = 0; c < this.gridCols; c++) {
      const bottomCell = this.grid[20][c]; // bottom threshold
      if (bottomCell && bottomCell.popTimer === 0) {
        this.isOver = true;
        this.gameOver();
        return;
      }
    }
  }

  verifyLevelClear() {
    let empty = true;
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const cell = this.grid[r][c];
        if (cell && cell.type !== 'stone' && cell.popTimer === 0) {
          empty = false;
        }
      }
    }

    if (empty) {
      this.levelComplete();
    }
  }

  spawnBurstParticles(r, c, color) {
    const pos = this.getHexCoords(r, c);
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 60;
      this.particles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2 + Math.random() * 2,
        opacity: 1.0
      });
    }
  }

  render(ctx) {
    // Pure dark background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, this.W, this.H);

    // Warning row descent top flash
    if (this.warningTopFlash > 0) {
      ctx.fillStyle = `rgba(255, 118, 117, ${0.12 * (this.warningTopFlash / 250)})`;
      ctx.fillRect(0, 0, this.W, 60);
    }

    // Draw grid orbs
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const cell = this.grid[r][c];
        if (!cell) continue;

        const pos = this.getHexCoords(r, c);
        
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(cell.scale, cell.scale);

        // draw radial shading
        const radGrd = ctx.createRadialGradient(0, 0, 2, 0, 0, this.orbRadius);
        radGrd.addColorStop(0, '#ffffff');
        radGrd.addColorStop(0.3, cell.color);
        radGrd.addColorStop(1, '#000000');
        ctx.fillStyle = radGrd;

        ctx.beginPath();
        ctx.arc(0, 0, this.orbRadius, 0, Math.PI * 2);
        ctx.fill();

        // Special outlines (Armored / Stone)
        if (cell.type === 'stone') {
          ctx.strokeStyle = '#2d3436';
          ctx.lineWidth = 3.5;
          ctx.strokeRect(-8, -8, 16, 16);
        } else if (cell.type === 'armored') {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-6, -6, 12, 12);
        } else if (cell.type === 'bomb') {
          ctx.strokeStyle = '#ffe57f';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, this.orbRadius * 0.4, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }
    }

    // Draw active orb & trail
    if (this.activeOrb) {
      this.activeOrb.trail.forEach((pos, idx) => {
        ctx.fillStyle = this.activeOrb.color;
        ctx.globalAlpha = 0.2 * (idx / this.activeOrb.trail.length);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, this.orbRadius * 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      ctx.fillStyle = this.activeOrb.color;
      ctx.beginPath();
      ctx.arc(this.activeOrb.x, this.activeOrb.y, this.orbRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw falling orbs
    this.fallingOrbs.forEach(fo => {
      ctx.fillStyle = fo.color;
      ctx.beginPath();
      ctx.arc(fo.x, fo.y, this.orbRadius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw particles
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Draw aiming preview dots (4 dots bounce)
    if (!this.activeOrb) {
      ctx.fillStyle = 'rgba(0, 206, 201, 0.4)'; // Accent color
      let px = this.launcher.x;
      let py = this.launcher.y;
      let pvx = Math.cos(this.aimAngle) * 15;
      let pvy = Math.sin(this.aimAngle) * 15;

      for (let i = 0; i < 4; i++) {
        // step forward
        px += pvx * 5;
        py += pvy * 5;

        // wall reflect
        if (px <= this.orbRadius) {
          px = this.orbRadius;
          pvx = Math.abs(pvx);
        } else if (px >= 480 - this.orbRadius) {
          px = 480 - this.orbRadius;
          pvx = -Math.abs(pvx);
        }

        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Launcher arrow
    ctx.save();
    ctx.translate(this.launcher.x, this.launcher.y);
    ctx.rotate(this.aimAngle);
    
    ctx.fillStyle = '#00cec9';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-10, -12);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();

    // Launcher queue previews (Right of launcher)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = "10px 'DM Sans', sans-serif";
    ctx.fillText("NEXT:", this.W - 100, this.H - 45);

    // Queue bubbles
    this.orbQueue.slice(0, 2).forEach((col, idx) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(this.W - 60 + idx * 24, this.H - 48, this.orbRadius * 0.7, 0, Math.PI * 2);
      ctx.fill();
    });

    // Score center bottom indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${this.score}`, 24, this.H - 24);

    // Shot count to descent warning
    const remainingShots = this.shotsBeforeNewRow - this.shotCount;
    ctx.textAlign = 'right';
    ctx.fillText(`SHOTS TO DESCEND: ${remainingShots}`, this.W - 24, this.H - 24);
  }

  destroy() {
    super.destroy();
  }
}

window.GameClass = OrbPopDeluxe;
export default OrbPopDeluxe;
