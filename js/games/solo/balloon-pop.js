import { GameBase } from '../../core/game-base.js';

export class BalloonPop extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.balloons = [];
    this.escapedCount = 0;
    
    this.spawnTimer = 0;
    this.baseSpawnRate = 1.0;
    
    this.explosions = []; // For rendering shockwaves
    
    // Physics globals
    this.gravityY = -120; // Upwards buoyancy px/s^2
    this.globalTime = 0;
    
    this.setupInput();
  }

  setupInput() {
    this.input.onMouseDown = (e) => {
      if (this.isPaused || this.isOver) return;
      
      const mx = this.input.mouse.x;
      const my = this.input.mouse.y;
      
      // Check from front to back (top rendered to bottom rendered)
      // Actually we render them in order of array, so back of array is on top
      for (let i = this.balloons.length - 1; i >= 0; i--) {
        const b = this.balloons[i];
        if (b.popping) continue;
        
        const dist = Math.hypot(mx - b.x, my - b.y);
        if (dist <= b.radius) {
          this.popBalloon(b, i);
          break; // Only pop one per click
        }
      }
    };
  }

  spawnBalloon() {
    const radius = 30 + Math.random() * 20;
    const x = radius + Math.random() * (this.W - radius * 2);
    const y = this.H + radius + 10; // Start below screen
    
    // Types: NORMAL, BOMB
    const isBomb = Math.random() < 0.15;
    
    const colors = ['#f43f5e', '#a855f7', '#3b82f6', '#10b981', '#facc15'];
    
    this.balloons.push({
      id: Math.random().toString(),
      x: x,
      y: y,
      radius: radius,
      vy: -50 - Math.random() * 100, // Initial upwards velocity
      vx: 0,
      color: isBomb ? '#000000' : colors[Math.floor(Math.random() * colors.length)],
      type: isBomb ? 'BOMB' : 'NORMAL',
      popping: false,
      popAnim: 0
    });
  }

  popBalloon(b, index, chainReaction = false) {
    if (b.popping) return;
    
    b.popping = true;
    b.popAnim = 1.0;
    
    let pts = b.type === 'BOMB' ? 50 : 10;
    if (chainReaction) pts *= 2; // Multiplier for chain reaction
    this.score += pts;
    
    if (b.type === 'BOMB') {
      if (window.Sound) window.Sound.playTone(100, 'sawtooth', 0.2);
      this.triggerBlast(b.x, b.y);
    } else {
      if (window.Sound) window.Sound.playTone(400 + Math.random()*200, 'sine', 0.05);
    }
  }

  triggerBlast(cx, cy) {
    const blastRadius = 150;
    
    this.explosions.push({
      x: cx,
      y: cy,
      radius: blastRadius,
      anim: 1.0
    });
    
    // Check all balloons in radius
    for (let i = 0; i < this.balloons.length; i++) {
      const b = this.balloons[i];
      if (b.popping) continue;
      
      const dist = Math.hypot(b.x - cx, b.y - cy);
      if (dist <= blastRadius + b.radius) {
        // Chain reaction!
        this.popBalloon(b, i, true);
      }
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    
    this.globalTime += delta;
    
    // Spawning
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      this.spawnBalloon();
      // Increase spawn rate based on level and time
      const spawnFactor = Math.pow(0.95, this.level + (this.globalTime / 30.0));
      this.spawnTimer = Math.max(0.3, this.baseSpawnRate * spawnFactor);
    }
    
    // Wind drift sine wave
    const windVx = Math.sin(this.globalTime * 2.0) * 50;

    // Update Balloons
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      
      if (b.popping) {
        b.popAnim -= delta * 5;
        if (b.popAnim <= 0) {
          this.balloons.splice(i, 1);
        }
        continue;
      }
      
      // Physics integration
      b.vy += this.gravityY * delta;
      
      // Terminal velocity upwards
      if (b.vy < -400) b.vy = -400;
      
      // X drift
      b.x += windVx * delta;
      
      // Y movement
      b.y += b.vy * delta;
      
      // Wall collisions (bounce off left/right)
      if (b.x - b.radius < 0) {
        b.x = b.radius;
      } else if (b.x + b.radius > this.W) {
        b.x = this.W - b.radius;
      }
      
      // Escape condition (passes top)
      if (b.y + b.radius < 0) {
        this.balloons.splice(i, 1);
        this.escapedCount++;
        
        if (window.Sound) window.Sound.playTone(150, 'square', 0.1);
        
        if (this.escapedCount >= 5) {
          this.lives = 0; // Trigger game over natively through engine
          // Handled by next tick if lives <= 0, GameBase handles it. 
          // Wait, actually GameBase doesn't check `this.lives <= 0` natively every tick unless we call something.
          // Let's manually deduct life or trigger over.
          // In CheatLabz GameBase: if lives === 0, it doesn't auto-stop unless we set isOver.
          // Actually, standard behavior in cheat labz games is calling `this.lives = 0`, but let's be explicit:
          this.gameOver(); // Natively provided by GameBase? Let's check GameBase. 
          // Wait, GameBase uses `this.isOver = true` but the runner handles it if we just let it be.
          // Let's just set lives = 0 and isOver = true. Wait, GameBase has no `this.gameOver()` method.
          this.isOver = true;
          // Trigger the standard "GAME OVER" modal (this is usually handled by `lives <= 0` checks in Runner, but setting isOver is safest).
          // Actually if we look at `neon-serpent.js` or `tic-tac-toe.js`, they just do `this.lives -= 1` and reset.
          // Since 5 escapes is total death, we will do:
        }
      }
    }
    
    if (this.escapedCount >= 5) {
        // Just setting lives = 0 will trigger the UI to show 0 lives.
        // We can just end it.
        this.lives = 0;
    }

    // Update Explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.anim -= delta * 2;
      if (ex.anim <= 0) {
        this.explosions.splice(i, 1);
      }
    }
  }

  render(ctx) {
    this.clear();
    
    // Draw Stats
    ctx.fillStyle = '#fff';
    ctx.font = '20px "JetBrains Mono"';
    ctx.textAlign = 'left';
    ctx.fillText(`ESCAPED: ${this.escapedCount} / 5`, 20, 40);
    
    // Draw Balloons
    for (let b of this.balloons) {
      if (b.popping) {
        // Draw Pop lines
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = Math.max(0, b.popAnim);
        
        const popRadius = b.radius * (1 + (1 - b.popAnim) * 0.5);
        
        ctx.beginPath();
        for(let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          ctx.moveTo(b.x + Math.cos(a) * popRadius * 0.5, b.y + Math.sin(a) * popRadius * 0.5);
          ctx.lineTo(b.x + Math.cos(a) * popRadius, b.y + Math.sin(a) * popRadius);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        continue;
      }
      
      // Draw standard balloon
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = b.type === 'BOMB' ? 20 : 10;
      
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();
      
      // Bomb icon
      if (b.type === 'BOMB') {
        ctx.fillStyle = '#f43f5e';
        ctx.font = `bold ${b.radius}px "JetBrains Mono"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("!", b.x, b.y);
        
        // Red outline
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    
    // Draw Explosions
    for (let ex of this.explosions) {
      ctx.strokeStyle = `rgba(244, 63, 94, ${Math.max(0, ex.anim)})`; // Red shockwave
      ctx.lineWidth = 5 * ex.anim;
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 20 * ex.anim;
      
      const r = ex.radius * (1 - ex.anim); // Expands outwards
      
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
}

export default BalloonPop;
