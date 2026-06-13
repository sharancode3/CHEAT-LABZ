import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

class TurboDrift extends GameShell {
  constructor() {
    super('game-canvas', {
      name: 'turbo-drift',
      description: '3 laps. Drift for bonus points. Hit boost pads. Best time wins.',
      width: 700,
      height: 700
    });

    this.timeEl = document.getElementById('game-time');
    this.lapsEl = document.getElementById('game-laps');
    this.driftEl = document.getElementById('drift-score');
    this.collisionEl = document.getElementById('game-collision');

    // Minimap
    const mmCanvas = document.getElementById('minimap-canvas');
    this.mmCtx = mmCanvas.getContext('2d');

    this.keys = { up: false, down: false, left: false, right: false, space: false };
    
    // Track bounds (Outer and Inner rounded rectangles)
    this.track = {
      cx: 350, cy: 350,
      outerR: 280, innerR: 160
    };
    
    // Boost pads [angle in radians]
    this.boosts = [0, Math.PI, Math.PI/2];

    this.init();
  }

  onStart() {
    this.car = {
      x: 350, y: 550, // Start at bottom middle of track
      angle: 0, // pointing right
      speed: 0,
      maxSpeed: 300,
      driftAngle: 0
    };
    
    this.laps = 0;
    this.maxLaps = 3;
    this.startTime = performance.now();
    this.elapsedTime = 0;
    
    this.checkpoints = [false, false, false, false]; // quadrants
    
    this.driftScore = 0;
    this.driftTime = 0;
    this.isDrifting = false;
    this.tireMarks = [];
    
    this.boostTimer = 0;
    
    this.updateUI();
    
    let runs = Storage.get('turbo-drift_runs', 0);
    Storage.set('turbo-drift_runs', runs + 1);
  }

  onInput(key, event) {
    if (key === 'arrowup' || key === 'w') this.keys.up = true;
    if (key === 'arrowdown' || key === 's') this.keys.down = true;
    if (key === 'arrowleft' || key === 'a') this.keys.left = true;
    if (key === 'arrowright' || key === 'd') this.keys.right = true;
    if (key === ' ') this.keys.space = true;
  }

  onKeyUp(key, event) {
    if (key === 'arrowup' || key === 'w') this.keys.up = false;
    if (key === 'arrowdown' || key === 's') this.keys.down = false;
    if (key === 'arrowleft' || key === 'a') this.keys.left = false;
    if (key === 'arrowright' || key === 'd') this.keys.right = false;
    if (key === ' ') this.keys.space = false;
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    this.elapsedTime = performance.now() - this.startTime;

    // Physics
    let acceleration = 0;
    if (this.keys.up) acceleration = 200;
    if (this.keys.down) acceleration = -150;
    
    // Boost logic
    let currentMaxSpeed = this.car.maxSpeed;
    if (this.boostTimer > 0) {
      this.boostTimer -= deltaTime;
      currentMaxSpeed = 500;
      acceleration = 400; // force accel
    }

    // Apply accel/friction
    if (acceleration !== 0) {
      this.car.speed += acceleration * dt;
    } else {
      // friction
      if (this.car.speed > 0) this.car.speed = Math.max(0, this.car.speed - 100 * dt);
      if (this.car.speed < 0) this.car.speed = Math.min(0, this.car.speed + 100 * dt);
    }
    
    // Limit speed
    if (this.car.speed > currentMaxSpeed) this.car.speed = currentMaxSpeed;
    if (this.car.speed < -100) this.car.speed = -100;

    // Steering
    let turnSpeed = 2.5;
    if (this.keys.space) turnSpeed = 4.0; // handbrake turns faster
    
    // Only turn if moving
    if (Math.abs(this.car.speed) > 10) {
      let turnDir = 0;
      if (this.keys.left) turnDir = -1;
      if (this.keys.right) turnDir = 1;
      
      // Reverse turn direction if going backwards
      if (this.car.speed < 0) turnDir *= -1;
      
      this.car.angle += turnDir * turnSpeed * dt * (this.car.speed / currentMaxSpeed);
    }

    // Drift Logic
    let driftFactor = 0;
    if (this.keys.space && Math.abs(this.car.speed) > 100 && (this.keys.left || this.keys.right)) {
      this.isDrifting = true;
      this.driftTime += deltaTime;
      
      // Drift score multiplier
      if (this.driftTime > 500) { // 0.5s+
        this.driftScore += Math.floor(deltaTime * 0.1);
        this.driftEl.innerText = \`DRIFT: \${this.driftScore}\`;
      }
      
      driftFactor = 0.5; // Slide sideways
      
      // Add tire marks
      if (Math.random() > 0.3) {
        this.tireMarks.push({
          x: this.car.x, y: this.car.y,
          life: 1.0
        });
      }
    } else {
      this.isDrifting = false;
      this.driftTime = 0;
    }

    // Update position
    const moveAngle = this.car.angle + (this.isDrifting && this.keys.right ? driftFactor : (this.isDrifting && this.keys.left ? -driftFactor : 0));
    
    this.car.x += Math.cos(moveAngle) * this.car.speed * dt;
    this.car.y += Math.sin(moveAngle) * this.car.speed * dt;

    // Track Collision (Simple distance from center since it's a circular track for MVP)
    const dx = this.car.x - this.track.cx;
    const dy = this.car.y - this.track.cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist > this.track.outerR - 10 || dist < this.track.innerR + 10) {
      // Off track penalty
      this.car.speed *= 0.8; 
      this.collisionEl.classList.add('active');
      if (Math.random() > 0.8) Sound.playDamage(); // Rumble sound approx
    } else {
      this.collisionEl.classList.remove('active');
    }

    // Boost Pads
    const carAngleFromCenter = Math.atan2(dy, dx); // -PI to PI
    for (let b of this.boosts) {
      // If car is close to the angle of a boost pad
      if (Math.abs(this.angleDiff(carAngleFromCenter, b)) < 0.1 && dist > this.track.innerR && dist < this.track.outerR) {
        if (this.boostTimer <= 0) {
          this.boostTimer = 2000;
          Sound.playCoin(); // Boost sound
        }
      }
    }

    // Checkpoints & Laps
    if (carAngleFromCenter > -0.5 && carAngleFromCenter < 0.5) this.checkpoints[0] = true;
    if (carAngleFromCenter > 1.0 && carAngleFromCenter < 2.0) this.checkpoints[1] = true;
    if (carAngleFromCenter > 2.5 || carAngleFromCenter < -2.5) this.checkpoints[2] = true;
    
    // Cross finish line (bottom, angle ~ -PI/2)
    if (carAngleFromCenter > -2.0 && carAngleFromCenter < -1.0) {
      if (this.checkpoints[0] && this.checkpoints[1] && this.checkpoints[2]) {
        this.laps++;
        Sound.playBlip();
        this.checkpoints = [false, false, false, false];
        if (this.laps >= this.maxLaps) {
          this.finishRace();
        }
      }
    }

    // Update tire marks
    for (let i = this.tireMarks.length - 1; i >= 0; i--) {
      this.tireMarks[i].life -= dt * 0.5;
      if (this.tireMarks[i].life <= 0) this.tireMarks.splice(i, 1);
    }

    this.updateUI();
  }

  angleDiff(a, b) {
    let diff = a - b;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return diff;
  }

  finishRace() {
    // Score = 1000 - elapsed time + drift score
    const timeScore = Math.max(0, 10000 - Math.floor(this.elapsedTime / 10)); // Arbitrary scale
    this.score = timeScore + this.driftScore;
    Sound.playGameOver();
    this.gameOver();
  }

  updateUI() {
    if (this.timeEl) this.timeEl.innerText = (this.elapsedTime / 1000).toFixed(2);
    if (this.lapsEl && this.laps < this.maxLaps) this.lapsEl.innerText = \`LAP \${this.laps + 1}/\${this.maxLaps}\`;
  }

  draw() {
    // Canvas is #3b7c3b via CSS
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Track (Dark Gray Circle)
    this.ctx.beginPath();
    this.ctx.arc(this.track.cx, this.track.cy, this.track.outerR, 0, Math.PI*2);
    this.ctx.arc(this.track.cx, this.track.cy, this.track.innerR, 0, Math.PI*2, true);
    this.ctx.fillStyle = '#2a2a3a';
    this.ctx.fill();
    
    // Track lines
    this.ctx.beginPath();
    this.ctx.arc(this.track.cx, this.track.cy, (this.track.outerR + this.track.innerR)/2, 0, Math.PI*2);
    this.ctx.strokeStyle = '#555570';
    this.ctx.setLineDash([20, 20]);
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Draw Boost Pads
    this.ctx.lineWidth = 20;
    this.ctx.strokeStyle = '#ffd93d';
    for (let b of this.boosts) {
      this.ctx.beginPath();
      this.ctx.arc(this.track.cx, this.track.cy, (this.track.outerR + this.track.innerR)/2, b - 0.1, b + 0.1);
      this.ctx.stroke();
    }

    // Finish Line
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 10;
    this.ctx.beginPath();
    this.ctx.arc(this.track.cx, this.track.cy, (this.track.outerR + this.track.innerR)/2, -Math.PI/2 - 0.02, -Math.PI/2 + 0.02);
    this.ctx.stroke();

    // Tire marks
    for (let m of this.tireMarks) {
      this.ctx.beginPath();
      this.ctx.arc(m.x, m.y, 4, 0, Math.PI*2);
      this.ctx.fillStyle = \`rgba(20, 20, 20, \${m.life * 0.5})\`;
      this.ctx.fill();
    }

    // Car
    this.ctx.save();
    this.ctx.translate(this.car.x, this.car.y);
    this.ctx.rotate(this.car.angle);
    
    // Shadow
    this.ctx.fillStyle = 'rgba(0,0,0,0.4)';
    this.ctx.fillRect(-10 + 4, -6 + 4, 20, 12);
    
    // Body
    this.ctx.fillStyle = '#6c63ff'; // Accent 1
    this.ctx.fillRect(-10, -6, 20, 12);
    // Windshield
    this.ctx.fillStyle = '#00d4aa';
    this.ctx.fillRect(0, -4, 4, 8);
    // Headlights
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(8, -5, 2, 3);
    this.ctx.fillRect(8, 2, 2, 3);
    
    // Boost effect
    if (this.boostTimer > 0) {
      this.ctx.fillStyle = '#ff6b6b';
      this.ctx.beginPath();
      this.ctx.arc(-15, 0, 6 + Math.random()*4, 0, Math.PI*2);
      this.ctx.fill();
    }

    this.ctx.restore();

    this.drawMinimap();
  }

  drawMinimap() {
    const ctx = this.mmCtx;
    ctx.clearRect(0, 0, 120, 120);
    
    const scale = 120 / 700;
    
    // Track
    ctx.beginPath();
    ctx.arc(120/2, 120/2, this.track.outerR * scale, 0, Math.PI*2);
    ctx.arc(120/2, 120/2, this.track.innerR * scale, 0, Math.PI*2, true);
    ctx.fillStyle = '#2a2a3a';
    ctx.fill();

    // Car dot
    ctx.beginPath();
    ctx.arc(this.car.x * scale, this.car.y * scale, 3, 0, Math.PI*2);
    ctx.fillStyle = '#00d4aa';
    ctx.fill();
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
  new TurboDrift();
});
