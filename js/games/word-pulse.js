import { GameShell } from './game-shell.js';

export default class WordPulse extends GameShell {
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

    this.bpm = 120 * this.mods.speedMult;
    this.beatInterval = 60000 / this.bpm;
    this.beatTimer = 0;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    this.wordsDict = ["RHYTHM", "BEAT", "PULSE", "SYNTH", "BASS", "TEMPO", "DROP", "WAVE", "KICK", "SNARE", "VIBE", "NEON", "CYBER", "GRID"];
    
    this.activeWords = [];
    this.spawnTimer = 0;
    this.spawnInterval = this.beatInterval * 2;
    
    this.currentTyped = "";
    
    this.combo = 0;
    this.comboMultiplier = 1;
    this.particles = [];
    this.floatingTexts = [];
    
    this.score = 0;
    this.updateScore(0);
  }

  onDestroy() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }

  playMetronomeTick() {
    if (!this.audioContext || this.audioContext.state === 'suspended') return;
    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      
      osc.frequency.value = 800;
      osc.type = 'square';
      
      gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
      
      osc.start(this.audioContext.currentTime);
      osc.stop(this.audioContext.currentTime + 0.1);
    } catch (e) {}
  }

  spawnWord() {
    const text = this.wordsDict[Math.floor(Math.random() * this.wordsDict.length)];
    this.activeWords.push({
      text: this.mods.reverse ? text.split('').reverse().join('') : text,
      originalText: text,
      typedIdx: 0,
      x: this.canvas.width/2 + (Math.random() - 0.5) * (this.canvas.width - 200),
      y: 50,
      targetY: this.canvas.height - 150,
      speed: (this.canvas.height - 200) / (this.beatInterval * 4),
      lifeTime: 0,
      maxLife: this.beatInterval * 4
    });
  }

  onInput(key, e, isDown) {
    if (!isDown) return;
    
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    const pressed = key.toUpperCase();
    if (pressed.length !== 1 || !/[A-Z]/.test(pressed)) return;
    
    let matched = false;
    
    let targets = this.activeWords.filter(w => w.typedIdx > 0);
    if (targets.length === 0) {
      targets = this.activeWords;
    }
    
    for (let i = 0; i < targets.length; i++) {
      let w = targets[i];
      if (w.text[w.typedIdx] === pressed) {
        w.typedIdx++;
        matched = true;
        
        if (w.typedIdx === w.text.length) {
          this.handleWordComplete(w);
          this.activeWords.splice(this.activeWords.indexOf(w), 1);
        }
        break;
      }
    }
    
    if (!matched) {
      this.handleMiss();
    }
  }

  handleWordComplete(word) {
    const diff = Math.abs(word.lifeTime - word.maxLife);
    let judgment = 'MISS';
    let pts = 0;
    let color = '#EF4444';
    
    if (diff < 150) {
      judgment = 'PERFECT';
      pts = 100;
      color = '#06B6D4';
    } else if (diff < 300) {
      judgment = 'GOOD';
      pts = 50;
      color = '#10B981';
    } else {
      judgment = 'EARLY';
      pts = 10;
      color = '#FBBF24';
    }
    
    if (judgment === 'PERFECT' || judgment === 'GOOD') {
      this.combo++;
      if (this.combo > 10) this.comboMultiplier = 4;
      else if (this.combo > 5) this.comboMultiplier = 2;
    } else {
      this.combo = 0;
      this.comboMultiplier = 1;
    }
    
    this.score += pts * this.comboMultiplier;
    this.updateScore(this.score);
    
    this.createExplosion(word.x, word.y, color, 30);
    this.floatingTexts.push({ x: word.x, y: word.y, text: judgment, color: color, life: 1.0, vy: -2 });
  }

  handleMiss() {
    if (this.mods.suddenDeath) {
      this.createExplosion(this.canvas.width/2, this.canvas.height/2, '#EF4444', 100);
      this.draw();
      return this.gameOver();
    }
    this.combo = 0;
    this.comboMultiplier = 1;
    this.score = Math.max(0, this.score - 50);
    this.updateScore(this.score);
    
    this.floatingTexts.push({ x: this.canvas.width/2, y: this.canvas.height - 100, text: 'MISS', color: '#EF4444', life: 1.0, vy: 1 });
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
    
    this.beatTimer += dtMs;
    if (this.beatTimer >= this.beatInterval) {
      this.beatTimer -= this.beatInterval;
      this.playMetronomeTick();
      this.ctx.canvas.style.transform = 'scale(1.02)';
      setTimeout(() => this.ctx.canvas.style.transform = 'scale(1)', 50);
    }
    
    this.spawnTimer += dtMs;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer -= this.spawnInterval;
      this.spawnWord();
      if (this.spawnInterval > this.beatInterval) {
        this.spawnInterval -= 50;
      }
    }
    
    for (let i = this.activeWords.length - 1; i >= 0; i--) {
      let w = this.activeWords[i];
      w.lifeTime += dtMs;
      w.y += w.speed * dtMs;
      
      if (w.lifeTime > w.maxLife + 300) {
        this.handleMiss();
        this.createExplosion(w.x, w.y, '#EF4444', 20);
        this.activeWords.splice(i, 1);
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

    this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 10]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height - 150);
    this.ctx.lineTo(this.canvas.width, this.canvas.height - 150);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    
    const beatPulse = 1 - (this.beatTimer / this.beatInterval);
    this.ctx.fillStyle = `rgba(139, 92, 246, ${beatPulse * 0.3})`;
    this.ctx.fillRect(0, this.canvas.height - 160, this.canvas.width, 20);

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    this.activeWords.forEach(w => {
      let ringRadius = 100 * (1 - (w.lifeTime / w.maxLife));
      if (ringRadius < 0) ringRadius = 0;
      
      this.ctx.strokeStyle = ringRadius < 15 ? '#06B6D4' : '#8B5CF6';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(w.x, w.y, ringRadius + 20, 0, Math.PI*2);
      this.ctx.stroke();
      
      this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      this.ctx.beginPath();
      this.ctx.arc(w.x, w.y, 20, 0, Math.PI*2);
      this.ctx.stroke();

      this.ctx.font = "bold 20px 'Inter', sans-serif";
      
      const typed = w.text.substring(0, w.typedIdx);
      const untyped = w.text.substring(w.typedIdx);
      
      const typedWidth = this.ctx.measureText(typed).width;
      const untypedWidth = this.ctx.measureText(untyped).width;
      const totalWidth = typedWidth + untypedWidth;
      
      let startX = w.x - totalWidth/2;
      
      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = '#06B6D4';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = '#06B6D4';
      this.ctx.fillText(typed, startX, w.y);
      
      this.ctx.fillStyle = '#fff';
      this.ctx.shadowBlur = 0;
      this.ctx.fillText(untyped, startX + typedWidth, w.y);
    });

    this.ctx.textAlign = 'center';
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    this.floatingTexts.forEach(ft => {
      this.ctx.fillStyle = ft.color;
      this.ctx.globalAlpha = Math.max(0, ft.life);
      this.ctx.font = "bold 16px 'Press Start 2P', monospace";
      this.ctx.fillText(ft.text, ft.x, ft.y);
    });
    this.ctx.globalAlpha = 1.0;

    if (this.mods.limitedVision) {
      this.ctx.globalCompositeOperation = 'destination-in';
      const gradient = this.ctx.createRadialGradient(this.canvas.width/2, this.canvas.height - 150, 50, this.canvas.width/2, this.canvas.height - 150, 400);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalCompositeOperation = 'source-over';
    }

    if (!this.mods.noUI) {
      if (this.combo > 0) {
        this.ctx.fillStyle = '#06B6D4';
        this.ctx.font = "bold 24px 'JetBrains Mono', monospace";
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#06B6D4';
        this.ctx.fillText(`${this.combo} STREAK (${this.comboMultiplier}x)`, this.canvas.width/2, 50);
        this.ctx.shadowBlur = 0;
      }
    }
  }
}
