import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

const SERVER_W = 500;
const SERVER_H = 700;

const CARD_DATA = [
  { type: 'grunt',  cost: 2, label: 'GRUNT',  color: '#e74c3c' },
  { type: 'tank',   cost: 4, label: 'TANK',   color: '#27ae60' },
  { type: 'archer', cost: 3, label: 'ARCHER', color: '#9b59b6' },
  { type: 'bomber', cost: 5, label: 'BOMBER', color: '#e67e22' }
];

export default class MiniClashGame extends MultiplayerGameBase {
  static logicalWidth = 480;
  static logicalHeight = 680;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.state = null;

    this.scaleX = MiniClashGame.logicalWidth / SERVER_W;
    this.scaleY = MiniClashGame.logicalHeight / SERVER_H;

    this.selectedCardIndex = 0; // Grunt selected by default
    this.mousePos = { x: 240, y: 340 };

    this._boundHandlers = {};
  }

  async init() {
    this.bindSocket();
    this.bindInput();

    this.socket.emit('clash:ready', { code: this.room.code });
  }

  bindSocket() {
    const bind = (ev, fn) => {
      this._boundHandlers[ev] = fn;
      this.socket.on(ev, fn);
    };

    bind('clash:tick', (data) => {
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
      // Aggregate towers destroyed
      const myIdx = this.state.playersList ? this.state.playersList.indexOf(this.mySocketId) : 0;
      const oppIdx = myIdx === 0 ? 1 : 0;

      let myDestroyed = 0;
      let oppDestroyed = 0;

      const myTowers = this.state.towers[myIdx];
      const oppTowers = this.state.towers[oppIdx];

      if (myTowers) {
        for (const t of Object.values(myTowers)) {
          if (t.hp <= 0) oppDestroyed++;
        }
      }
      if (oppTowers) {
        for (const t of Object.values(oppTowers)) {
          if (t.hp <= 0) myDestroyed++;
        }
      }

      this.container.updateScore(myDestroyed);
      this.container.updateOpponentScore(oppDestroyed);
    }
  }

  bindInput() {
    this._onClick = (e) => {
      if (!this.state) return;

      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (MiniClashGame.logicalWidth / rect.width);
      const my = (e.clientY - rect.top)  * (MiniClashGame.logicalHeight / rect.height);

      // 1. Click on hand cards at the bottom (y = 590 to 650)
      const handY = 585;
      const cardW = 75;
      const cardH = 55;
      const startX = 40;
      const gap = 100;

      for (let i = 0; i < CARD_DATA.length; i++) {
        const cx = startX + i * gap;
        if (mx >= cx && mx <= cx + cardW && my >= handY && my <= handY + cardH) {
          this.selectedCardIndex = i;
          if (this.container) this.container.audio.play('hit');
          return;
        }
      }

      // 2. Click on battlefield to deploy
      const selected = CARD_DATA[this.selectedCardIndex];
      const myIdx = this.state.playersList ? this.state.playersList.indexOf(this.mySocketId) : 0;
      
      const serverX = mx / this.scaleX;
      const serverY = my / this.scaleY;

      // Validate deployment boundary (P0: bottom half y > 350, P1: top half y < 350)
      const validBoundary = myIdx === 0 ? serverY >= 350 : serverY < 350;
      if (validBoundary && my < 560) {
        this.socket.emit('clash:deploy', {
          code: this.room.code,
          unitType: selected.type,
          x: serverX,
          y: serverY
        });
        if (this.container) this.container.audio.play('hit');
      } else {
        if (this.container) this.container.audio.play('damage');
      }
    };

    this._onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = (e.clientX - rect.left) * (MiniClashGame.logicalWidth / rect.width);
      this.mousePos.y = (e.clientY - rect.top)  * (MiniClashGame.logicalHeight / rect.height);
    };

    this.canvas.addEventListener('click', this._onClick);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
  }

  update(dt) {
    // client updates
  }

  render(ctx) {
    const cw = MiniClashGame.logicalWidth;
    const ch = MiniClashGame.logicalHeight;

    // Field floor
    ctx.fillStyle = '#1e3f20'; // dark green grass
    ctx.fillRect(0, 0, cw, ch);

    if (!this.state) return;

    const myIdx = this.state.playersList ? this.state.playersList.indexOf(this.mySocketId) : 0;
    const oppIdx = myIdx === 0 ? 1 : 0;

    // Draw battlefield center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, 350 * this.scaleY); ctx.lineTo(cw, 350 * this.scaleY);
    ctx.stroke();

    // Draw deployment boundary warning overlay on hover
    const myPosServer = this.mousePos.y / this.scaleY;
    const isHoveringOppHalf = myIdx === 0 ? myPosServer < 350 : myPosServer >= 350;
    if (isHoveringOppHalf && this.mousePos.y < 560) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)'; // red tint
      ctx.fillRect(0, myIdx === 0 ? 0 : 350 * this.scaleY, cw, 350 * this.scaleY);
    }

    // Draw Towers
    for (let team = 0; team <= 1; team++) {
      const towers = this.state.towers[team];
      if (!towers) continue;

      for (const [key, t] of Object.entries(towers)) {
        if (t.hp <= 0) continue; // destroyed tower

        const tx = t.x * this.scaleX;
        const ty = t.y * this.scaleY;
        const size = t.type === 'king' ? 24 : 16;
        const color = team === myIdx ? '#00d4aa' : '#ff7675';

        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.0;

        ctx.beginPath();
        ctx.arc(tx, ty, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Tower crown center star
        ctx.fillStyle = '#ffffff';
        ctx.font = t.type === 'king' ? '12px "DM Sans", sans-serif' : '8px "DM Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.type === 'king' ? '👑' : '🏰', tx, ty + 4);

        // HP Bar
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(tx - 25, ty - size - 14, 50, 6);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(tx - 25, ty - size - 14, (t.hp / t.maxHp) * 50, 6);

        ctx.restore();
      }
    }

    // Draw Units marching
    this.state.units.forEach(u => {
      if (u.hp <= 0) return;

      const ux = u.x * this.scaleX;
      const uy = u.y * this.scaleY;
      const col = u.team === myIdx ? '#00d4aa' : '#ff7675';

      ctx.save();
      ctx.fillStyle = col;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;

      // Circle body
      ctx.beginPath();
      ctx.arc(ux, uy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Show small letter inside circle indicating type
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(u.type.charAt(0).toUpperCase(), ux, uy + 3.0);
      ctx.restore();
    });

    // Draw bottom hand panel & card selector
    this.drawHandPanel(ctx, cw, ch, myIdx);

    // Timer display
    ctx.font = "bold 11px 'Press Start 2P', monospace";
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const minutes = Math.floor(this.state.timeLeft / 60);
    const seconds = Math.floor(this.state.timeLeft % 60).toString().padStart(2, '0');
    ctx.fillText(`${minutes}:${seconds}`, cw / 2, 35);
  }

  drawHandPanel(ctx, cw, ch, myIdx) {
    const elixir = this.state.elixir[this.mySocketId] || 0;

    // Background bar panel
    ctx.fillStyle = '#111118';
    ctx.fillRect(0, 560, cw, 120);

    // Purple Elixir bar
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(30, 568, cw - 60, 8);
    ctx.fillStyle = '#9b59b6';
    ctx.fillRect(30, 568, (elixir / 10) * (cw - 60), 8);

    // Elixir value count text
    ctx.font = 'bold 9px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`ELIXIR: ${elixir}/10`, 35, 590);

    // Cards grid
    const handY = 600;
    const cardW = 75;
    const cardH = 55;
    const startX = 40;
    const gap = 100;

    CARD_DATA.forEach((card, idx) => {
      const cx = startX + idx * gap;
      const isSelected = this.selectedCardIndex === idx;
      const canAfford = elixir >= card.cost;

      ctx.save();
      ctx.fillStyle = isSelected ? 'rgba(155, 89, 182, 0.15)' : '#1c1c24';
      ctx.strokeStyle = isSelected ? '#9b59b6' : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = isSelected ? 2.5 : 1.0;

      ctx.beginPath();
      ctx.roundRect(cx, handY, cardW, cardH, 5);
      ctx.fill();
      ctx.stroke();

      // Card Type Label
      ctx.font = 'bold 8px "Press Start 2P", monospace';
      ctx.fillStyle = canAfford ? '#ffffff' : 'rgba(255,255,255,0.2)';
      ctx.textAlign = 'center';
      ctx.fillText(card.label, cx + cardW/2, handY + 22);

      // Card Cost Bubble
      ctx.fillStyle = '#9b59b6';
      ctx.beginPath();
      ctx.arc(cx + cardW - 12, handY + 12, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px "DM Sans", sans-serif';
      ctx.fillText(card.cost.toString(), cx + cardW - 12, handY + 15);

      ctx.restore();
    });
  }

  destroy() {
    this.canvas.removeEventListener('click', this._onClick);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    for (const [ev, fn] of Object.entries(this._boundHandlers)) {
      this.socket.off(ev, fn);
    }
    super.destroy();
  }
}
