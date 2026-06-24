import { GameShell } from './game-shell.js';

export default class BeatDrop extends GameShell {
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

    this.lanes = [
      { key: 'd', color: '#EF4444', x: this.canvas.width/2 - 150 },
      { key: 'f', color: '#3B82F6', x: this.canvas.width/2 - 50 },
      { key: 'j', color: '#10B981', x: this.canvas.width/2 + 50 },
      { key: 'k', color: '#FBBF24', x: this.canvas.width/2 + 150 }
    ];
    
    this.laneWidth = 100;
    this.targetY = this.mods.reverse ? 100 : this.canvas.height - 100;
    
    this.notes = [];
    
    this.scrollSpeed = 500 * this.mods.speedMult;
    
    this.spawnTimer = 0;
    this.spawnInterval = 400 / this.mods.speedMult;
    
    this.combo = 0;
    this.particles = [];
    this.floatingTexts = [];
    
    this.activeKeys = { d: false, f: false, j: false, k: false };
    
    this.score = 0;
    this.updateScore(0);
  }

  spawnNote() {
    const laneIdx = Math.floor(Math.random() * 4);
    if (Math.random() < 0.2) {
       let lane2 = (laneIdx + 1 + Math.floor(Math.random()*2)) % 4;
       this.notes.push({
         lane: lane2,
         y: this.mods.reverse ? this.canvas.height + 50 : -50,
         passed: false
       });
    }
    
    this.notes.push({
      lane: laneIdx,
      y: this.mods.reverse ? this.canvas.height + 50 : -50,
      passed: false
    });
  }

  onInput(key, e, isDown) {
    let mappedKey = key.toLowerCase();
    if (mappedKey === 'arrowleft') mappedKey = 'd';
    if (mappedKey === 'arrowdown') mappedKey = 'f';
    if (mappedKey === 'arrowup') mappedKey = 'j';
    if (mappedKey === 'arrowright') mappedKey = 'k';

    if (['d', 'f', 'j', 'k'].includes(mappedKey)) {
      if (isDown) {
        if (!this.activeKeys[mappedKey]) {
           this.activeKeys[mappedKey] = true;
           this.handleHit(mappedKey);
        }
      } else {
        this.activeKeys[mappedKey] = false;
      }
    }
  }

  handleHit(key) {
    const laneIdx = this.lanes.findIndex(l => l.key === key);
    if (laneIdx === -1) return;
    
    let targetNote = null;
    let targetNoteIdx = -1;
    
    for (let i = 0; i < this.notes.length; i++) {
      let n = this.notes[i];
      if (n.lane === laneIdx && !n.passed) {
        if (!targetNote || Math.abs(n.y - this.targetY) < Math.abs(targetNote.y - this.targetY)) {
           targetNote = n;
           targetNoteIdx = i;
        }
      }
    }
    
    if (targetNote) {
      const dist = Math.abs(targetNote.y - this.targetY);
      
      if (dist < 80) {
        let judgment = 'GOOD';
        let pts = 50;
        let color = '#10B981';
        
        if (dist < 30) {
          judgment = 'PERFECT';
          pts = 100;
          color = '#06B6D4';
        }
        
        this.combo++;
        let comboMult = 1 + Math.floor(this.combo / 10) * 0.5;
        this.score += Math.floor(pts * comboMult);
        this.updateScore(this.score);
        
        this.createExplosion(this.lanes[laneIdx].x, this.targetY, color, 20);
        this.floatingTexts.push({ x: this.lanes[laneIdx].x, y: this.targetY - 50, text: judgment, color: color, life: 1.0, vy: -2 });
        
        this.notes.splice(targetNoteIdx, 1);
      } else {
        if (dist < 120) {
           this.handleMiss(laneIdx);
           targetNote.passed = true;
        }
      }
    } else {
       this.combo = 0;
    }
  }

  handleMiss(laneIdx) {
    if (this.mods.suddenDeath) {
      this.createExplosion(this.canvas.width/2, this.canvas.height/2, '#EF4444', 100);
      this.draw();
      return this.gameOver();
    }
    
    this.combo = 0;
    this.score = Math.max(0, this.score - 50);
    this.updateScore(this.score);
    
    let x = laneIdx !== undefined ? this.lanes[laneIdx].x : this.canvas.width/2;
    this.createExplosion(x, this.targetY, '#EF4444', 15);
    this.floatingTexts.push({ x: x, y: this.targetY - 50, text: 'MISS', color: '#EF4444', life: 1.0, vy: 1 });
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
    
    this.spawnTimer -= dtMs;
    if (this.spawnTimer <= 0) {
      this.spawnNote();
      this.spawnInterval = Math.max(200, this.spawnInterval - 0.5);
      this.spawnTimer = this.spawnInterval;
    }
    
    for (let i = this.notes.length - 1; i >= 0; i--) {
      let n = this.notes[i];
      
      if (this.mods.reverse) {
        n.y -= this.scrollSpeed * dtSec;
        if (n.y < this.targetY - 60 && !n.passed) {
          n.passed = true;
          this.handleMiss(n.lane);
        }
        if (n.y < -50) this.notes.splice(i, 1);
      } else {
        n.y += this.scrollSpeed * dtSec;
        if (n.y > this.targetY + 60 && !n.passed) {
          n.passed = true;
          this.handleMiss(n.lane);
        }
        if (n.y > this.canvas.height + 50) this.notes.splice(i, 1);
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

    this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    this.ctx.lineWidth = 1;
    this.lanes.forEach(l => {
      this.ctx.fillStyle = this.activeKeys[l.key] ? 'rgba(255,255,255,0.1)' : 'transparent';
      this.ctx.fillRect(l.x - this.laneWidth/2, 0, this.laneWidth, this.canvas.height);
      
      this.ctx.beginPath();
      this.ctx.moveTo(l.x - this.laneWidth/2, 0); this.ctx.lineTo(l.x - this.laneWidth/2, this.canvas.height);
      this.ctx.moveTo(l.x + this.laneWidth/2, 0); this.ctx.lineTo(l.x + this.laneWidth/2, this.canvas.height);
      this.ctx.stroke();
      
      this.ctx.strokeStyle = this.activeKeys[l.key] ? l.color : 'rgba(255,255,255,0.5)';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.strokeRect(l.x - this.laneWidth/2 + 5, this.targetY - 20, this.laneWidth - 10, 40);
      
      if (!this.mods.noUI) {
        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
        this.ctx.font = "bold 20px 'JetBrains Mono', monospace";
        this.ctx.textAlign = 'center';
        this.ctx.fillText(l.key.toUpperCase(), l.x, this.mods.reverse ? this.targetY - 40 : this.targetY + 50);
      }
    });

    this.notes.forEach(n => {
      if (n.passed) return;
      const l = this.lanes[n.lane];
      
      this.ctx.fillStyle = l.color;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = l.color;
      
      this.ctx.beginPath();
      this.ctx.roundRect(l.x - this.laneWidth/2 + 10, n.y - 15, this.laneWidth - 20, 30, 8);
      this.ctx.fill();
      
      this.ctx.fillStyle = '#fff';
      this.ctx.shadowBlur = 0;
      this.ctx.fillRect(l.x - this.laneWidth/2 + 20, n.y - 2, this.laneWidth - 40, 4);
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
    this.floatingTexts.forEach(ft => {
      this.ctx.fillStyle = ft.color;
      this.ctx.globalAlpha = Math.max(0, ft.life);
      this.ctx.font = "bold 20px 'Press Start 2P', monospace";
      this.ctx.fillText(ft.text, ft.x, ft.y);
    });
    this.ctx.globalAlpha = 1.0;

    if (this.mods.limitedVision) {
      this.ctx.globalCompositeOperation = 'destination-in';
      const gradient = this.ctx.createLinearGradient(0, this.targetY - 200, 0, this.targetY + 200);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.5, 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalCompositeOperation = 'source-over';
    }

    if (!this.mods.noUI) {
      if (this.combo > 5) {
        this.ctx.fillStyle = '#06B6D4';
        this.ctx.font = "bold 32px 'JetBrains Mono', monospace";
        this.ctx.textAlign = 'center';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#06B6D4';
        this.ctx.fillText(`${this.combo} COMBO`, this.canvas.width/2, this.canvas.height/2);
        this.ctx.shadowBlur = 0;
      }
    }
  }
}
