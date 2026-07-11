import { GameBase } from '../../core/game-base.js';

class TileRunner extends GameBase {
  static logicalWidth = 400;
  static logicalHeight = 680;

  init() {
    this.score = 0;
    this.lives = 3;
    this.isOver = false;

    const lvl = this.level;
    this.cols = lvl >= 7 ? 6 : lvl >= 4 ? 5 : 4;
    this.colW = 400 / this.cols;

    this.hitZoneY = 680 * 0.85; // 578px
    this.rowHeight = 110;

    // Speeds: base + hit count speed up
    this.baseSpeed = lvl === 1 ? 200 : lvl === 4 ? 200 : lvl === 7 ? 220 : 250;
    this.speedIncrement = 25;

    // Buffer lists
    this.rows = []; // Active onscreen and upcoming rows: { id, y, cells: [ { col, isDark, type, hitsRequired, hit, opacity } ] }
    this.rowIdCounter = 0;

    this.history = [];
    this.columnMapping = Array.from({ length: this.cols }, (_, i) => i); // for L10 column shuffles

    // Visual lists
    this.ripples = []; // { x, y, r, opacity }
    this.redFlashingColumns = {}; // col -> flashTimer

    this.totalTilesSpawned = 0;

    this.generateBuffer(30);
  }

  generateBuffer(count) {
    const lvl = this.level;

    for (let i = 0; i < count; i++) {
      const rowY = -this.rowHeight * (this.rows.length + 1);

      // Pick column avoiding same column 3 times in a row
      let colA = this.pickNextColumn();
      this.history.push(colA);
      if (this.history.length > 5) this.history.shift();

      const cells = Array.from({ length: this.cols }, (_, cIdx) => ({
        col: cIdx,
        isDark: false,
        type: 'normal',
        hitsRequired: 1,
        hit: false,
        opacity: 1.0,
        fakeDarkTimer: 0
      }));

      // Set main dark tile
      cells[colA].isDark = true;

      // Special tile types
      let type = 'normal';
      let hits = 1;

      // L3: Speed tiles (hit twice, darker color)
      if (lvl === 3 && Math.random() < 0.15) { type = 'speed'; hits = 2; }
      // L5: Disappearing tiles
      if (lvl === 5 && Math.random() < 0.20) { type = 'disappearing'; }
      // L6: Fake tiles (light tiles that look dark briefly)
      if (lvl === 6 && Math.random() < 0.20) { type = 'fake'; }

      // L9 & L10: Mixed specials
      if (lvl === 9 || lvl === 10) {
        const roll = Math.random();
        if (roll < 0.1) { type = 'speed'; hits = 2; }
        else if (roll < 0.2) { type = 'disappearing'; }
        else if (roll < 0.3) { type = 'fake'; }
      }

      cells[colA].type = type;
      cells[colA].hitsRequired = hits;

      // L2, L8, L9, L10: double dark rows
      const doubleChance = (lvl === 2) ? 0.15 : (lvl >= 8) ? 0.3 : 0;
      if (Math.random() < doubleChance) {
        const colB = this.pickNextColumn(colA);
        cells[colB].isDark = true;
        cells[colB].type = type;
        cells[colB].hitsRequired = hits;
      }

      this.rows.push({
        id: this.rowIdCounter++,
        y: rowY,
        cells
      });

      this.totalTilesSpawned++;

      // L10: columns shift position every 30 tiles
      if (lvl === 10 && this.totalTilesSpawned % 30 === 0) {
        this.shuffleColumnMapping();
      }
    }
  }

  pickNextColumn(excludeCol = -1) {
    const available = [];
    for (let c = 0; c < this.cols; c++) {
      if (c === excludeCol) continue;
      // avoid same column 3 times
      const lastSameCount = this.history.slice(-2).filter(x => x === c).length;
      if (lastSameCount < 2) {
        available.push(c);
      }
    }
    return this.randomChoice(available.length > 0 ? available : [0, 1, 2, 3].slice(0, this.cols));
  }

  shuffleColumnMapping() {
    // Randomize the indexes
    for (let i = this.columnMapping.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.columnMapping[i], this.columnMapping[j]] = [this.columnMapping[j], this.columnMapping[i]];
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    const dt = delta / 1000;

    // Calculate current scroll speed
    const currentSpeed = this.baseSpeed + Math.floor(this.score / 15) * this.speedIncrement;

    // Update animations
    this.ripples.forEach(r => {
      r.r += delta * 0.15;
      r.opacity = Math.max(0, r.opacity - delta / 200);
    });
    this.ripples = this.ripples.filter(r => r.opacity > 0);

    // Update column flashes
    Object.keys(this.redFlashingColumns).forEach(col => {
      if (this.redFlashingColumns[col] > 0) {
        this.redFlashingColumns[col] = Math.max(0, this.redFlashingColumns[col] - delta);
      }
    });

    // Move rows down
    this.rows.forEach(r => {
      r.y += currentSpeed * dt;

      // Update special cell actions (fade or fake dark timers)
      r.cells.forEach(cell => {
        if (cell.type === 'disappearing' && r.y > 100) {
          cell.opacity = Math.max(0.1, cell.opacity - dt * 2.0); // fade out
        }
        if (cell.type === 'fake') {
          cell.fakeDarkTimer += delta;
        }
      });
    });

    // Verify missed rows passing hitZone limit (y > 680)
    this.rows.forEach(r => {
      r.cells.forEach(cell => {
        if (cell.isDark && !cell.hit && r.y > 680) {
          cell.hit = true; // prevent double count
          this.lives--;
          if (this.lives <= 0) {
            this.isOver = true;
            this.gameOver();
          }
        }
      });
    });

    // Clean up offscreen rows
    this.rows = this.rows.filter(r => r.y < 700);

    // Repopulate buffer if it drops
    if (this.rows.length < 20) {
      this.generateBuffer(15);
    }

    // Process click/tap inputs
    const inp = this.input;
    if (inp.clicked) {
      const m = inp.getMousePos();
      
      // Determine column index clicked (handling L10 shuffles)
      let clickColIdx = Math.floor(m.x / this.colW);
      if (clickColIdx >= 0 && clickColIdx < this.cols) {
        // Retrieve physical/mapped column index
        const mappedColIdx = this.columnMapping[clickColIdx];
        this.tapColumn(mappedColIdx, m.x, m.y);
      }
    }
  }

  tapColumn(colIdx, clickX, clickY) {
    // Find the lowest active row that has a dark cell in this column
    const candidates = this.rows.filter(r => {
      const cell = r.cells[colIdx];
      // check if it is dark and is inside the hittable range
      const inRangeY = r.y + this.rowHeight >= this.hitZoneY - 40 && r.y <= 680;
      return cell && cell.isDark && !cell.hit && inRangeY;
    });

    // Sort by lowest y (closest to bottom)
    candidates.sort((a, b) => b.y - a.y);

    const targetRow = candidates[0];
    if (targetRow) {
      const cell = targetRow.cells[colIdx];
      cell.hitsRequired--;
      
      if (cell.hitsRequired <= 0) {
        cell.hit = true;
        this.score++;
      }

      // Hit effect
      this.ripples.push({
        x: clickX,
        y: clickY,
        r: 10,
        opacity: 1.0
      });
    } else {
      // Missed / clicked light column
      this.lives--;
      this.redFlashingColumns[colIdx] = 200; // flash column red

      if (this.lives <= 0) {
        this.isOver = true;
        this.gameOver();
      }
    }
  }

  render(ctx) {
    // Crisp light background for readability contrasts
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 0, this.W, this.H);

    // Draw Column Lane grids
    for (let c = 0; c < this.cols; c++) {
      const mappedCol = this.columnMapping[c];
      const lx = c * this.colW;

      // Lane separator
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, this.H);
      ctx.stroke();

      // Red flashing column indicator
      if (this.redFlashingColumns[mappedCol] > 0) {
        ctx.fillStyle = `rgba(255, 118, 117, ${0.1 * (this.redFlashingColumns[mappedCol] / 200)})`;
        ctx.fillRect(lx, 0, this.colW, this.H);
      }
    }

    // Render Row Tiles
    this.rows.forEach(r => {
      if (r.y < -this.rowHeight || r.y > this.H) return;

      r.cells.forEach(cell => {
        // Mapping column index visually
        const visualColIdx = this.columnMapping.indexOf(cell.col);
        const tx = visualColIdx * this.colW;

        const isDark = cell.isDark;
        const isHit = cell.hit;

        if (isDark && !isHit) {
          ctx.save();
          ctx.globalAlpha = cell.opacity;

          if (cell.type === 'speed') {
            // Speed tiles (darker blue)
            ctx.fillStyle = cell.hitsRequired === 2 ? '#00cec9' : '#0984e3';
          } else if (cell.type === 'fake') {
            // Light cell that looks dark briefly
            const blink = Math.floor(cell.fakeDarkTimer / 250) % 2 === 0;
            ctx.fillStyle = blink ? '#ffffff' : '#2a2a38';
          } else {
            ctx.fillStyle = '#ffffff'; // Dark tiles: white
          }

          ctx.fillRect(tx + 4, r.y + 4, this.colW - 8, this.rowHeight - 8);
          ctx.restore();
        } else {
          // Light tiles: default gray-dark
          ctx.fillStyle = '#2a2a38';
          ctx.fillRect(tx + 4, r.y + 4, this.colW - 8, this.rowHeight - 8);
        }
      });
    });

    // Draw Hit Zone line
    ctx.strokeStyle = 'rgba(9, 132, 227, 0.6)'; // Accent pulse
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, this.hitZoneY);
    ctx.lineTo(this.W, this.hitZoneY);
    ctx.stroke();

    // Draw ripples
    this.ripples.forEach(r => {
      ctx.strokeStyle = `rgba(9, 132, 227, ${r.opacity})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Miss indicators (3 circles top right)
    const mx = this.W - 70;
    const my = 25;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = '#ff7675';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mx + i * 18, my, 6, 0, Math.PI * 2);
      ctx.stroke();

      // remaining life filled
      if (i < this.lives) {
        ctx.fillStyle = '#ff7675';
        ctx.beginPath();
        ctx.arc(mx + i * 18, my, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Solved hits text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = "bold 13px 'DM Sans', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${this.score}`, 24, 30);
  }

  destroy() {
    super.destroy();
  }
}

window.GameClass = TileRunner;
export default TileRunner;
