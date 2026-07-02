import { GameBase } from '../../core/game-base.js';

class TileRunner extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    this.laneCount = this.level >= 8 ? 6 : 4;
    this.laneWidth = 600 / this.laneCount;
    this.keys = this.laneCount === 4 ? ['d', 'f', 'j', 'k'] : ['a', 's', 'd', 'j', 'k', 'l'];

    this.tiles = [];
    this.speed = 200 + this.level * 30; // scroll speed pixels/sec
    this.tapsCount = 0;

    this.tileHeight = 120;
    this.hitZoneY = 480;

    // Spawn initial tiles
    for (let i = 0; i < 6; i++) {
      this.spawnTile(500 - i * 150);
    }

    this.score = 0;
    this.lives = 3;
  }

  spawnTile(y) {
    const lane = this.randomInt(0, this.laneCount - 1);
    const isPower = (this.level >= 5 && Math.random() < 0.15); // Power tiles give double points
    this.tiles.push({
      lane,
      y,
      isPower,
      hit: false
    });
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    const dt = delta / 1000;

    // Move tiles
    this.tiles.forEach(t => {
      t.y += this.speed * dt;
    });

    // Check missed tiles that fall off screen
    this.tiles.forEach(t => {
      if (t.y > 600 && !t.hit) {
        t.hit = true;
        this.lives--;
      }
    });

    // Remove offscreen tiles and spawn new ones
    const activeTiles = this.tiles.filter(t => t.y < 600);
    if (activeTiles.length > 0) {
      const highestTileY = Math.min(...activeTiles.map(t => t.y));
      if (highestTileY > 0) {
        this.spawnTile(highestTileY - 150);
      }
    }
    this.tiles = activeTiles;

    // Read input
    const inp = this.input;
    this.keys.forEach((key, laneIdx) => {
      if (inp.wasPressed(key)) {
        this.tapLane(laneIdx);
      }
    });

    // Mouse click fallback
    if (inp.wasMouseClicked()) {
      const m = inp.getMousePos();
      const laneIdx = Math.floor(m.x / this.laneWidth);
      if (laneIdx >= 0 && laneIdx < this.laneCount) {
        this.tapLane(laneIdx);
      }
    }
  }

  tapLane(laneIdx) {
    // Find lowest tile in this lane that hasn't been hit yet
    const target = this.tiles
      .filter(t => t.lane === laneIdx && !t.hit)
      .sort((a, b) => b.y - a.y)[0];

    if (target) {
      // Check if tile is inside the hit zone
      const inHitZone = target.y + this.tileHeight >= this.hitZoneY && target.y <= 600;
      if (inHitZone) {
        target.hit = true;
        this.tapsCount++;
        this.score += target.isPower ? 30 : 15;

        // Check Goal
        const goal = this.getLevelGoal();
        if (this.tapsCount >= goal.target) {
          this.levelComplete();
        }
      } else {
        this.lives--; // Miss
      }
    } else {
      this.lives--; // Miss
    }
  }

  render() {
    this.clearCanvas();
    const ctx = this.ctx;

    // Draw Lanes
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i < this.laneCount; i++) {
      ctx.beginPath();
      ctx.moveTo(i * this.laneWidth, 0);
      ctx.lineTo(i * this.laneWidth, 600);
      ctx.stroke();
    }

    // Draw Hit Zone line
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.hitZoneY);
    ctx.lineTo(600, this.hitZoneY);
    ctx.stroke();

    // Draw Tiles
    this.tiles.forEach(t => {
      if (t.hit) return;
      ctx.fillStyle = t.isPower ? '#ffd93d' : '#6c63ff';
      ctx.fillRect(t.lane * this.laneWidth + 4, t.y, this.laneWidth - 8, this.tileHeight);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(t.lane * this.laneWidth + 4, t.y, this.laneWidth - 8, this.tileHeight);
    });
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    return [
      { label: 'Taps', value: `${this.tapsCount}/${this.getLevelGoal().target}` },
      { label: 'Level', value: this.level }
    ];
  }

  getLevelGoal() {
    const goals = [
      null,
      { type: 'taps', target: 8 },
      { type: 'taps', target: 10 },
      { type: 'taps', target: 12 },
      { type: 'taps', target: 14 },
      { type: 'taps', target: 16 },
      { type: 'taps', target: 18 },
      { type: 'taps', target: 20 },
      { type: 'taps', target: 22 },
      { type: 'taps', target: 24 },
      { type: 'taps', target: 25 }
    ];
    return goals[this.level];
  }
}

window.GameClass = TileRunner;
