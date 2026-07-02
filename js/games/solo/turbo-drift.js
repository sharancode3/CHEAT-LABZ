import { GameBase } from '../../core/game-base.js';

class TurboDrift extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    this.car = {
      x: 300, y: 480,
      heading: 0,
      speed: 0,
      maxSpeed: 250,
      rotSpeed: 3
    };

    // Tracks: 1-5 is oval, 6-10 is figure-8
    this.trackType = this.level >= 6 ? 'figure8' : 'oval';
    this.obstacles = [];
    this.checkpoints = [false, false, false]; // Quadrants crossed
    this.laps = 0;

    this.setupLevel();
  }

  setupLevel() {
    const lvl = this.level;
    // Obstacles density based on levels
    const obstacleCount = Math.min(6, lvl - 1);
    for (let i = 0; i < obstacleCount; i++) {
      this.obstacles.push({
        x: this.randomInt(150, 450),
        y: this.randomInt(150, 450),
        radius: 12,
        dx: (Math.random() > 0.5 ? 1 : -1) * 40 // Moving obstacles for high levels
      });
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    const dt = delta / 1000;
    const inp = this.input;

    // Heading rotation
    if (inp.isHeldAny(inp.ACTIONS.LEFT)) {
      this.car.heading -= this.car.rotSpeed * dt;
    }
    if (inp.isHeldAny(inp.ACTIONS.RIGHT)) {
      this.car.heading += this.car.rotSpeed * dt;
    }

    // Acceleration
    if (inp.isHeldAny(inp.ACTIONS.UP)) {
      this.car.speed = this.lerp(this.car.speed, this.car.maxSpeed, 2 * dt);
    } else if (inp.isHeldAny(inp.ACTIONS.DOWN)) {
      this.car.speed = this.lerp(this.car.speed, -this.car.maxSpeed / 2, 2 * dt);
    } else {
      this.car.speed = this.lerp(this.car.speed, 0, 3 * dt);
    }

    // Move Car
    this.car.x += Math.cos(this.car.heading) * this.car.speed * dt;
    this.car.y += Math.sin(this.car.heading) * this.car.speed * dt;

    // Check bounds
    this.car.x = this.clamp(this.car.x, 10, 590);
    this.car.y = this.clamp(this.car.y, 10, 590);

    // Update Moving Obstacles (Level 5+)
    this.obstacles.forEach(obs => {
      if (this.level >= 5) {
        obs.x += obs.dx * dt;
        if (obs.x < 100 || obs.x > 500) obs.dx *= -1;
      }

      // Check collision
      const dist = this.distance(this.car.x, this.car.y, obs.x, obs.y);
      if (dist < obs.radius + 15) {
        this.lives--;
        this.car.x = 300;
        this.car.y = 480;
        this.car.speed = 0;
      }
    });

    // Check track boundaries (simple distance to centerline approximation)
    const distToCenter = this.distance(this.car.x, this.car.y, 300, 300);
    if (this.trackType === 'oval') {
      if (distToCenter < 100 || distToCenter > 250) {
        this.car.speed *= 0.95; // Offtrack friction
      }
    } else {
      // Figure-8 check (two lobes)
      const dist1 = this.distance(this.car.x, this.car.y, 200, 300);
      const dist2 = this.distance(this.car.x, this.car.y, 400, 300);
      if ((dist1 < 60 && dist2 < 60) || (dist1 > 160 && dist2 > 160)) {
        this.car.speed *= 0.95;
      }
    }

    // Check Checkpoints (Quadrants)
    const angle = Math.atan2(this.car.y - 300, this.car.x - 300);
    if (angle > -Math.PI / 4 && angle < Math.PI / 4) this.checkpoints[0] = true;
    if (angle > Math.PI / 4 && angle < 3 * Math.PI / 4) this.checkpoints[1] = true;
    if (angle < -Math.PI / 4 && angle > -3 * Math.PI / 4) this.checkpoints[2] = true;

    // Lap Completion
    if (this.checkpoints[0] && this.checkpoints[1] && this.checkpoints[2]) {
      const startDist = this.distance(this.car.x, this.car.y, 300, 480);
      if (startDist < 40) {
        this.laps++;
        this.checkpoints = [false, false, false];
        this.score += 100;
      }
    }

    // Goal Check
    const goal = this.getLevelGoal();
    if (this.laps >= goal.target) {
      this.levelComplete();
    }
  }

  render() {
    this.clearCanvas();
    const ctx = this.ctx;

    // Draw Track Area
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 100;
    ctx.beginPath();
    if (this.trackType === 'oval') {
      ctx.arc(300, 300, 180, 0, Math.PI * 2);
    } else {
      // Figure 8 shape
      ctx.arc(200, 300, 100, 0, Math.PI * 2);
      ctx.arc(400, 300, 100, 0, Math.PI * 2);
    }
    ctx.stroke();

    // Start Line
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(295, 430, 10, 100);

    // Draw Obstacles
    ctx.fillStyle = '#ef4444';
    this.obstacles.forEach(obs => {
      ctx.beginPath();
      ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Car
    ctx.save();
    ctx.translate(this.car.x, this.car.y);
    ctx.rotate(this.car.heading);
    ctx.fillStyle = '#6c63ff';
    ctx.fillRect(-15, -8, 30, 16);
    // Headlights
    ctx.fillStyle = '#ffd93d';
    ctx.fillRect(12, -7, 3, 3);
    ctx.fillRect(12, 4, 3, 3);
    ctx.restore();
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    return [
      { label: 'Laps', value: `${this.laps}/${this.getLevelGoal().target}` },
      { label: 'Speed', value: Math.round(this.car.speed) }
    ];
  }

  getLevelGoal() {
    const goals = [
      null,
      { type: 'laps', target: 3 },
      { type: 'laps', target: 3 },
      { type: 'laps', target: 3 },
      { type: 'laps', target: 4 },
      { type: 'laps', target: 4 },
      { type: 'laps', target: 4 },
      { type: 'laps', target: 4 },
      { type: 'laps', target: 5 },
      { type: 'laps', target: 5 },
      { type: 'laps', target: 5 }
    ];
    return goals[this.level];
  }
}

window.GameClass = TurboDrift;
