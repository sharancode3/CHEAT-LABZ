import { GameBase } from '../../core/game-base.js';

export class WhackAMole extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.nodes = [];
    this.gridSize = 3;
    this.nodeSize = 140;
    this.spacing = 30;
    
    // Calculate layout
    const totalW = this.gridSize * this.nodeSize + (this.gridSize - 1) * this.spacing;
    const totalH = this.gridSize * this.nodeSize + (this.gridSize - 1) * this.spacing;
    this.offsetX = (this.W - totalW) / 2;
    this.offsetY = (this.H - totalH) / 2 + 20;

    for (let i = 0; i < 9; i++) {
      this.nodes.push({
        id: i,
        state: 'IDLE', // IDLE, UP, HIT
        type: 'NORMAL', // NORMAL, GOLDEN, BOMB
        timer: 0,
        maxTimer: 0,
        row: Math.floor(i / this.gridSize),
        col: i % this.gridSize,
        hitAnim: 0
      });
    }

    this.spawnTimer = 0;
    this.wave = 1;
    this.missionTimer = 60.0; // 60 seconds to survive/score
    
    this.setupInput();
  }

  setupInput() {
    this.input.onMouseDown = (e) => {
      if (this.isPaused || this.isOver) return;
      
      const mx = this.input.mouse.x;
      const my = this.input.mouse.y;
      
      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i];
        if (n.state !== 'UP') continue;
        
        const cx = this.offsetX + n.col * (this.nodeSize + this.spacing) + this.nodeSize / 2;
        const cy = this.offsetY + n.row * (this.nodeSize + this.spacing) + this.nodeSize / 2;
        
        // Circular hit detection
        const dist = Math.hypot(mx - cx, my - cy);
        if (dist <= this.nodeSize / 2) {
          this.hitNode(n);
          break; // Only hit one
        }
      }
    };
  }

  hitNode(n) {
    n.state = 'HIT';
    n.hitAnim = 1.0;
    
    if (n.type === 'NORMAL') {
      this.score += 100 * this.level;
      if (window.Sound) window.Sound.playTone(400, 'square', 0.05);
    } else if (n.type === 'GOLDEN') {
      this.score += 300 * this.level;
      this.missionTimer += 2.0; // +2 seconds
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.1);
    } else if (n.type === 'BOMB') {
      this.lives -= 1;
      this.score -= 50; // Penalty
      // Add screen shake effect
      if (window.Sound) window.Sound.playTone(100, 'sawtooth', 0.2);
      
      if (this.lives <= 0) {
        // Handled by update loop
      }
    }
  }

  spawnNode() {
    // Find idle nodes
    const idleNodes = this.nodes.filter(n => n.state === 'IDLE');
    if (idleNodes.length === 0) return;
    
    // Pick random node
    const n = idleNodes[Math.floor(Math.random() * idleNodes.length)];
    
    // Determine Type
    const rand = Math.random();
    if (rand < 0.15) {
      n.type = 'GOLDEN';
    } else if (rand < 0.30) {
      n.type = 'BOMB';
    } else {
      n.type = 'NORMAL';
    }
    
    n.state = 'UP';
    // Calculate lifetime based on wave/level
    const lifetime = Math.max(0.4, 1.2 * Math.pow(0.95, this.wave + this.level));
    n.timer = lifetime;
    n.maxTimer = lifetime;
    n.hitAnim = 0;
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    this.missionTimer -= delta;
    if (this.missionTimer <= 0) {
      this.missionTimer = 0;
      this.levelComplete();
      return;
    }

    // Spawning logic
    // Time between spawns decreases as wave goes up
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      // Spawn 1 to 3 nodes based on wave
      const spawnCount = Math.min(3, 1 + Math.floor(this.wave / 5));
      for (let i = 0; i < spawnCount; i++) {
        this.spawnNode();
      }
      
      this.wave++;
      this.spawnTimer = Math.max(0.3, 1.5 - (this.wave * 0.05));
    }

    // Update nodes
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      
      if (n.state === 'UP') {
        n.timer -= delta;
        if (n.timer <= 0) {
          n.state = 'IDLE';
          // Penalty if missed a normal or golden node
          if (n.type !== 'BOMB') {
            this.lives -= 1;
            if (window.Sound) window.Sound.playTone(150, 'square', 0.1);
            if (this.lives <= 0) return; // Die instantly
          }
        }
      } else if (n.state === 'HIT') {
        n.hitAnim -= delta * 4;
        if (n.hitAnim <= 0) {
          n.state = 'IDLE';
        }
      }
    }
  }

  render(ctx) {
    this.clear();
    
    // Draw Timer Bar
    ctx.fillStyle = '#111';
    ctx.fillRect(this.W / 2 - 200, 30, 400, 15);
    ctx.fillStyle = '#10b981';
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 10;
    ctx.fillRect(this.W / 2 - 200, 30, 400 * (this.missionTimer / 60.0), 15);
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#fff';
    ctx.font = '16px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(`SYSTEM INTEGRITY TIMER: ${this.missionTimer.toFixed(1)}s`, this.W / 2, 20);

    // Draw Grid Base (Holes)
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const cx = this.offsetX + n.col * (this.nodeSize + this.spacing) + this.nodeSize / 2;
      const cy = this.offsetY + n.row * (this.nodeSize + this.spacing) + this.nodeSize / 2;
      
      // Hole
      ctx.fillStyle = '#0a0a0a';
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, this.nodeSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Draw Nodes
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (n.state === 'IDLE') continue;
      
      const cx = this.offsetX + n.col * (this.nodeSize + this.spacing) + this.nodeSize / 2;
      const cy = this.offsetY + n.row * (this.nodeSize + this.spacing) + this.nodeSize / 2;
      
      let radius = this.nodeSize / 2 - 10;
      
      if (n.state === 'HIT') {
        // Expand and fade out
        radius += (1.0 - n.hitAnim) * 30;
        ctx.globalAlpha = Math.max(0, n.hitAnim);
      } else {
        // Popup animation based on timer
        const progress = 1.0 - (n.timer / n.maxTimer);
        // Slight pop-in scale
        if (progress < 0.1) radius *= (progress * 10);
      }
      
      let color = '#38bdf8'; // Normal (Blue)
      let symbol = '';
      if (n.type === 'GOLDEN') {
        color = '#facc15'; // Yellow
        symbol = '+';
      } else if (n.type === 'BOMB') {
        color = '#f43f5e'; // Red
        symbol = '!';
      }
      
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = n.state === 'HIT' ? 30 : 15;
      
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0, radius), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      if (symbol && radius > 10) {
        ctx.fillStyle = '#111';
        ctx.font = `bold ${radius}px "JetBrains Mono"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, cx, cy);
      }
      
      ctx.globalAlpha = 1.0;
      
      // Draw timer ring for UP nodes
      if (n.state === 'UP') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        const endAngle = -Math.PI / 2 + (Math.PI * 2) * (n.timer / n.maxTimer);
        ctx.arc(cx, cy, this.nodeSize / 2 + 5, -Math.PI / 2, endAngle);
        ctx.stroke();
      }
    }
  }
}
