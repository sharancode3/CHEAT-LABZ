import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const SERVER_ARENA_SIZE = 700;

export default class TankBattleGame extends MultiplayerGameBase {
  static logicalWidth = 680;
  static logicalHeight = 680;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.state = null;

    this.inputState = {
      up: false,
      down: false,
      left: false,
      right: false,
      turretAngle: 0,
      fire: false
    };

    this.mousePos = { x: 340, y: 340 };
    this.prevTanksState = {}; // to detect death transitions
    this.particles = []; // radial explosion particles
    this.scale = TankBattleGame.logicalWidth / SERVER_ARENA_SIZE;

    this._boundHandlers = {};
  }

  async init() {
    this.bindSocket();
    this.bindInput();

    this.socket.emit('tank:ready', { code: this.room.code });
  }

  bindSocket() {
    const bind = (ev, fn) => {
      this._boundHandlers[ev] = fn;
      this.socket.on(ev, fn);
    };

    bind('tank:tick', (data) => {
      // Check for tank deaths to spawn particles
      if (this.state && data.tanks) {
        for (const [id, t] of Object.entries(data.tanks)) {
          const oldT = this.state.tanks[id];
          if (oldT && oldT.alive && !t.alive) {
            this.spawnExplosion(t.x * this.scale, t.y * this.scale);
            if (this.container) {
              this.container.audio.play('damage');
            }
          }
        }
      }

      this.state = data;
      this.updateHud();
    });

    bind('game:over', ({ winner }) => {
      if (this.container) {
        this.container.audio.play('coin');
      }
    });
  }

  updateHud() {
    if (this.state && this.container) {
      const oppId = this.opponent?.socketId;
      const myT = this.state.tanks[this.mySocketId];
      const oppT = this.state.tanks[oppId];

      if (myT && oppT) {
        this.container.updateScore(myT.kills);
        this.container.updateOpponentScore(oppT.kills);
      }
    }
  }

  bindInput() {
    const updateInputs = () => {
      const myT = this.state?.tanks[this.mySocketId];
      if (myT && myT.alive) {
        const tx = myT.x * this.scale;
        const ty = myT.y * this.scale;
        this.inputState.turretAngle = Math.atan2(this.mousePos.y - ty, this.mousePos.x - tx);
      }

      this.socket.emit('tank:input', {
        code: this.room.code,
        ...this.inputState
      });
      // reset one-shot fire key
      this.inputState.fire = false;
    };

    const handleKey = (e, isDown) => {
      let changed = false;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') { this.inputState.up = isDown; changed = true; }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') { this.inputState.down = isDown; changed = true; }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') { this.inputState.left = isDown; changed = true; }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') { this.inputState.right = isDown; changed = true; }
      
      if (e.code === 'Space') {
        e.preventDefault();
        if (isDown) {
          this.inputState.fire = true;
        }
        changed = true;
      }

      if (changed && this.state) {
        updateInputs();
      }
    };

    this._onKeyDown = (e) => handleKey(e, true);
    this._onKeyUp = (e) => handleKey(e, false);

    this._onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = (e.clientX - rect.left) * (TankBattleGame.logicalWidth / rect.width);
      this.mousePos.y = (e.clientY - rect.top)  * (TankBattleGame.logicalHeight / rect.height);
      if (this.state) updateInputs();
    };

    this._onMouseDown = (e) => {
      if (e.button === 0 && this.state) {
        this.inputState.fire = true;
        updateInputs();
      }
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
  }

  spawnExplosion(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12;
      const speed = 60 + Math.random() * 60; // speed in px/sec
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5, // 500ms
        color: '#ff7675'
      });
    }
  }

  update(dt) {
    // Particles update
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      return p.life > 0;
    });
  }

  render(ctx) {
    const cw = TankBattleGame.logicalWidth;
    const ch = TankBattleGame.logicalHeight;

    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, cw, ch);

    if (!this.state) return;

    // Subtle arena grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const cellSize = 34; // approx grid visual spacing
    for (let x = 0; x <= cw; x += cellSize) {
      ctx.moveTo(x, 0); ctx.lineTo(x, ch);
    }
    for (let y = 0; y <= ch; y += cellSize) {
      ctx.moveTo(0, y); ctx.lineTo(cw, y);
    }
    ctx.stroke();

    // Draw Walls
    this.state.walls.forEach(w => {
      const wx = w.x * this.scale;
      const wy = w.y * this.scale;
      const ww = w.w * this.scale;
      const wh = w.h * this.scale;

      ctx.fillStyle = '#2d3748';
      ctx.strokeStyle = '#1a202c';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(wx, wy, ww, wh, 6);
      ctx.fill();
      ctx.stroke();

      // Inner stripes pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.beginPath();
      ctx.moveTo(wx + 4, wy + 4); ctx.lineTo(wx + ww - 4, wy + wh - 4);
      ctx.stroke();
    });

    // Draw Bullets with 3-position trailing arcs
    this.state.bullets.forEach(b => {
      const bx = b.x * this.scale;
      const by = b.y * this.scale;
      const radius = 4;

      ctx.save();
      ctx.fillStyle = '#55efc4';
      ctx.shadowColor = '#55efc4';
      ctx.shadowBlur = 8;
      
      // Draw bullet center
      ctx.beginPath();
      ctx.arc(bx, by, radius, 0, Math.PI * 2);
      ctx.fill();

      // Tail trail based on velocity
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(85, 239, 196, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - b.vx * this.scale * 2.0, by - b.vy * this.scale * 2.0);
      ctx.stroke();
      ctx.restore();
    });

    // Draw Tanks
    const colors = ['#55efc4', '#ff7675', '#ffd93d', '#00d4aa'];
    let idx = 0;
    for (const [id, tank] of Object.entries(this.state.tanks)) {
      if (!tank.alive) continue;

      const tx = tank.x * this.scale;
      const ty = tank.y * this.scale;
      const r = 18 * this.scale; // radius of tank body is 18

      const isMe = id === this.mySocketId;
      const col = colors[idx % colors.length];
      idx++;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(tank.angle);

      // Tracks left & right side
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-r - 2, -r + 1, (r + 2)*2, 4);
      ctx.fillRect(-r - 2, r - 5, (r + 2)*2, 4);

      // Tank rounded body
      ctx.fillStyle = col;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isMe ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(-r, -r + 3, r * 2, r * 2 - 6, 6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Turret (Rotated separately)
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(tank.turretAngle);

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      
      // Barrel
      ctx.fillRect(0, -3, r * 1.25, 6);
      ctx.strokeRect(0, -3, r * 1.25, 6);

      // Turret dome center cap
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Draw health hearts
      ctx.font = '10px "DM Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(isMe ? 'YOU' : tank.displayName, tx, ty - r - 12);
      
      // Health bars (hearts string)
      const hearts = '♥'.repeat(Math.max(0, tank.health));
      ctx.fillStyle = '#ef4444';
      ctx.fillText(hearts, tx, ty - r - 2);
    }

    // Draw Particles
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life / 0.5;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Inset MiniMap (Bottom Right)
    this.drawMiniMap(ctx, cw, ch);

    // Timer display
    ctx.font = "bold 12px 'Press Start 2P', monospace";
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const minutes = Math.floor(this.state.timeLeft / 60);
    const seconds = Math.floor(this.state.timeLeft % 60).toString().padStart(2, '0');
    ctx.fillText(`${minutes}:${seconds}`, cw / 2, 35);
  }

  drawMiniMap(ctx, cw, ch) {
    const mw = 100;
    const mh = 100;
    const mx = cw - mw - 15;
    const my = ch - mh - 15;

    ctx.save();
    // Backdrop
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeRect(mx, my, mw, mh);

    const mScale = mw / SERVER_ARENA_SIZE;

    // Walls in Minimap
    ctx.fillStyle = '#4a5568';
    this.state.walls.forEach(w => {
      ctx.fillRect(mx + w.x * mScale, my + w.y * mScale, w.w * mScale, w.h * mScale);
    });

    // Tanks in Minimap
    const colors = ['#55efc4', '#ff7675', '#ffd93d', '#00d4aa'];
    let idx = 0;
    for (const [id, tank] of Object.entries(this.state.tanks)) {
      if (!tank.alive) continue;
      const dotX = mx + tank.x * mScale;
      const dotY = my + tank.y * mScale;
      
      ctx.fillStyle = colors[idx % colors.length];
      idx++;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    for (const [ev, fn] of Object.entries(this._boundHandlers)) {
      this.socket.off(ev, fn);
    }
    super.destroy();
  }
}
