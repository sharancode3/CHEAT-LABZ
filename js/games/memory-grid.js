import { GameShell } from './game-shell.js';

export default class MemoryGrid extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas, config);
  }

  onStart() {
    this.mods = {
      speedMult: this.config.modifiers?.includes('2x_speed') ? 1.5 : 1,
      reverse: this.config.modifiers?.includes('reverse'),
      noUI: this.config.modifiers?.includes('no_ui'),
      suddenDeath: this.config.modifiers?.includes('sudden_death'),
      limitedVision: this.config.modifiers?.includes('limited_vision')
    };

    this.gridSize = 3;
    this.tiles = [];
    this.tileSize = 0;
    this.gridStartX = 0;
    this.gridStartY = 0;
    
    this.level = 1;
    this.sequence = [];
    this.playerStep = 0;
    
    this.state = 'SHOWING';
    this.showTimer = 0;
    this.showStep = 0;
    this.flashDuration = 500 / this.mods.speedMult;
    
    this.distractions = [];
    
    this.particles = [];
    this.floatingTexts = [];
    
    this.mouseX = -100;
    this.mouseY = -100;

    this.score = 0;
    this.updateScore(0);
    
    this.initGrid();
    this.generateSequence();

    this.mouseMoveHandler = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    };
    
    this.clickHandler = (e) => {
      if (this.state !== 'WAITING') return;
      
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const clickedTile = this.tiles.find(t => 
        x >= t.x && x <= t.x + this.tileSize &&
        y >= t.y && y <= t.y + this.tileSize
      );
      
      if (clickedTile) {
        this.handleTileClick(clickedTile);
      }
    };

    this.resizeHandler = () => {
      this.initGrid();
    };
    
    this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.addEventListener('mousedown', this.clickHandler);
    window.addEventListener('resize', this.resizeHandler);
  }

  onDestroy() {
    this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.removeEventListener('mousedown', this.clickHandler);
    window.removeEventListener('resize', this.resizeHandler);
  }

  initGrid() {
    this.tiles = [];
    const padding = 10;
    const maxGridWidth = Math.min(this.canvas.width, this.canvas.height) * 0.8;
    this.tileSize = (maxGridWidth / this.gridSize) - padding;
    
    this.gridStartX = (this.canvas.width - maxGridWidth) / 2 + padding/2;
    this.gridStartY = (this.canvas.height - maxGridWidth) / 2 + padding/2;
    
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        this.tiles.push({
          id: row * this.gridSize + col,
          row: row,
          col: col,
          x: this.gridStartX + col * (this.tileSize + padding),
          y: this.gridStartY + row * (this.tileSize + padding),
          state: 'idle',
          alpha: 0
        });
      }
    }
  }

  generateSequence() {
    this.state = 'SHOWING';
    this.showStep = 0;
    this.playerStep = 0;
    this.showTimer = 1000;
    
    if (this.level === 5 && this.gridSize === 3) {
      this.gridSize = 4;
      this.initGrid();
      this.createExplosion(this.canvas.width/2, this.canvas.height/2, '#8B5CF6', 50);
      this.floatingTexts.push({ x: this.canvas.width/2, y: this.canvas.height/2, text: 'GRID EXPANDED', color: '#8B5CF6', life: 1.5, vy: -1 });
    } else if (this.level === 10 && this.gridSize === 4) {
      this.gridSize = 5;
      this.initGrid();
      this.createExplosion(this.canvas.width/2, this.canvas.height/2, '#8B5CF6', 50);
      this.floatingTexts.push({ x: this.canvas.width/2, y: this.canvas.height/2, text: 'GRID EXPANDED', color: '#8B5CF6', life: 1.5, vy: -1 });
    }

    this.sequence.push(Math.floor(Math.random() * this.tiles.length));
    
    this.distractions = [];
    if (this.level > 3) {
      const numDistractions = Math.floor(this.level / 3);
      for(let i=0; i<numDistractions; i++) {
        this.distractions.push({
          step: Math.floor(Math.random() * this.sequence.length),
          tileId: Math.floor(Math.random() * this.tiles.length)
        });
      }
    }
  }

  handleTileClick(tile) {
    let targetIndex = this.playerStep;
    if (this.mods.reverse) {
      targetIndex = this.sequence.length - 1 - this.playerStep;
    }
    
    const targetTileId = this.sequence[targetIndex];
    
    if (tile.id === targetTileId) {
      tile.state = 'correct';
      tile.alpha = 1;
      this.createExplosion(tile.x + this.tileSize/2, tile.y + this.tileSize/2, '#06B6D4', 10);
      
      this.playerStep++;
      
      let pts = 10 * this.level;
      this.score += pts;
      this.updateScore(this.score);
      
      if (this.playerStep >= this.sequence.length) {
        this.state = 'SUCCESS';
        this.floatingTexts.push({ x: this.canvas.width/2, y: this.gridStartY - 20, text: 'SEQUENCE ACCEPTED', color: '#06B6D4', life: 1.0, vy: -1 });
        this.level++;
        
        setTimeout(() => {
          if(!this.isGameOver) this.generateSequence();
        }, 1000);
      }
      
    } else {
      tile.state = 'error';
      tile.alpha = 1;
      this.createExplosion(tile.x + this.tileSize/2, tile.y + this.tileSize/2, '#EF4444', 20);
      
      if (this.mods.suddenDeath) return this.gameOver();
      
      this.state = 'ERROR';
      this.floatingTexts.push({ x: this.canvas.width/2, y: this.gridStartY - 20, text: 'SEQUENCE REJECTED', color: '#EF4444', life: 1.0, vy: -1 });
      this.score = Math.max(0, this.score - 50);
      this.updateScore(this.score);
      
      setTimeout(() => {
        if(!this.isGameOver) {
          this.state = 'SHOWING';
          this.showStep = 0;
          this.playerStep = 0;
          this.showTimer = 500;
        }
      }, 1500);
    }
  }

  createExplosion(x, y, color, count=30) {
    for(let i=0; i<count; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        life: 1.0,
        color: color
      });
    }
  }

  update(dtMs) {
    const dtSec = dtMs / 1000;
    
    this.tiles.forEach(t => {
      if (t.alpha > 0) t.alpha -= dtSec * 2;
      if (t.alpha <= 0) {
        t.alpha = 0;
        t.state = 'idle';
      }
    });

    if (this.state === 'SHOWING') {
      this.showTimer -= dtMs;
      if (this.showTimer <= 0) {
        if (this.showStep < this.sequence.length) {
          const tileId = this.sequence[this.showStep];
          const t = this.tiles.find(t => t.id === tileId);
          if (t) {
            t.state = 'active';
            t.alpha = 1;
          }
          
          this.distractions.filter(d => d.step === this.showStep).forEach(d => {
             const dtile = this.tiles.find(t => t.id === d.tileId);
             if (dtile && dtile.id !== tileId) {
               dtile.state = 'glitch';
               dtile.alpha = 1;
             }
          });
          
          this.showStep++;
          this.showTimer = this.flashDuration * 1.5;
        } else {
          this.state = 'WAITING';
        }
      }
    }

    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dtSec * 2;
      return p.life > 0;
    });

    this.floatingTexts = this.floatingTexts.filter(ft => {
      ft.y += ft.vy;
      ft.life -= dtSec;
      return ft.life > 0;
    });
  }

  draw() {
    this.ctx.fillStyle = '#09090B';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.tiles.forEach(t => {
      let baseColor = 'rgba(255,255,255,0.05)';
      let glowColor = 'transparent';
      let strokeColor = 'rgba(255,255,255,0.1)';
      
      if (this.state === 'WAITING' && 
          this.mouseX >= t.x && this.mouseX <= t.x + this.tileSize &&
          this.mouseY >= t.y && this.mouseY <= t.y + this.tileSize) {
          baseColor = 'rgba(6,182,212,0.1)';
          strokeColor = '#06B6D4';
      }

      if (t.state === 'active') {
        baseColor = `rgba(251, 191, 36, ${t.alpha})`;
        glowColor = '#FBBF24';
        strokeColor = '#FBBF24';
      } else if (t.state === 'correct') {
        baseColor = `rgba(6, 182, 212, ${t.alpha})`;
        glowColor = '#06B6D4';
        strokeColor = '#06B6D4';
      } else if (t.state === 'error') {
        baseColor = `rgba(239, 68, 68, ${t.alpha})`;
        glowColor = '#EF4444';
        strokeColor = '#EF4444';
      } else if (t.state === 'glitch') {
        baseColor = `rgba(139, 92, 246, ${t.alpha})`;
        glowColor = '#8B5CF6';
        strokeColor = '#8B5CF6';
        if (Math.random() < 0.2) {
           t.x += (Math.random() - 0.5) * 10;
        }
      }

      this.ctx.fillStyle = baseColor;
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = 2;
      this.ctx.shadowBlur = t.alpha > 0 ? 20 * t.alpha : 0;
      this.ctx.shadowColor = glowColor;
      
      this.ctx.beginPath();
      this.ctx.roundRect(t.x, t.y, this.tileSize, this.tileSize, 8);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
      
      t.x = this.gridStartX + t.col * (this.tileSize + 10);
    });

    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.floatingTexts.forEach(ft => {
      this.ctx.fillStyle = ft.color;
      this.ctx.globalAlpha = Math.max(0, ft.life);
      this.ctx.font = "bold 16px 'Press Start 2P', monospace";
      this.ctx.fillText(ft.text, ft.x, ft.y);
    });
    this.ctx.globalAlpha = 1.0;

    if (this.mods.limitedVision) {
      this.ctx.globalCompositeOperation = 'destination-in';
      const gradient = this.ctx.createRadialGradient(this.mouseX, this.mouseY, 50, this.mouseX, this.mouseY, 150);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalCompositeOperation = 'source-over';
    }

    if (!this.mods.noUI) {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = "14px 'JetBrains Mono', monospace";
      this.ctx.textAlign = 'left';
      
      let stateText = this.state === 'SHOWING' ? 'MEMORIZE THE PATTERN' : (this.state === 'WAITING' ? 'REPLICATE PATTERN' : '');
      if (this.mods.reverse && this.state === 'WAITING') {
         this.ctx.fillStyle = '#EF4444';
         stateText = 'REPLICATE PATTERN IN REVERSE!';
      }
      
      this.ctx.fillText(`LEVEL ${this.level} | ${stateText}`, 20, 30);
      
      if (this.state === 'WAITING') {
        const dotSize = 10;
        const startX = this.canvas.width/2 - (this.sequence.length * dotSize * 2) / 2;
        for(let i=0; i<this.sequence.length; i++) {
          this.ctx.fillStyle = i < this.playerStep ? '#06B6D4' : 'rgba(255,255,255,0.2)';
          this.ctx.beginPath();
          this.ctx.arc(startX + i * dotSize * 2, 60, dotSize/2, 0, Math.PI*2);
          this.ctx.fill();
        }
      }
    }
  }
}
