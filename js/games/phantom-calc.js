import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

export default class PhantomCalc extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas || 'game-canvas', { ...config, 
      name: 'phantom-calc',
      description: 'Find the missing number in the equation. Click the correct bubble.',
      width: 600,
      height: 500
    });

    this.scoreEl = document.getElementById('game-score');
    this.livesEl = document.getElementById('game-lives');
    this.levelEl = document.getElementById('game-level');

    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseClick(e));

    this.init();
  }

  onStart() {
    this.lives = 3;
    this.level = 1;
    this.correctAnswers = 0;
    
    this.timer = 0;
    this.maxTime = 10000;
    
    this.equation = "";
    this.answer = 0;
    
    this.bubbles = [];
    this.particles = [];
    
    this.generateEquation();
    this.updateUI();
    
    let runs = Storage.get('phantom-calc_runs', 0);
    Storage.set('phantom-calc_runs', runs + 1);
  }

  generateEquation() {
    let a, b, ans;
    let opStr = "";
    
    // Difficulty logic
    if (this.level <= 5) {
      // Add / Sub 1-20
      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 20) + 1;
      if (Math.random() > 0.5) {
        opStr = "+";
        ans = a + b;
      } else {
        opStr = "-";
        // prevent negative for early levels
        if (a < b) { let temp = a; a = b; b = temp; }
        ans = a - b;
      }
    } else if (this.level <= 10) {
      // Mult 1-10
      a = Math.floor(Math.random() * 10) + 1;
      b = Math.floor(Math.random() * 10) + 1;
      opStr = "x";
      ans = a * b;
    } else {
      // Mixed, larger
      const r = Math.random();
      if (r < 0.33) {
        a = Math.floor(Math.random() * 50) + 10;
        b = Math.floor(Math.random() * 50) + 10;
        opStr = "+";
        ans = a + b;
      } else if (r < 0.66) {
        a = Math.floor(Math.random() * 50) + 10;
        b = Math.floor(Math.random() * 50) + 10;
        opStr = "-";
        if (a < b) { let temp = a; a = b; b = temp; }
        ans = a - b;
      } else {
        a = Math.floor(Math.random() * 15) + 2;
        b = Math.floor(Math.random() * 10) + 2;
        opStr = "x";
        ans = a * b;
      }
    }

    // Hide one of the components randomly
    const hideMode = Math.floor(Math.random() * 3); // 0=a, 1=b, 2=ans
    if (hideMode === 0) {
      this.equation = \`? \${opStr} \${b} = \${ans}\`;
      this.answer = a;
    } else if (hideMode === 1) {
      this.equation = \`\${a} \${opStr} ? = \${ans}\`;
      this.answer = b;
    } else {
      this.equation = \`\${a} \${opStr} \${b} = ?\`;
      this.answer = ans;
    }

    this.timer = this.maxTime;
    this.spawnBubbles();
  }

  spawnBubbles() {
    this.bubbles = [];
    const numBubbles = 4 + Math.floor(this.level / 3); // 4 to ~8 bubbles
    
    // Add correct answer
    this.bubbles.push(this.createBubble(this.answer));
    
    // Add wrong answers close to correct answer
    while (this.bubbles.length < numBubbles) {
      // Offset by -10 to +10, but not 0
      let offset = Math.floor(Math.random() * 20) - 10;
      if (offset === 0) offset = 1;
      
      let wrongAns = this.answer + offset;
      if (wrongAns < 0) wrongAns = Math.abs(wrongAns) + 1;
      
      // Ensure unique
      if (!this.bubbles.find(b => b.val === wrongAns)) {
        this.bubbles.push(this.createBubble(wrongAns));
      }
    }
  }

  createBubble(val) {
    const r = 25 + Math.random() * 15;
    return {
      val: val,
      x: r + Math.random() * (this.canvas.width - r*2),
      y: this.canvas.height + r + Math.random() * 200, // spawn below
      r: r,
      vy: -30 - Math.random() * 40 - (this.level * 2), // speed scales up
      wobbleOffset: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.5 + Math.random()
    };
  }

  handleMouseClick(e) {
    if (this.state !== 'PLAYING') return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check hit reverse (top bubbles first)
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      const dx = x - b.x;
      const dy = y - b.y;
      if (Math.sqrt(dx*dx + dy*dy) <= b.r) {
        // Hit
        this.popBubble(b, i);
        return; // Only hit one
      }
    }
  }

  popBubble(b, index) {
    this.createExplosion(b.x, b.y);
    this.bubbles.splice(index, 1);
    
    if (b.val === this.answer) {
      // Correct!
      Sound.playCoin();
      this.score += 100;
      this.correctAnswers++;
      if (this.correctAnswers % 3 === 0) this.level++;
      
      this.updateUI();
      this.generateEquation();
    } else {
      // Wrong!
      this.loseLife();
    }
  }

  loseLife() {
    Sound.playDamage();
    this.lives--;
    this.updateUI();
    
    // Screen shake
    this.canvas.classList.add('shake');
    setTimeout(() => this.canvas.classList.remove('shake'), 200);

    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.generateEquation();
    }
  }

  createExplosion(x, y) {
    for(let i=0; i<15; i++) {
      this.particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 150,
        vy: (Math.random() - 0.5) * 150,
        life: 200 + Math.random() * 200,
        maxLife: 400
      });
    }
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    
    this.timer -= deltaTime;
    if (this.timer <= 0) {
      this.loseLife();
    }

    const timeSec = performance.now() / 1000;

    for (let b of this.bubbles) {
      b.y += b.vy * dt;
      // Wobble
      b.x += Math.sin(timeSec * b.wobbleSpeed + b.wobbleOffset) * 30 * dt;
      
      // If correct bubble goes off top, wrap to bottom so it's not impossible
      if (b.val === this.answer && b.y < -b.r) {
        b.y = this.canvas.height + b.r;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= deltaTime;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  updateUI() {
    if (this.scoreEl) this.scoreEl.innerText = this.score;
    if (this.livesEl) this.livesEl.innerText = '♥'.repeat(this.lives);
    if (this.levelEl) this.levelEl.innerText = this.level;
  }

  draw() {
    // Clear is handled by CSS mostly, but we clearRect
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Timer bar
    const ratio = Math.max(0, this.timer / this.maxTime);
    this.ctx.fillStyle = ratio > 0.25 ? '#6c63ff' : '#ff6b6b';
    this.ctx.fillRect(0, 0, this.canvas.width * ratio, 6);

    // Equation
    this.ctx.fillStyle = '#f0f0f8';
    this.ctx.font = '32px "Press Start 2P"';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Draw equation with drop shadow
    this.ctx.shadowColor = '#6c63ff';
    this.ctx.shadowBlur = 10;
    this.ctx.fillText(this.equation, this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.shadowBlur = 0; // reset

    // Bubbles
    for (let b of this.bubbles) {
      // Glow/border
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(0, 212, 170, 0.1)'; // var(--accent-2)
      this.ctx.fill();
      
      this.ctx.strokeStyle = 'rgba(0, 212, 170, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Highlight
      this.ctx.beginPath();
      this.ctx.arc(b.x - b.r*0.3, b.y - b.r*0.3, b.r*0.2, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.fill();

      // Text
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = \`\${b.r * 0.8}px "DM Sans"\`;
      this.ctx.fontWeight = '600';
      this.ctx.fillText(b.val, b.x, b.y + b.r * 0.1);
    }

    // Particles
    this.ctx.fillStyle = '#00d4aa';
    for (let p of this.particles) {
      this.ctx.globalAlpha = p.life / p.maxLife;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
});
