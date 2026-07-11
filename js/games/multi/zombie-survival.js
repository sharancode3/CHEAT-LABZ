import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

export default class ZombieSurvivalGame extends MultiplayerGameBase {
  static logicalWidth = 700;
  static logicalHeight = 700;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.state = null;

    // Local inputs tracker
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      dash: false,
      grenade: false
    };

    this.mousePos = { x: 350, y: 350 };
    this.isShooting = false;
    this.prevZombieHps = {}; // id -> hp (for hit flash detection)
    this.zombieFlashes = {}; // id -> duration

    this.shakeTime = 0.0;
    this.prevWave = 1;
    this.waveClearBannerTime = 0.0;

    this._boundHandlers = {};
  }

  async init() {
    this.bindSocket();
    this.bindInput();

    this.socket.emit('zombie:ready', { code: this.room.code });
  }

  bindSocket() {
    const bind = (ev, fn) => {
      this._boundHandlers[ev] = fn;
      this.socket.on(ev, fn);
    };

    bind('zombie:tick', (data) => {
      // Detect tank zombie death to shake screen
      if (this.state && data.zombies) {
        const oldZombies = this.state.zombies || [];
        const newZombies = data.zombies || [];
        
        oldZombies.forEach(oldZ => {
          if (oldZ.type === 'tank') {
            const stillAlive = newZombies.some(nz => nz.x === oldZ.x && nz.y === oldZ.y && nz.hp > 0);
            if (!stillAlive) {
              this.shakeTime = 0.25; // 250ms screen shake
            }
          }
        });

        // Hit flash updates
        newZombies.forEach((nz, idx) => {
          const oldZ = oldZombies[idx];
          if (oldZ && nz.hp < oldZ.hp) {
            this.zombieFlashes[idx] = 0.12; // flash white for 120ms
          }
        });
      }

      // Detect Wave progression
      if (this.state && data.wave > this.state.wave) {
        this.waveClearBannerTime = 1.5; // show banner for 1.5s
        if (this.container) {
          this.container.audio.play('coin');
        }
      }

      this.state = data;
      this.updateHud();
    });

    bind('game:over', ({ winner }) => {
      if (this.container) {
        this.container.audio.play('damage');
      }
    });
  }

  updateHud() {
    if (this.state && this.container) {
      // Co-op aggregate scores
      const totalKills = this.state.kills || 0;
      this.container.updateScore(totalKills);
      this.container.updateOpponentScore(this.state.wave);
    }
  }

  bindInput() {
    const updateInputs = () => {
      const myP = this.state?.players[this.mySocketId];
      if (!myP || !myP.alive) return;

      let dx = 0;
      let dy = 0;
      if (this.keys.up) dy = -1;
      if (this.keys.down) dy = 1;
      if (this.keys.left) dx = -1;
      if (this.keys.right) dx = 1;

      // Normalize diagonal vector
      if (dx !== 0 && dy !== 0) {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;
      }

      const aimAngle = Math.atan2(this.mousePos.y - myP.y, this.mousePos.x - myP.x);

      this.socket.emit('zombie:input', {
        code: this.room.code,
        dx, dy,
        shoot: this.isShooting,
        aimAngle,
        dash: this.keys.dash,
        grenade: this.keys.grenade
      });

      this.keys.dash = false;
      this.keys.grenade = false;
    };

    const handleKey = (e, isDown) => {
      let changed = false;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') { this.keys.up = isDown; changed = true; }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') { this.keys.down = isDown; changed = true; }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') { this.keys.left = isDown; changed = true; }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') { this.keys.right = isDown; changed = true; }
      
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (isDown) this.keys.dash = true;
        changed = true;
      }

      if (e.code === 'KeyG' || e.code === 'KeyQ') {
        if (isDown) this.keys.grenade = true;
        changed = true;
      }

      if (changed && this.state) {
        e.preventDefault();
        updateInputs();
      }
    };

    this._onKeyDown = (e) => handleKey(e, true);
    this._onKeyUp = (e) => handleKey(e, false);

    this._onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = (e.clientX - rect.left) * (ZombieSurvivalGame.logicalWidth / rect.width);
      this.mousePos.y = (e.clientY - rect.top)  * (ZombieSurvivalGame.logicalHeight / rect.height);
      if (this.state) updateInputs();
    };

    this._onMouseDown = (e) => {
      if (e.button === 0 && this.state) {
        this.isShooting = true;
        updateInputs();
      }
    };

    this._onMouseUp = (e) => {
      if (e.button === 0 && this.state) {
        this.isShooting = false;
        updateInputs();
      }
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mouseup', this._onMouseUp);
  }

  update(dt) {
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
    }
    if (this.waveClearBannerTime > 0) {
      this.waveClearBannerTime -= dt;
    }

    // Tick hit flashes
    for (const id in this.zombieFlashes) {
      this.zombieFlashes[id] -= dt;
      if (this.zombieFlashes[id] <= 0) {
        delete this.zombieFlashes[id];
      }
    }
  }

  render(ctx) {
    const cw = ZombieSurvivalGame.logicalWidth;
    const ch = ZombieSurvivalGame.logicalHeight;

    ctx.save();
    // Screen shake translate
    if (this.shakeTime > 0) {
      const dx = (Math.random() - 0.5) * 8;
      const dy = (Math.random() - 0.5) * 8;
      ctx.translate(dx, dy);
    }

    // Dark gritty floor
    ctx.fillStyle = '#18181f';
    ctx.fillRect(0, 0, cw, ch);

    // Grid details
    ctx.strokeStyle = 'rgba(255,255,255,0.015)';
    ctx.lineWidth = 1;
    const spacing = 35;
    ctx.beginPath();
    for (let i = 0; i <= cw; i += spacing) {
      ctx.moveTo(i, 0); ctx.lineTo(i, ch);
      ctx.moveTo(0, i); ctx.lineTo(cw, i);
    }
    ctx.stroke();

    if (!this.state) {
      ctx.restore();
      return;
    }

    // Draw Weapon Pickups (drops)
    if (this.state.drops) {
      this.state.drops.forEach(d => {
        ctx.fillStyle = d.type === 'medkit' ? '#ff7675' : '#ffd93d';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '10px "DM Sans", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(d.type.toUpperCase(), d.x, d.y - 12);
      });
    }

    // Draw Bullets
    if (this.state.bullets) {
      this.state.bullets.forEach(b => {
        ctx.fillStyle = b.ownerId === 'zombie' ? '#8e44ad' : '#ffd93d';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw Grenades
    if (this.state.grenades) {
      this.state.grenades.forEach(g => {
        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.arc(g.x, g.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw Active Blast Circles
    if (this.state.blasts) {
      this.state.blasts.forEach(b => {
        ctx.fillStyle = 'rgba(230, 126, 34, 0.45)';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw Zombies
    if (this.state.zombies) {
      this.state.zombies.forEach((z, idx) => {
        const isFlashed = this.zombieFlashes[idx] > 0;
        
        ctx.save();
        ctx.translate(z.x, z.y);
        ctx.fillStyle = isFlashed ? '#ffffff' : (z.type === 'runner' ? '#e74c3c' : (z.type === 'tank' ? '#27ae60' : '#2c3e50'));

        const r = z.type === 'tank' ? 24 : 14;

        // Draw zombie body
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Arm reach indicators
        ctx.strokeStyle = isFlashed ? '#ffffff' : '#273c15';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-r, 0); ctx.lineTo(-r - 10, -5);
        ctx.moveTo(r, 0); ctx.lineTo(r + 10, -5);
        ctx.stroke();

        ctx.restore();
      });
    }

    // Draw Players
    const colors = ['#3498db', '#f1c40f', '#00d4aa', '#e056fd'];
    let idx = 0;
    for (const [id, player] of Object.entries(this.state.players)) {
      if (!player.alive && player.hp === 0) continue; // dead completely

      const px = player.x;
      const py = player.y;
      const r = 16;
      const isMe = id === this.mySocketId;

      ctx.save();
      ctx.fillStyle = colors[idx % colors.length];
      idx++;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isMe ? 2.5 : 1.5;

      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // HP Bar above player
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(px - 20, py - 24, 40, 5);
      ctx.fillStyle = '#ff7675';
      ctx.fillRect(px - 20, py - 24, (player.hp / 5) * 40, 5);

      // Downed revive HUD
      if (player.hp === 0) {
        ctx.font = 'bold 9px "Press Start 2P", monospace';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'center';
        ctx.fillText('DOWNED', px, py - 32);
        
        if (player.reviveProgress > 0) {
          ctx.fillStyle = '#ffd93d';
          ctx.fillText(`REVIVING (${Math.floor((player.reviveProgress / 3000) * 100)}%)`, px, py + 30);
        }
      } else {
        ctx.font = '10px "DM Sans", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(isMe ? 'YOU' : player.displayName, px, py - 32);
      }
      ctx.restore();
    }

    ctx.restore(); // end camera shake

    // Wave status HUD
    ctx.font = 'bold 13px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`WAVE: ${this.state.wave}`, cw/2, 40);

    // Wave completed Banner
    if (this.waveClearBannerTime > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, ch/2 - 40, cw, 80);

      ctx.font = 'bold 20px "Press Start 2P", monospace';
      ctx.fillStyle = '#2ecc71';
      ctx.fillText('WAVE CLEARED', cw/2, ch/2 + 8);
      ctx.restore();
    }
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    for (const [ev, fn] of Object.entries(this._boundHandlers)) {
      this.socket.off(ev, fn);
    }
    super.destroy();
  }
}
