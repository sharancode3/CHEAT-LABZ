import { GameShell } from './game-shell.js';

export default class CipherQuest extends GameShell {
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

    this.words = ["SYSTEM", "HACKER", "CYBER", "NEON", "UPLOAD", "SERVER", "PROXY", "BREACH", "VIRUS", "ACCESS", "CIPHER", "KERNEL"];
    
    this.currentWord = "";
    this.encryptedWord = "";
    this.shift = 0;
    this.playerInput = "";
    this.hintUsed = false;
    
    this.timeLimit = 15000 / this.mods.speedMult;
    this.timeLeft = this.timeLimit;
    
    this.particles = [];
    this.floatingTexts = [];
    
    this.score = 0;
    this.updateScore(0);
    
    this.generateChallenge();
  }

  generateChallenge() {
    this.currentWord = this.words[Math.floor(Math.random() * this.words.length)];
    this.shift = Math.floor(Math.random() * 10) + 1;
    if (this.mods.reverse) this.shift = -this.shift;
    
    this.encryptedWord = this.currentWord.split('').map(char => {
      let code = char.charCodeAt(0) + this.shift;
      if (code > 90) code -= 26;
      if (code < 65) code += 26;
      return String.fromCharCode(code);
    }).join('');
    
    this.playerInput = "";
    this.hintUsed = false;
    
    let timeDecay = (this.score / 1000) * 500;
    this.timeLimit = Math.max(3000, 15000 - timeDecay) / this.mods.speedMult;
    this.timeLeft = this.timeLimit;
    
    this.createExplosion(this.canvas.width/2, this.canvas.height/2, '#8B5CF6', 20);
  }

  onInput(keyLabel, e, isDown) {
    if (!isDown) return;
    
    const key = e.key.toUpperCase();
    
    if (key === 'BACKSPACE') {
      this.playerInput = this.playerInput.slice(0, -1);
    } else if (key === 'ENTER') {
      this.checkAnswer();
    } else if (key === '?') {
      if (!this.hintUsed && this.score >= 50) {
        this.score -= 50;
        this.updateScore(this.score);
        this.hintUsed = true;
        this.floatingTexts.push({ x: this.canvas.width/2, y: this.canvas.height/2 + 100, text: '-50 RP (HINT)', color: '#EF4444', life: 1.0, vy: -1 });
      }
    } else if (key.length === 1 && /[A-Z]/.test(key)) {
      if (this.playerInput.length < this.currentWord.length) {
        this.playerInput += key;
      }
    }
  }

  checkAnswer() {
    if (this.playerInput === this.currentWord) {
      let timeBonus = Math.floor((this.timeLeft / this.timeLimit) * 100);
      let points = 100 + timeBonus;
      this.score += points;
      this.updateScore(this.score);
      
      this.createExplosion(this.canvas.width/2, this.canvas.height/2, '#06B6D4', 50);
      this.floatingTexts.push({ x: this.canvas.width/2, y: this.canvas.height/2, text: `DECRYPTED +${points}`, color: '#06B6D4', life: 1.0, vy: -2 });
      
      this.generateChallenge();
    } else {
      if (this.mods.suddenDeath) return this.gameOver();
      
      this.score = Math.max(0, this.score - 50);
      this.updateScore(this.score);
      
      this.createExplosion(this.canvas.width/2, this.canvas.height/2, '#EF4444', 30);
      this.floatingTexts.push({ x: this.canvas.width/2, y: this.canvas.height/2, text: 'ACCESS DENIED', color: '#EF4444', life: 1.0, vy: 1 });
      this.playerInput = "";
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
    this.timeLeft -= dtMs;
    if (this.timeLeft <= 0) {
      if (this.mods.suddenDeath) return this.gameOver();
      this.score = Math.max(0, this.score - 100);
      this.updateScore(this.score);
      this.generateChallenge();
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

    this.ctx.fillStyle = 'rgba(6, 182, 212, 0.05)';
    this.ctx.font = "14px 'JetBrains Mono', monospace";
    for(let i=0; i<20; i++) {
      this.ctx.fillText(Math.random().toString(36).substring(2, 10), Math.random() * this.canvas.width, Math.random() * this.canvas.height);
    }

    this.ctx.fillStyle = 'rgba(139,92,246,0.1)';
    this.ctx.strokeStyle = '#8B5CF6';
    this.ctx.lineWidth = 2;
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = '#8B5CF6';
    this.ctx.beginPath();
    this.ctx.roundRect(this.canvas.width/2 - 250, this.canvas.height/2 - 150, 500, 100, 12);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#fff';
    this.ctx.font = "bold 40px 'Press Start 2P', monospace";
    
    let displayEncrypted = this.encryptedWord;
    if (Math.random() < 0.1) {
       displayEncrypted = displayEncrypted.split('').map(c => Math.random() < 0.2 ? String.fromCharCode(Math.floor(Math.random() * 26) + 65) : c).join('');
    }
    this.ctx.fillText(displayEncrypted, this.canvas.width/2, this.canvas.height/2 - 100);
    this.ctx.shadowBlur = 0;

    this.ctx.font = "16px 'JetBrains Mono', monospace";
    if (this.hintUsed) {
      this.ctx.fillStyle = '#06B6D4';
      const shiftDir = this.shift > 0 ? '+' : '';
      this.ctx.fillText(`[ DECRYPTION KEY: ${shiftDir}${this.shift} ]`, this.canvas.width/2, this.canvas.height/2 - 20);
    } else {
      this.ctx.fillStyle = '#EF4444';
      this.ctx.fillText(`[ DECRYPTION KEY: ENCRYPTED. PRESS '?' FOR HINT (-50 RP) ]`, this.canvas.width/2, this.canvas.height/2 - 20);
    }

    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.strokeStyle = '#06B6D4';
    this.ctx.beginPath();
    this.ctx.roundRect(this.canvas.width/2 - 200, this.canvas.height/2 + 40, 400, 60, 8);
    this.ctx.fill();
    this.ctx.stroke();
    
    this.ctx.fillStyle = '#06B6D4';
    this.ctx.font = "bold 24px 'JetBrains Mono', monospace";
    this.ctx.fillText(this.playerInput + (Math.floor(performance.now() / 500) % 2 === 0 ? '_' : ''), this.canvas.width/2, this.canvas.height/2 + 70);

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
      const gradient = this.ctx.createRadialGradient(this.canvas.width/2, this.canvas.height/2, 50, this.canvas.width/2, this.canvas.height/2, 350);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalCompositeOperation = 'source-over';
    }

    if (!this.mods.noUI) {
      const timerRatio = this.timeLeft / this.timeLimit;
      this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
      this.ctx.fillRect(0, 0, this.canvas.width, 5);
      this.ctx.fillStyle = timerRatio > 0.3 ? '#06B6D4' : '#EF4444';
      this.ctx.fillRect(0, 0, this.canvas.width * timerRatio, 5);
      
      this.ctx.fillStyle = '#fff';
      this.ctx.font = "12px 'JetBrains Mono', monospace";
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`ENTER to Submit | BACKSPACE to Delete`, 20, 30);
    }
  }
}
