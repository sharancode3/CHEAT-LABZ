import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

export default class TurboDrift extends GameBase {
  static get logicalWidth() { return 700; }
  static get logicalHeight() { return 700; }
  
  constructor(canvas, container) {
    super(canvas, container);

    this.keys = { up: false, down: false, left: false, right: false, space: false };
    
    // Track center shape
    this.track = {
      cx: 350, cy: 350,
      outerR: 280, innerR: 160
    };
    
    // Generate polyline waypoints along the track circle center path
    const numWaypoints = 24;
    this.waypoints = [];
    const radius = (this.track.outerR + this.track.innerR) / 2; // 220px
    for (let i = 0; i < numWaypoints; i++) {
      const angle = (i / numWaypoints) * Math.PI * 2;
      this.waypoints.push({
        x: 350 + radius * Math.cos(angle),
        y: 350 + radius * Math.sin(angle)
      });
    }
    this.trackWidth = 115; // Width bounding corridor

    // Boost pads [angle positions]
    this.boosts = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    this.boostTimer = 0;
    this.boostStretchTimer = 0;
    this.lapFlashTimer = 0;
    
    // Drift score
    this.driftScore = 0;
    this.accumulatedDriftPoints = 0;
    this.isDrifting = false;
    this.tireMarks = [];
    
    // Off-track timers
    this.offTrackTimer = 0;
    this.floatingTexts = [];
  }

  init() {
    this.car = {
      x: 350, y: 570, // bottom center start
      heading: 0, // pointing right
      speed: 0,
      maxSpeed: 280,
      driftAngle: 0
    };
    
    this.laps = 0;
    this.maxLaps = 3;
    this.startTime = performance.now();
    this.elapsedTime = 0;
    this.checkpoints = [false, false, false]; // Right, Bottom, Left quadrants
    
    this.driftScore = 0;
    this.accumulatedDriftPoints = 0;
    this.isDrifting = false;
    this.tireMarks = [];
    this.floatingTexts = [];
    this.boostTimer = 0;
    this.boostStretchTimer = 0;
    this.lapFlashTimer = 0;
    this.offTrackTimer = 0;

    let runs = Storage.get('turbo-drift_runs', 0);
    Storage.set('turbo-drift_runs', runs + 1);
  }

  onInput(key, event) {
    const k = key.toLowerCase();
    if (k === 'arrowup' || k === 'w') this.keys.up = true;
    if (k === 'arrowdown' || k === 's') this.keys.down = true;
    if (k === 'arrowleft' || k === 'a') this.keys.left = true;
    if (k === 'arrowright' || k === 'd') this.keys.right = true;
    if (k === ' ') this.keys.space = true;
  }

  onKeyUp(key, event) {
    const k = key.toLowerCase();
    if (k === 'arrowup' || k === 'w') this.keys.up = false;
    if (k === 'arrowdown' || k === 's') this.keys.down = false;
    if (k === 'arrowleft' || k === 'a') this.keys.left = false;
    if (k === 'arrowright' || k === 'd') this.keys.right = false;
    if (k === ' ') this.keys.space = false;
  }

  distToSegment(p, v, w) {
    const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    this.elapsedTime = performance.now() - this.startTime;

    // Juice timers
    if (this.boostTimer > 0) this.boostTimer -= deltaTime;
    if (this.boostStretchTimer > 0) this.boostStretchTimer -= deltaTime;
    if (this.lapFlashTimer > 0) this.lapFlashTimer -= deltaTime;

    // Update floating score indicators
    this.floatingTexts = this.floatingTexts.filter(t => {
      t.life -= deltaTime;
      t.y -= dt * 25; // float up
      return t.life > 0;
    });

    // 1. Throttle / Brake
    const accelRate = 220;
    const brakeRate = 260;
    const maxReverse = -90;
    let currentMaxSpeed = this.car.maxSpeed;

    if (this.boostTimer > 0) {
      currentMaxSpeed = 430;
      this.car.speed += accelRate * 1.5 * dt;
    } else if (this.keys.up) {
      this.car.speed += accelRate * dt;
    } else if (this.keys.down) {
      this.car.speed -= brakeRate * dt;
    }

    // 2. Friction
    const friction = 0.65; // speed decays
    this.car.speed *= 1 - (friction * dt);
    if (Math.abs(this.car.speed) < 3.0) this.car.speed = 0;
    this.car.speed = Math.max(maxReverse, Math.min(currentMaxSpeed, this.car.speed));

    // 3. Steering Angle
    if (Math.abs(this.car.speed) > 15) {
      let steerInput = 0;
      if (this.keys.left) steerInput = -1;
      if (this.keys.right) steerInput = 1;

      // Invert steering when reversing
      if (this.car.speed < 0) steerInput *= -1;

      const steerStrength = Math.min(1.0, Math.abs(this.car.speed) / this.car.maxSpeed);
      const maxSteerAngle = 2.4; // rads per sec
      const headingChange = steerInput * maxSteerAngle * steerStrength * dt;
      this.car.heading += headingChange;
    }

    // 4. Slide/Drift Angle calculations
    let steerInputForDrift = 0;
    if (this.keys.left) steerInputForDrift = -1;
    if (this.keys.right) steerInputForDrift = 1;

    if (this.keys.space && Math.abs(this.car.speed) > 90 && steerInputForDrift !== 0) {
      this.isDrifting = true;
      const driftBuildRate = 1.6;
      const maxDrift = 0.65; // Max slip angle offset in radians
      this.car.driftAngle += steerInputForDrift * driftBuildRate * dt;
      this.car.driftAngle = Math.max(-maxDrift, Math.min(maxDrift, this.car.driftAngle));
      
      // Squeal sound
      if (Math.random() > 0.85) this.container.audio.play('blip');

      // Accumulate drift combo
      this.accumulatedDriftPoints += Math.floor(deltaTime * 0.12);

      // Add gray tire trail nodes
      this.tireMarks.push({
        x: this.car.x,
        y: this.car.y,
        alpha: 0.95
      });
    } else {
      this.isDrifting = false;
      const driftRecovery = 4.2;
      this.car.driftAngle *= 1 - (driftRecovery * dt);

      // Trigger perfect drift exit bonus popup
      if (this.accumulatedDriftPoints > 35) {
        this.driftScore += this.accumulatedDriftPoints;
        this.floatingTexts.push({
          x: this.car.x,
          y: this.car.y - 15,
          text: `DRIFT BONUS +${this.accumulatedDriftPoints}`,
          life: 900,
          maxLife: 900
        });
        this.container.audio.play('perfect');
      }
      this.accumulatedDriftPoints = 0;
    }

    // 5. Calculate position vectors using heading + drift offset
    const moveAngle = this.car.heading + this.car.driftAngle;
    this.car.x += Math.cos(moveAngle) * this.car.speed * dt;
    this.car.y += Math.sin(moveAngle) * this.car.speed * dt;

    // 6. Track Bounding corridor validation via polylines
    let minDist = Infinity;
    let nearestSegmentIdx = 0;
    for (let i = 0; i < this.waypoints.length; i++) {
      const w1 = this.waypoints[i];
      const w2 = this.waypoints[(i + 1) % this.waypoints.length];
      const d = this.distToSegment(this.car, w1, w2);
      if (d < minDist) {
        minDist = d;
        nearestSegmentIdx = i;
      }
    }

    if (minDist > this.trackWidth / 2) {
      this.offTrackTimer += deltaTime;
      this.car.speed *= 0.65; // 60% speed penalty (35% decay step)
      if (this.offTrackTimer >= 3000) {
        // Teleport to nearest waypoint track center
        const nearestW = this.waypoints[nearestSegmentIdx];
        this.car.x = nearestW.x;
        this.car.y = nearestW.y;
        this.car.speed = 0;
        this.offTrackTimer = 0;
        this.container.audio.play('damage');
      }
    } else {
      this.offTrackTimer = 0;
    }

    // 7. Boost Pad collision checking
    const dx = this.car.x - this.track.cx;
    const dy = this.car.y - this.track.cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const carAngle = Math.atan2(dy, dx);

    for (let b of this.boosts) {
      if (Math.abs(this.angleDiff(carAngle, b)) < 0.12 && dist > this.track.innerR && dist < this.track.outerR) {
        if (this.boostTimer <= 0) {
          this.boostTimer = 1800; // 1.8s boost duration
          this.boostStretchTimer = 150; // 150ms horizontal stretch
          this.container.audio.play('coin');
        }
      }
    }

    // 8. Checkpoints quadrants and Laps detection
    if (carAngle > -0.3 && carAngle < 0.3) this.checkpoints[0] = true; // Right
    if (carAngle > 1.2 && carAngle < 1.9) this.checkpoints[1] = true;  // Bottom
    if (carAngle > 2.8 || carAngle < -2.8) this.checkpoints[2] = true; // Left

    // Cross finish line at top quadrant (angle ~ -Math.PI / 2)
    if (carAngle > -1.9 && carAngle < -1.2) {
      if (this.checkpoints[0] && this.checkpoints[1] && this.checkpoints[2]) {
        this.laps++;
        this.container.audio.play('perfect');
        this.checkpoints = [false, false, false];
        this.lapFlashTimer = 1500; // Flash announcement
        
        if (this.laps >= this.maxLaps) {
          this.finishRace();
        }
      }
    }

    // Fade tire marks
    this.tireMarks.forEach(m => {
      m.alpha -= dt * 0.4;
    });
    this.tireMarks = this.tireMarks.filter(m => m.alpha > 0);
  }

  angleDiff(a, b) {
    let diff = a - b;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return diff;
  }

  finishRace() {
    const timeScore = Math.max(0, 10000 - Math.floor(this.elapsedTime / 10));
    const totalScore = timeScore + this.driftScore;
    const coinsEarned = Math.floor(totalScore / 60);

    this.scoreBreakdown = {
      rows: [
        { label: 'Completion Time', value: `${(this.elapsedTime / 1000).toFixed(2)}s`, points: timeScore },
        { label: 'Drift Score', value: this.driftScore, points: this.driftScore }
      ],
      total: totalScore,
      coinsEarned: coinsEarned
    };

    this.score = totalScore;
    if (window.awardCoins && coinsEarned > 0) {
      window.awardCoins(coinsEarned, 'Turbo Drift Race');
    }

    this.container.audio.play('gameover');
    this.gameOver();
  }

  render(ctx) {
    // Determine screen stretch factor during boost
    let scaleX = 1.0;
    if (this.boostStretchTimer > 0) {
      const elapsed = 150 - this.boostStretchTimer;
      scaleX = 1.0 + 0.06 * Math.sin((elapsed / 150) * Math.PI);
    }

    // Draw main screen centered on car
    ctx.fillStyle = '#143d14'; // grass background
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.scale(scaleX, 1.0);
    // Camera translations tracking car
    ctx.translate(this.width / 2 - this.car.x, this.height / 2 - this.car.y);

    // Draw circular asphalt track
    ctx.beginPath();
    ctx.arc(this.track.cx, this.track.cy, this.track.outerR, 0, Math.PI*2);
    ctx.arc(this.track.cx, this.track.cy, this.track.innerR, 0, Math.PI*2, true);
    ctx.fillStyle = '#22222e';
    ctx.fill();

    // Center dash lines
    ctx.beginPath();
    ctx.arc(this.track.cx, this.track.cy, 220, 0, Math.PI*2);
    ctx.strokeStyle = '#44445c';
    ctx.setLineDash([15, 15]);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Yellow Boost Pads
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#ffd93d';
    for (let b of this.boosts) {
      ctx.beginPath();
      ctx.arc(this.track.cx, this.track.cy, 220, b - 0.08, b + 0.08);
      ctx.stroke();
    }

    // White Finish Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(this.track.cx, this.track.cy, 220, -Math.PI / 2 - 0.03, -Math.PI / 2 + 0.03);
    ctx.stroke();

    // Draw tire mark lines
    ctx.lineWidth = 3;
    for (let i = 1; i < this.tireMarks.length; i++) {
      const m1 = this.tireMarks[i - 1];
      const m2 = this.tireMarks[i];
      // only connect close marks
      if (Math.hypot(m1.x - m2.x, m1.y - m2.y) < 15) {
        ctx.beginPath();
        ctx.moveTo(m1.x, m1.y);
        ctx.lineTo(m2.x, m2.y);
        ctx.strokeStyle = `rgba(12, 12, 16, ${m2.alpha * 0.45})`;
        ctx.stroke();
      }
    }

    // Draw Car
    ctx.save();
    ctx.translate(this.car.x, this.car.y);
    ctx.rotate(this.car.heading + this.car.driftAngle); // car visual rotation

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-9 + 3, -6 + 3, 18, 12);

    // Car Body
    ctx.fillStyle = '#6c63ff'; // purple
    ctx.fillRect(-9, -6, 18, 12);
    ctx.fillStyle = '#00f0ff'; // cyan windshield
    ctx.fillRect(0, -4, 3, 8);
    ctx.fillStyle = '#ffffff'; // white headlights
    ctx.fillRect(7, -5, 2, 2);
    ctx.fillRect(7, 3, 2, 2);

    // Boost spark effects
    if (this.boostTimer > 0) {
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath();
      ctx.arc(-14, 0, 5 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Floating text points
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    this.floatingTexts.forEach(t => {
      const alpha = t.life / t.maxLife;
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.fillText(t.text, t.x, t.y);
    });

    ctx.restore();

    // UI HUD elements on top (un-translated)
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`TIME: ${(this.elapsedTime / 1000).toFixed(2)}s`, 20, 75);
    ctx.fillText(`LAP: ${Math.min(this.maxLaps, this.laps + 1)}/${this.maxLaps}`, 20, 95);
    ctx.fillText(`DRIFT SCORE: ${this.driftScore}`, 20, 115);

    // Off-track alert
    if (this.offTrackTimer > 0) {
      ctx.fillStyle = '#ff6b6b';
      ctx.font = "bold 11px 'Press Start 2P', monospace";
      ctx.fillText("OFF TRACK - SLOW DOWN!", 20, 140);
    }

    // Large Lap overlay flashes
    if (this.lapFlashTimer > 0) {
      const alpha = Math.min(1.0, this.lapFlashTimer / 300);
      ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
      ctx.font = "bold 20px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(`LAP ${this.laps} COMPLETE!`, this.width / 2, this.height / 2);
    }
  }

  getControls() {
    return [
      { key: '↑ W', action: 'Accelerate' },
      { key: '↓ S', action: 'Reverse' },
      { key: '← A / → D', action: 'Steer Car' },
      { key: 'SPACE + STEER', action: 'Slide Drift' }
    ];
  }

  getFunStat() {
    return `Completed in ${(this.elapsedTime / 1000).toFixed(2)} seconds with ${this.driftScore} drift points`;
  }

  getScoreBreakdown() {
    if (this.scoreBreakdown && this.scoreBreakdown.rows) {
      return this.scoreBreakdown.rows;
    }
    return [
      { label: 'Score Accumulation', value: this.score }
    ];
  }
}
window.GameState = {};
