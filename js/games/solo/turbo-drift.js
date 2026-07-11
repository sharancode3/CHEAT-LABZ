import { GameBase } from '../../core/game-base.js';

class TurboDrift extends GameBase {
  static logicalWidth = 720;
  static logicalHeight = 720;

  init() {
    // Car initial position, heading, speed
    this.car = {
      x: 180,
      y: 200,
      heading: 0,
      speed: 0,
      driftVX: 0,
      driftVY: 0
    };

    // Constants
    this.ACCELERATION = 280;
    this.BRAKING = 350;
    this.MAX_SPEED = 260;
    this.MAX_REVERSE = 100;
    this.FRICTION = 0.94;
    this.MAX_STEER = 2.8;
    this.DRIFT_BUILD = 6.0;
    this.DRIFT_DECAY = 0.88;
    this.MAX_DRIFT = 140;
    this.DRIFT_THRESHOLD = 60;

    this.driftScore = 0;
    this.driftActive = false;

    this.popups = []; // { x, y, text, alpha, yOffset }
    this.tireMarks = []; // { x, y, alpha }
    this.dustParticles = []; // { x, y, vx, vy, size, alpha }
    
    this.offTrackTimer = 0;
    this.lapCount = 0;
    this.currentWaypoint = 0;
    this.totalTime = 0;
    this.lives = 3;

    this.trackWidth = 100;

    this.setupTrackLayout();
    this.renderTrackToOffscreen();
  }

  setupTrackLayout() {
    const lvl = this.level;
    this.targetLaps = lvl <= 2 ? 2 : lvl <= 5 ? 3 : lvl <= 8 ? 4 : 5;

    // Build waypoint list based on level design complexity
    if (lvl <= 2) {
      // Oval
      this.waypoints = [
        { x: 180, y: 180 },
        { x: 540, y: 180 },
        { x: 540, y: 540 },
        { x: 180, y: 540 }
      ];
      this.car.x = 180;
      this.car.y = 300;
      this.car.heading = Math.PI / 2; // pointing down
    } else if (lvl === 3 || lvl === 10) {
      // Figure-8 layout
      this.waypoints = [
        { x: 180, y: 180 },
        { x: 360, y: 360 },
        { x: 540, y: 540 },
        { x: 540, y: 180 },
        { x: 360, y: 360 },
        { x: 180, y: 540 }
      ];
      this.car.x = 180;
      this.car.y = 300;
      this.car.heading = Math.PI / 2;
    } else if (lvl === 4 || lvl === 9) {
      // S-curve layout
      this.waypoints = [
        { x: 120, y: 120 },
        { x: 360, y: 120 },
        { x: 360, y: 360 },
        { x: 600, y: 360 },
        { x: 600, y: 600 },
        { x: 120, y: 600 }
      ];
      this.car.x = 120;
      this.car.y = 240;
      this.car.heading = Math.PI / 2;
    } else {
      // Complex serpentine
      this.waypoints = [
        { x: 150, y: 150 },
        { x: 570, y: 150 },
        { x: 570, y: 360 },
        { x: 360, y: 360 },
        { x: 360, y: 570 },
        { x: 150, y: 570 }
      ];
      this.car.x = 150;
      this.car.y = 250;
      this.car.heading = Math.PI / 2;
    }

    // Boost pads (Level 4, 10)
    this.boostPads = [];
    if (lvl === 4 || lvl === 10) {
      this.boostPads.push({ x: 360, y: 240, w: 40, h: 20 });
    }

    // Moving obstacles (Level 5, 10)
    this.obstacles = [];
    if (lvl === 5 || lvl === 10) {
      this.obstacles.push({ x: 360, y: 360, dx: 120, minX: 200, maxX: 520, y: 360 });
    }
  }

  renderTrackToOffscreen() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 720;
    this.offscreenCanvas.height = 720;
    const ctx = this.offscreenCanvas.getContext('2d');

    // Clear background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, 720, 720);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 720; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 720); ctx.stroke();
    }
    for (let y = 0; y < 720; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(720, y); ctx.stroke();
    }

    // Outer track contour
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = this.trackWidth + 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);
    for (let i = 1; i < this.waypoints.length; i++) {
      ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Road surface
    ctx.strokeStyle = '#1a1a24';
    ctx.lineWidth = this.trackWidth;
    ctx.stroke();

    // Center dash lane line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 15]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  distToSegment(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  getDistanceToTrack(x, y) {
    let minD = Infinity;
    const p = { x, y };
    for (let i = 0; i < this.waypoints.length; i++) {
      const a = this.waypoints[i];
      const b = this.waypoints[(i + 1) % this.waypoints.length];
      const d = this.distToSegment(p, a, b);
      if (d < minD) minD = d;
    }
    return minD;
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    this.totalTime += delta;
    const dt = delta / 1000;
    const inp = this.input;

    // Check boundary off-track condition
    const distToTrack = this.getDistanceToTrack(this.car.x, this.car.y);
    const isOffTrack = distToTrack > this.trackWidth / 2;

    // Apply rain sliding modifier (Level 9 / 10)
    const isRain = this.level === 9 || this.level === 10;
    const frictionFactor = isRain ? Math.pow(0.985, dt * 60) : Math.pow(this.FRICTION, dt * 60);

    // Throttle / Brake
    if (inp.isHeldAny(['ArrowUp', 'w', 'W'])) {
      this.car.speed += this.ACCELERATION * dt;
    } else if (inp.isHeldAny(['ArrowDown', 's', 'S'])) {
      this.car.speed -= this.BRAKING * dt;
    } else {
      this.car.speed *= frictionFactor;
      if (Math.abs(this.car.speed) < 1.0) this.car.speed = 0;
    }

    const maxSpeedLimit = isOffTrack ? this.MAX_SPEED * 0.4 : this.MAX_SPEED;
    this.car.speed = this.clamp(this.car.speed, -this.MAX_REVERSE, maxSpeedLimit);

    // Steering
    let steerAmount = 0;
    if (inp.isHeldAny(['ArrowLeft', 'a', 'A'])) steerAmount = -1;
    if (inp.isHeldAny(['ArrowRight', 'd', 'D'])) steerAmount = 1;

    if (this.car.speed !== 0) {
      const steerStrength = Math.min(Math.abs(this.car.speed) / this.MAX_SPEED, 1.0);
      const steerDir = Math.sign(this.car.speed);
      this.car.heading += steerAmount * this.MAX_STEER * steerStrength * steerDir * dt;
    }

    // Drift vector calculations (Space bar held while turning)
    const isDrifting = inp.isHeld(' ') && Math.abs(steerAmount) > 0 && Math.abs(this.car.speed) > 100;
    const driftBuildFactor = isRain ? this.DRIFT_BUILD * 1.5 : this.DRIFT_BUILD; // drift easier in rain

    if (isDrifting) {
      this.car.driftVX += Math.sin(this.car.heading) * steerAmount * driftBuildFactor * dt * 25;
      this.car.driftVY -= Math.cos(this.car.heading) * steerAmount * driftBuildFactor * dt * 25;
      
      // Spawn tire marks
      this.tireMarks.push({ x: this.car.x, y: this.car.y, alpha: 0.6 });
    } else {
      this.car.driftVX *= Math.pow(this.DRIFT_DECAY, dt * 60);
      this.car.driftVY *= Math.pow(this.DRIFT_DECAY, dt * 60);
    }

    // Limit drift components
    const driftMag = Math.hypot(this.car.driftVX, this.car.driftVY);
    if (driftMag > this.MAX_DRIFT) {
      this.car.driftVX = (this.car.driftVX / driftMag) * this.MAX_DRIFT;
      this.car.driftVY = (this.car.driftVY / driftMag) * this.MAX_DRIFT;
    }

    // Off-track spawn particles and timers
    if (isOffTrack) {
      this.offTrackTimer += delta;
      if (Math.random() < 0.3) {
        this.dustParticles.push({
          x: this.car.x,
          y: this.car.y,
          vx: (Math.random() - 0.5) * 80,
          vy: (Math.random() - 0.5) * 80,
          size: this.rand(2, 6),
          alpha: 0.8
        });
      }
      if (this.offTrackTimer >= 4000) {
        this.respawnAtWaypoint();
      }
    } else {
      this.offTrackTimer = 0;
    }

    // Update position
    const velocityX = Math.cos(this.car.heading) * this.car.speed + this.car.driftVX;
    const velocityY = Math.sin(this.car.heading) * this.car.speed + this.car.driftVY;
    this.car.x += velocityX * dt;
    this.car.y += velocityY * dt;

    // Drift scoring
    if (driftMag > this.DRIFT_THRESHOLD) {
      this.driftScore += dt * 30 * this.level;
      this.driftActive = true;
    } else {
      if (this.driftActive && this.driftScore > 30) {
        this.score += Math.floor(this.driftScore);
        this.popups.push({
          x: this.car.x,
          y: this.car.y - 20,
          text: `+${Math.floor(this.driftScore)} DRIFT`,
          alpha: 1.0,
          yOffset: 0
        });
      }
      this.driftActive = false;
      this.driftScore = 0;
    }

    // Waypoint traversal checking
    const targetWP = this.waypoints[this.currentWaypoint];
    const distToWP = this.dist(this.car.x, this.car.y, targetWP.x, targetWP.y);
    if (distToWP < 60) {
      this.currentWaypoint = (this.currentWaypoint + 1) % this.waypoints.length;
      if (this.currentWaypoint === 0) {
        this.lapCount++;
        this.popups.push({
          x: this.car.x,
          y: this.car.y - 25,
          text: `LAP ${this.lapCount}/${this.targetLaps}`,
          alpha: 1.0,
          yOffset: 0
        });
        if (this.lapCount >= this.targetLaps) {
          this.levelComplete();
        }
      }
    }

    // Boost pad collisions
    this.boostPads.forEach(pad => {
      if (
        this.car.x > pad.x && this.car.x < pad.x + pad.w &&
        this.car.y > pad.y && this.car.y < pad.y + pad.h
      ) {
        this.car.speed = this.MAX_SPEED * 1.35; // boost kick
        this.popups.push({
          x: this.car.x,
          y: this.car.y - 20,
          text: "BOOST!",
          alpha: 1.0,
          yOffset: 0
        });
      }
    });

    // Moving obstacles update (Level 5 / 10)
    this.obstacles.forEach(obs => {
      obs.x += obs.dx * dt;
      if (obs.x <= obs.minX || obs.x >= obs.maxX) {
        obs.dx *= -1;
      }
      // check hit
      if (this.dist(this.car.x, this.car.y, obs.x, obs.y) < 25) {
        this.lives--;
        this.respawnAtWaypoint();
      }
    });

    // Update popup particles
    this.popups.forEach(p => {
      p.yOffset -= dt * 30;
      p.alpha = Math.max(0, p.alpha - dt * 0.8);
    });
    this.popups = this.popups.filter(p => p.alpha > 0);

    // Update tire marks
    this.tireMarks.forEach(t => {
      t.alpha = Math.max(0, t.alpha - dt * 0.4);
    });
    this.tireMarks = this.tireMarks.filter(t => t.alpha > 0);

    // Update dust
    this.dustParticles.forEach(d => {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.alpha = Math.max(0, d.alpha - dt * 1.5);
    });
    this.dustParticles = this.dustParticles.filter(d => d.alpha > 0);
  }

  respawnAtWaypoint() {
    this.car.speed = 0;
    this.car.driftVX = 0;
    this.car.driftVY = 0;
    this.offTrackTimer = 0;
    
    // Position at last passed waypoint
    const lastIdx = (this.currentWaypoint - 1 + this.waypoints.length) % this.waypoints.length;
    const wp = this.waypoints[lastIdx];
    this.car.x = wp.x;
    this.car.y = wp.y;
    
    // Face next waypoint
    const nextWP = this.waypoints[this.currentWaypoint];
    this.car.heading = Math.atan2(nextWP.y - wp.y, nextWP.x - wp.x);
  }

  render(ctx) {
    // 1. Draw track from offscreen buffer
    ctx.drawImage(this.offscreenCanvas, 0, 0);

    // 2. Draw tire marks
    this.tireMarks.forEach(t => {
      ctx.fillStyle = `rgba(0, 0, 0, ${t.alpha})`;
      ctx.fillRect(t.x - 3, t.y - 3, 6, 6);
    });

    // 3. Draw boost pads
    this.boostPads.forEach(pad => {
      ctx.fillStyle = '#ffd93d';
      ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pad.x, pad.y, pad.w, pad.h);
    });

    // 4. Draw dust particles
    this.dustParticles.forEach(d => {
      ctx.fillStyle = `rgba(180, 160, 130, ${d.alpha})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Draw waypoints (faint hints)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    this.waypoints.forEach((wp, idx) => {
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 16, 0, Math.PI * 2);
      ctx.stroke();
      
      // highlight active target waypoint
      if (idx === this.currentWaypoint) {
        ctx.strokeStyle = 'rgba(255, 217, 61, 0.4)';
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 22 + Math.sin(this.totalTime / 120) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // 6. Draw obstacles
    this.obstacles.forEach(obs => {
      ctx.fillStyle = '#ff4757';
      ctx.beginPath();
      ctx.arc(obs.x, obs.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 7. Draw car (translate & rotate)
    ctx.save();
    ctx.translate(this.car.x, this.car.y);
    ctx.rotate(this.car.heading);

    // Tires
    ctx.fillStyle = '#111';
    ctx.fillRect(-12, -8, 6, 3);
    ctx.fillRect(6, -8, 6, 3);
    ctx.fillRect(-12, 5, 6, 3);
    ctx.fillRect(6, 5, 6, 3);

    // Car base body
    ctx.fillStyle = '#ffd93d';
    this.drawRoundedRect(ctx, -14, -6, 28, 12, 3);
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#1e272e';
    this.drawRoundedRect(ctx, -4, -4, 12, 8, 2);
    ctx.fill();

    ctx.restore();

    // 8. Rain visual overlays (Level 9 / 10)
    if (this.level === 9 || this.level === 10) {
      ctx.strokeStyle = 'rgba(174, 219, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const rx = (this.totalTime * 0.4 + i * 150) % 720;
        const ry = (this.totalTime * 0.6 + i * 200) % 720;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 8, ry + 16);
        ctx.stroke();
      }
    }

    // 9. Night Mode Headlight (Level 10)
    if (this.level === 10) {
      // Create offscreen dark overlay
      ctx.save();
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = 720;
      maskCanvas.height = 720;
      const mctx = maskCanvas.getContext('2d');
      mctx.fillStyle = 'rgba(5, 5, 8, 0.95)';
      mctx.fillRect(0, 0, 720, 720);

      // Car headlight light cone
      mctx.save();
      mctx.translate(this.car.x, this.car.y);
      mctx.rotate(this.car.heading);
      
      const grad = mctx.createRadialGradient(0, 0, 10, 80, 0, 240);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.3, 'rgba(255, 255, 240, 0.6)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
      mctx.fillStyle = grad;

      mctx.beginPath();
      mctx.moveTo(0, 0);
      mctx.arc(0, 0, 240, -Math.PI / 6, Math.PI / 6);
      mctx.closePath();
      mctx.fill();

      // Ambient circle around car
      const ambGrad = mctx.createRadialGradient(0, 0, 0, 0, 0, 80);
      ambGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      ambGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      mctx.fillStyle = ambGrad;
      mctx.beginPath();
      mctx.arc(0, 0, 80, 0, Math.PI * 2);
      mctx.fill();

      mctx.restore();

      // Apply overlay
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(maskCanvas, 0, 0);
      ctx.restore();
    }

    // 10. Draw Popup Text particles
    this.popups.forEach(p => {
      ctx.save();
      ctx.fillStyle = `rgba(255, 217, 61, ${p.alpha})`;
      ctx.font = "bold 14px 'DM Sans', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y + p.yOffset);
      ctx.restore();
    });
  }

  drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  destroy() {
    super.destroy();
    this.offscreenCanvas = null;
  }
}

window.GameClass = TurboDrift;
export default TurboDrift;
