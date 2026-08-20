import { GameBase } from '../../core/game-base.js';

export class ClickerGame extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.energy = 0;
    this.lifetimeEnergy = 0;
    this.coreHeat = 0; // 0.0 to 100.0
    
    this.coreRadius = 100;
    this.corePulse = 0; // For clicking animation
    
    this.coolingLockout = 0; // Time remaining in lockout

    this.generators = [
      { id: 'auto-clicker', name: 'Auto Clicker', baseCost: 15, costMult: 1.15, baseOutput: 0.5, count: 0 },
      { id: 'data-miner', name: 'Data Miner', baseCost: 100, costMult: 1.15, baseOutput: 4, count: 0 },
      { id: 'quantum-node', name: 'Quantum Node', baseCost: 1100, costMult: 1.15, baseOutput: 32, count: 0 },
      { id: 'fusion-reactor', name: 'Fusion Reactor', baseCost: 12000, costMult: 1.15, baseOutput: 260, count: 0 }
    ];

    this.setupInput();
  }

  getCost(gen) {
    return Math.floor(gen.baseCost * Math.pow(gen.costMult, gen.count));
  }

  getCPS() {
    let cps = 0;
    for (let gen of this.generators) {
      cps += gen.count * gen.baseOutput;
    }
    return cps;
  }

  setupInput() {
    this.input.onMouseDown = (e) => {
      if (this.isPaused || this.isOver) return;
      
      const mx = this.input.mouse.x;
      const my = this.input.mouse.y;
      
      // Core click
      const cx = this.W / 4;
      const cy = this.H / 2;
      const dist = Math.hypot(mx - cx, my - cy);
      
      if (dist <= this.coreRadius) {
        if (this.coolingLockout <= 0) {
          this.clickCore();
        } else {
          // Locked out!
          if (window.Sound) window.Sound.playTone(150, 'sawtooth', 0.1);
        }
        return;
      }

      // Upgrade buttons click
      const startY = 150;
      const btnH = 80;
      const spacing = 20;
      
      for (let i = 0; i < this.generators.length; i++) {
        const gen = this.generators[i];
        const btnX = this.W / 2 + 50;
        const btnY = startY + i * (btnH + spacing);
        const btnW = 300;
        
        if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
          this.buyUpgrade(gen);
          return;
        }
      }
    };
  }

  clickCore() {
    // Generate Energy
    // Clicking power scales with lifetime energy slightly? No, spec says $+2.5^C$ heat.
    // Let's say manual click is always 1, plus 1% of CPS?
    // Let's just make it 1 energy for now, to encourage upgrades.
    const clickPower = 1 + Math.floor(this.getCPS() * 0.05);
    this.energy += clickPower;
    this.lifetimeEnergy += clickPower;
    this.score = Math.floor(this.lifetimeEnergy);
    
    // Add heat
    this.coreHeat += 2.5;
    this.corePulse = 1.0;
    
    if (window.Sound) window.Sound.playTone(300 + Math.random()*50, 'sine', 0.05);

    if (this.coreHeat >= 100.0) {
      // Trigger Meltdown
      this.coreHeat = 100.0;
      this.coolingLockout = 8.0;
      if (window.Sound) window.Sound.playTone(100, 'sawtooth', 0.5);
    }
  }

  buyUpgrade(gen) {
    const cost = this.getCost(gen);
    if (this.energy >= cost) {
      this.energy -= cost;
      gen.count++;
      if (window.Sound) window.Sound.playTone(800, 'square', 0.1);
    } else {
      if (window.Sound) window.Sound.playTone(200, 'sawtooth', 0.05);
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    
    // Update animation
    if (this.corePulse > 0) {
      this.corePulse = Math.max(0, this.corePulse - delta * 5);
    }

    // Cooling Lockout logic
    if (this.coolingLockout > 0) {
      this.coolingLockout -= delta;
      
      // Cooling drops heat to 0 over 8 seconds.
      // We know we start at 100. So we need to drop 100 / 8 = 12.5 per sec.
      this.coreHeat = Math.max(0, this.coreHeat - (100.0 / 8.0) * delta);
      
      if (this.coolingLockout <= 0) {
        this.coolingLockout = 0;
        this.coreHeat = 0;
      }
    } else {
      // Passive Cooling
      this.coreHeat = Math.max(0, this.coreHeat - 5.0 * delta);
    }

    // Passive Energy Generation
    let currentCPS = this.getCPS();
    if (this.coolingLockout > 0) {
      currentCPS *= 0.2; // 80% reduction during meltdown
    }
    
    this.energy += currentCPS * delta;
    this.lifetimeEnergy += currentCPS * delta;
    this.score = Math.floor(this.lifetimeEnergy);
  }

  render(ctx) {
    this.clear();
    
    // Draw Stats
    ctx.fillStyle = '#fff';
    ctx.font = '24px "JetBrains Mono"';
    ctx.textAlign = 'left';
    ctx.fillText(`ENERGY: ${Math.floor(this.energy).toLocaleString()}`, 30, 40);
    
    let currentCPS = this.getCPS();
    if (this.coolingLockout > 0) currentCPS *= 0.2;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '16px "JetBrains Mono"';
    ctx.fillText(`CPS: ${currentCPS.toFixed(1)} / sec`, 30, 70);

    // Draw Heat Gauge
    ctx.fillStyle = '#111';
    ctx.fillRect(30, 100, 300, 20);
    
    let heatColor = '#10b981'; // Green
    if (this.coreHeat > 60) heatColor = '#eab308'; // Yellow
    if (this.coreHeat > 85) heatColor = '#f43f5e'; // Red
    if (this.coolingLockout > 0) heatColor = '#94a3b8'; // Grey (locked)
    
    ctx.fillStyle = heatColor;
    ctx.fillRect(30, 100, 300 * (this.coreHeat / 100.0), 20);
    
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '12px "JetBrains Mono"';
    ctx.fillText(
      this.coolingLockout > 0 ? `MELTDOWN! ${this.coolingLockout.toFixed(1)}s` : `HEAT: ${this.coreHeat.toFixed(1)}%`, 
      180, 115
    );

    // Draw Core
    const cx = this.W / 4;
    const cy = this.H / 2 + 50;
    const radius = this.coreRadius + (this.corePulse * 15);
    
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    
    ctx.fillStyle = this.coolingLockout > 0 ? '#475569' : '#06b6d4'; // Cyan or grey
    ctx.shadowColor = ctx.fillStyle;
    
    // Pulse shadow heavily if close to meltdown
    let shadowBase = this.coolingLockout > 0 ? 0 : 20;
    if (this.coreHeat > 80 && this.coolingLockout === 0) {
      shadowBase = 40 + Math.sin(Date.now() / 100) * 20;
      ctx.shadowColor = '#f43f5e'; // Red warning glow
    }
    
    ctx.shadowBlur = shadowBase;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Core details
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
    
    ctx.fillStyle = '#fff';
    ctx.font = '24px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText("CORE", cx, cy + 10);

    // Draw Upgrades
    const startY = 150;
    const btnH = 80;
    const spacing = 20;
    
    ctx.textAlign = 'left';
    for (let i = 0; i < this.generators.length; i++) {
      const gen = this.generators[i];
      const btnX = this.W / 2 + 50;
      const btnY = startY + i * (btnH + spacing);
      const btnW = 300;
      
      const cost = this.getCost(gen);
      const canAfford = this.energy >= cost;
      
      ctx.fillStyle = canAfford ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = canAfford ? '#10b981' : '#333';
      ctx.lineWidth = 2;
      
      // If hovering, highlight (need hover logic in update or input for this, leaving simple for now)
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.strokeRect(btnX, btnY, btnW, btnH);
      
      ctx.fillStyle = canAfford ? '#fff' : '#666';
      ctx.font = '16px "JetBrains Mono"';
      ctx.fillText(gen.name, btnX + 15, btnY + 30);
      
      ctx.font = '14px "JetBrains Mono"';
      ctx.fillText(`Cost: ${cost.toLocaleString()} E`, btnX + 15, btnY + 60);
      
      ctx.textAlign = 'right';
      ctx.fillStyle = '#a855f7'; // Purple
      ctx.font = '24px "JetBrains Mono"';
      ctx.fillText(`${gen.count}`, btnX + btnW - 15, btnY + 45);
      
      ctx.textAlign = 'left';
    }
    
    // Draw quit instruction
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '14px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText("Press END GAME in menu when finished.", this.W / 2, this.H - 30);
  }
}

export default ClickerGame;
