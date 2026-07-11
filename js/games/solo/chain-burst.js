import { GameBase } from '../../core/game-base.js';

class ChainBurst extends GameBase {
  static logicalWidth = 500;
  static logicalHeight = 500;

  init() {
    this.score = 0;
    this.lives = 3;
    this.isOver = false;

    this.gridSize = 8;
    this.cellW = 500 / this.gridSize;

    const lvl = this.level;

    // Timer configs: L1:90s, L2:80s, L3:75s, L4:70s, L5:75s, L6:70s, L7:65s, L8:60s, L9:55s, L10:50s
    const times = [0, 90000, 80000, 75000, 70000, 75000, 70000, 65000, 60000, 55000, 50000];
    this.timeLimit = times[lvl] || 50000;
    this.timer = this.timeLimit;
    this.totalTime = 0;

    // 7 desaturated readable colors
    this.orbColors = [
      '#ff8a80', // red
      '#80d8ff', // blue
      '#b9f6ca', // green
      '#ffe57f', // yellow
      '#ea80fc', // magenta
      '#ffb74d', // orange
      '#a29bfe'  // purple/accent
    ];

    const colorCounts = [0, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7];
    const colorCount = colorCounts[lvl] || 7;
    this.activeColors = this.orbColors.slice(0, colorCount);

    this.grid = []; // 2D array of orbs: { row, col, color, type: 'normal'|'wild'|'locked'|'bomb'|'rainbow', scale, targetY, currentY, popTimer: 0 }
    
    // special walls configuration (Level 7)
    this.walls = []; // Array of { r, c }
    if (lvl === 7 || lvl === 9 || lvl === 10) {
      this.walls.push({ r: 3, c: 3 }, { r: 3, c: 4 }, { r: 4, c: 3 }, { r: 4, c: 4 });
    }

    this.chain = []; // Array of orbs
    this.isDragging = false;
    
    this.comboMultiplier = 1;
    this.settleTimer = 0;
    this.particles = []; // { x, y, vx, vy, color, size, opacity }

    this.floaters = []; // { x, y, text, color, timer }

    this.setupGrid();
  }

  setupGrid() {
    this.grid = [];
    const lvl = this.level;

    for (let r = 0; r < this.gridSize; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.gridSize; c++) {
        if (this.isWall(r, c)) {
          this.grid[r][c] = null;
          continue;
        }

        const color = this.randomChoice(this.activeColors);
        let type = 'normal';

        // L3: Wild orbs
        if (lvl === 3 && Math.random() < 0.08) type = 'wild';
        // L5: Locked orbs
        if (lvl === 5 && Math.random() < 0.12) type = 'locked';
        // L6: Bomb orbs
        if (lvl === 6 && Math.random() < 0.08) type = 'bomb';
        // L8: Rainbow orbs
        if (lvl === 8 && Math.random() < 0.08) type = 'rainbow';

        // L9 & L10: All specials active
        if ((lvl === 9 || lvl === 10) && Math.random() < 0.15) {
          const rolls = ['wild', 'locked', 'bomb', 'rainbow'];
          type = this.randomChoice(rolls);
        }

        this.grid[r][c] = {
          row: r,
          col: c,
          color,
          type,
          scale: 1.0,
          currentY: r * this.cellW,
          targetY: r * this.cellW,
          popTimer: 0
        };
      }
    }
  }

  isWall(r, c) {
    return this.walls.some(w => w.r === r && w.c === c);
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    this.totalTime += delta;
    this.timer -= delta;

    if (this.timer <= 0) {
      this.isOver = true;
      this.gameOver();
      return;
    }

    // L10: Grid resets with harder distribution at 25s mark
    if (this.level === 10 && this.totalTime >= 25000 && !this.gridResetTriggered) {
      this.gridResetTriggered = true;
      this.setupGrid();
      this.floaters.push({
        x: 250,
        y: 250,
        text: "GRID RESET",
        color: '#ff7675',
        timer: 1000
      });
    }

    // Update particles
    this.particles.forEach(p => {
      p.x += p.vx * (delta / 1000);
      p.y += p.vy * (delta / 1000);
      p.opacity = Math.max(0, p.opacity - delta / 400);
    });
    this.particles = this.particles.filter(p => p.opacity > 0);

    // Update floaters
    this.floaters.forEach(f => f.timer -= delta);
    this.floaters = this.floaters.filter(f => f.timer > 0);

    // Update orb animations
    let isMoving = false;
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const orb = this.grid[r][c];
        if (!orb) continue;

        // update y position lerp
        if (orb.currentY !== orb.targetY) {
          isMoving = true;
          orb.currentY += (orb.targetY - orb.currentY) * 0.15;
          if (Math.abs(orb.targetY - orb.currentY) < 1.0) {
            orb.currentY = orb.targetY;
          }
        }

        // update pop timers
        if (orb.popTimer > 0) {
          orb.popTimer = Math.max(0, orb.popTimer - delta);
          orb.scale = 1.0 + (1.0 - orb.popTimer / 150) * 0.3;
          if (orb.popTimer === 0) {
            // fully remove
            this.grid[r][c] = null;
          }
        }
      }
    }

    // If orbs are still falling, delay inputs
    if (isMoving) {
      this.settleTimer = 300;
      return;
    }

    if (this.settleTimer > 0) {
      this.settleTimer -= delta;
      if (this.settleTimer <= 0) {
        // scan for automatic combo matches
        this.scanForCombos();
      }
      return;
    }

    // Handle Drag Input Actions
    const inp = this.input;
    const m = inp.getMousePos();

    if (inp.isMouseHeld()) {
      const col = Math.floor(m.x / this.cellW);
      const row = Math.floor(m.y / this.cellW);

      if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
        const clickedOrb = this.grid[row][col];
        
        if (clickedOrb && clickedOrb.popTimer === 0 && clickedOrb.type !== 'locked') {
          if (!this.isDragging) {
            this.isDragging = true;
            this.chain = [clickedOrb];
          } else {
            // Drag additions
            const last = this.chain[this.chain.length - 1];
            const alreadyInChain = this.chain.some(o => o.row === row && o.col === col);
            
            if (!alreadyInChain) {
              const diffRow = Math.abs(clickedOrb.row - last.row);
              const diffCol = Math.abs(clickedOrb.col - last.col);
              const isAdjacent = (diffRow + diffCol === 1);

              if (isAdjacent) {
                // Color verification
                // Wild match or same color
                const headOrb = this.chain[0];
                const matchesColor = (clickedOrb.color === headOrb.color || clickedOrb.type === 'wild' || headOrb.type === 'wild');
                const bothRainbow = (clickedOrb.type === 'rainbow' && headOrb.type === 'rainbow');
                
                // Rainbow only matches rainbow
                const isHeadRainbow = (headOrb.type === 'rainbow');
                const isClickedRainbow = (clickedOrb.type === 'rainbow');

                let canChain = false;
                if (isHeadRainbow || isClickedRainbow) {
                  canChain = bothRainbow;
                } else {
                  canChain = matchesColor;
                }

                if (canChain) {
                  this.chain.push(clickedOrb);
                  clickedOrb.scale = 1.1;
                }
              }
            }
          }
        }
      }
    } else {
      // Mouse released: verify burst
      if (this.isDragging) {
        this.isDragging = false;
        if (this.chain.length >= 3) {
          this.burstChain(this.chain);
        } else {
          // Reset scales
          this.chain.forEach(o => o.scale = 1.0);
        }
        this.chain = [];
      }
    }
  }

  burstChain(chainList) {
    this.comboMultiplier = 1;
    this.applyBurst(chainList);
  }

  applyBurst(chainList) {
    const centerCell = chainList[Math.floor(chainList.length / 2)];
    
    // Spawn bomb explosions if any bomb inside chain
    let triggerBomb = false;
    chainList.forEach(o => {
      if (o.type === 'bomb') triggerBomb = true;
    });

    if (triggerBomb && centerCell) {
      //爆 3x3 surrounding
      const surrounding = [];
      for (let r = centerCell.row - 1; r <= centerCell.row + 1; r++) {
        for (let c = centerCell.col - 1; c <= centerCell.col + 1; c++) {
          if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize) {
            const orb = this.grid[r][c];
            if (orb && orb.type !== 'locked' && !chainList.some(item => item.row === r && item.col === c)) {
              surrounding.push(orb);
            }
          }
        }
      }
      chainList = chainList.concat(surrounding);
    }

    // Set pop timers on chain
    chainList.forEach(o => {
      const gridOrb = this.grid[o.row][o.col];
      if (gridOrb) {
        gridOrb.popTimer = 150;
        this.spawnBurstParticles(gridOrb.col * this.cellW + this.cellW / 2, gridOrb.row * this.cellW + this.cellW / 2, gridOrb.color);
      }
    });

    // Score computation
    const baseScore = chainList.length * chainList.length * 10;
    const finalScore = baseScore * this.comboMultiplier;
    this.score += finalScore;

    // Spawn combo float text
    if (centerCell) {
      const cx = centerCell.col * this.cellW + this.cellW / 2;
      const cy = centerCell.row * this.cellW + this.cellW / 2;
      this.floaters.push({
        x: cx,
        y: cy,
        text: this.comboMultiplier > 1 ? `x${this.comboMultiplier} COMBO` : `+${finalScore}`,
        color: '#a29bfe',
        timer: 650
      });
    }

    // Trigger gravity falling compaction
    setTimeout(() => {
      this.applyGravity();
    }, 160);
  }

  applyGravity() {
    // For each column, slide blocks down
    for (let c = 0; c < this.gridSize; c++) {
      let writeRow = this.gridSize - 1;
      for (let r = this.gridSize - 1; r >= 0; r--) {
        if (this.isWall(r, c)) continue;

        const orb = this.grid[r][c];
        if (orb && orb.popTimer === 0) {
          // move to writeRow
          if (writeRow !== r) {
            orb.row = writeRow;
            orb.targetY = writeRow * this.cellW;
            this.grid[writeRow][c] = orb;
            this.grid[r][c] = null;
          }
          writeRow--;
        } else if (orb && orb.popTimer > 0) {
          this.grid[r][c] = null; // clean leftover
        }
      }

      // Fill empty spaces at top of column
      while (writeRow >= 0) {
        if (this.isWall(writeRow, c)) {
          writeRow--;
          continue;
        }

        const color = this.randomChoice(this.activeColors);
        const type = Math.random() < 0.1 ? (this.level >= 5 ? 'locked' : 'normal') : 'normal';

        this.grid[writeRow][c] = {
          row: writeRow,
          col: c,
          color,
          type,
          scale: 1.0,
          currentY: -100 - (writeRow * this.cellW), // fall from above top
          targetY: writeRow * this.cellW,
          popTimer: 0
        };
        writeRow--;
      }
    }

    this.settleTimer = 300;
  }

  scanForCombos() {
    // Simple scan logic to auto burst any adjacent matching clusters
    const visited = new Set();
    let comboTriggered = false;

    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const orb = this.grid[r][c];
        if (!orb || orb.type === 'locked' || visited.has(orb)) continue;

        // BFS to find cluster of same color
        const cluster = [];
        const queue = [orb];
        visited.add(orb);

        while (queue.length > 0) {
          const curr = queue.shift();
          cluster.push(curr);

          // Neighbors
          const directions = [
            { r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }
          ];

          directions.forEach(d => {
            const nr = curr.row + d.r;
            const nc = curr.col + d.c;
            if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize) {
              const neigh = this.grid[nr][nc];
              if (neigh && neigh.type !== 'locked' && !visited.has(neigh)) {
                if (neigh.color === orb.color || neigh.type === 'wild' || orb.type === 'wild') {
                  visited.add(neigh);
                  queue.push(neigh);
                }
              }
            }
          });
        }

        if (cluster.length >= 3) {
          comboTriggered = true;
          this.comboMultiplier++;
          this.applyBurst(cluster);
          return; // trigger one cascade at a time
        }
      }
    }
  }

  spawnBurstParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 3,
        opacity: 1.0
      });
    }
  }

  render(ctx) {
    this.clear();

    const radius = (this.cellW * 0.85) / 2;

    // Draw grid borders
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * this.cellW, 0);
      ctx.lineTo(i * this.cellW, 500);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * this.cellW);
      ctx.lineTo(500, i * this.cellW);
      ctx.stroke();
    }

    // Draw Orbs
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const orb = this.grid[r][c];
        if (this.isWall(r, c)) {
          // Draw wall block
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fillRect(c * this.cellW + 4, r * this.cellW + 4, this.cellW - 8, this.cellW - 8);
          continue;
        }

        if (!orb) continue;

        const ox = c * this.cellW + this.cellW / 2;
        const oy = orb.currentY + this.cellW / 2;

        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(orb.scale, orb.scale);

        // Fill color circular orb
        ctx.fillStyle = orb.color;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw special attributes (Locked / Bomb etc.)
        if (orb.type === 'locked') {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(-radius * 0.5, -radius * 0.5, radius, radius);
        } else if (orb.type === 'bomb') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (orb.type === 'wild') {
          // white inner dot
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
          ctx.fill();
        } else if (orb.type === 'rainbow') {
          ctx.strokeStyle = '#ffe57f';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }
    }

    // Draw chain drag lines
    if (this.isDragging && this.chain.length > 0) {
      ctx.strokeStyle = '#a29bfe';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      this.chain.forEach((o, idx) => {
        const ox = o.col * this.cellW + this.cellW / 2;
        const oy = o.row * this.cellW + this.cellW / 2;
        if (idx === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
      });
      ctx.stroke();
    }

    // Draw particles
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0; // reset

    // Draw combo/score floaters
    ctx.font = "bold 14px 'DM Sans', sans-serif";
    ctx.textAlign = 'center';
    this.floaters.forEach(f => {
      ctx.fillStyle = f.color || '#fff';
      const dy = 25 * (1.0 - f.timer / 650);
      ctx.fillText(f.text, f.x, f.y - dy);
    });

    // Timer Bar at very bottom
    const prg = Math.max(0, this.timer / this.timeLimit);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, this.H - 4, this.W, 4);
    ctx.fillStyle = prg < 0.3 ? '#ff7675' : '#a29bfe';
    ctx.fillRect(0, this.H - 4, this.W * prg, 4);

    // Muted bottom details
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${this.score}`, 24, this.H - 24);
  }

  destroy() {
    super.destroy();
  }
}

window.GameClass = ChainBurst;
export default ChainBurst;
