/**
 * js/core/game-container.js
 *
 * The core runtime container for all CHEAT LABZ games.
 * Handles the canvas rendering wrapper, logical resolution resizing,
 * high-DPI scaling, overlay overlays (HUD, Loading, Pause, GameOver, Instruction),
 * sandboxed input management, performance throttling, and game audio proxy.
 *
 * Phase 3: Premium HUD layer with animated score, floating text,
 *          contextual sidebar, polished overlays, and responsive design.
 */

import { Sound } from './sound.js';
import { Storage } from './storage.js';

export class GameContainer {
  constructor(mountPoint, gameClass, manifest, config = {}) {
    if (!mountPoint) throw new Error("[GameContainer] Mount point DOM element is required");
    this.mountPoint = mountPoint;
    this.GameClass = gameClass;
    this.manifest = manifest;
    
    // Core Configuration
    this.config = {
      difficulty: 'MEDIUM',
      difficultyMultiplier: 1.0,
      isArena: false,
      dailyIndex: undefined,
      ...config
    };

    // Apply difficulty multiplier based on choice
    const diff = (this.config.difficulty || 'MEDIUM').toUpperCase();
    if (diff === 'EASY') this.config.difficultyMultiplier = 1.0;
    else if (diff === 'MEDIUM') this.config.difficultyMultiplier = 1.5;
    else if (diff === 'HARD') this.config.difficultyMultiplier = 2.0;

    // State Machine: IDLE, LOADING, READY, PLAYING, PAUSED, GAMEOVER, ERROR
    this.state = 'IDLE';

    // Dimensions
    this.logicalWidth = gameClass.logicalWidth || 600;
    this.logicalHeight = gameClass.logicalHeight || 600;

    // References
    this.gameInstance = null;
    this.animationFrameId = null;
    this.lastTime = 0;

    // Performance Stats
    this.fpsHistory = [];
    this.fpsWarningTriggered = false;
    this.lowFpsDuration = 0; // tracks how long FPS is < 30

    // Score tracking for deltas
    this._lastDisplayedScore = 0;
    this._sessionStartTime = 0;
    this._sidebarTimerInterval = null;

    // Setup Audio
    this.audio = {
      play: (soundName) => {
        if (Sound.muted) return;
        Sound.init();
        if (soundName === 'score') Sound.playBlip();
        else if (soundName === 'gameover') Sound.playGameOver();
        else if (soundName === 'perfect') Sound.playCoin();
        else if (soundName === 'coin') Sound.playCoin();
        else if (soundName === 'damage') Sound.playDamage();
        else Sound.playBlip();
      }
    };

    // Setup Input sandbox
    this.pressedKeys = new Set();
    this.keyCallbacks = {};
    this.mousePos = { x: 0, y: 0 };
    
    this.input = {
      isKeyDown: (key) => {
        const k = key.toLowerCase();
        return this.pressedKeys.has(k) || this.pressedKeys.has(key);
      },
      getMousePosition: () => ({ ...this.mousePos }),
      onKey: (key, cb) => {
        const k = key.toLowerCase();
        if (!this.keyCallbacks[k]) this.keyCallbacks[k] = [];
        this.keyCallbacks[k].push(cb);
      },
      offKey: (key, cb) => {
        const k = key.toLowerCase();
        if (this.keyCallbacks[k]) {
          this.keyCallbacks[k] = this.keyCallbacks[k].filter(c => c !== cb);
        }
      }
    };

    // Bound event handlers for teardown
    this._boundKeyDown = this.handleKeyDown.bind(this);
    this._boundKeyUp = this.handleKeyUp.bind(this);
    this._boundMouseMove = this.handleMouseMove.bind(this);
    this._boundMouseDown = this.handleMouseDown.bind(this);
    this._boundMouseUp = this.handleMouseUp.bind(this);
    this._boundResize = this.handleResize.bind(this);

    // Initial DOM buildup
    this.initDOM();
  }

  // --- State Machine Transitions ---
  transitionTo(nextState) {
    const validTransitions = {
      'IDLE': ['LOADING'],
      'LOADING': ['READY', 'ERROR', 'IDLE'],
      'READY': ['PLAYING', 'IDLE'],
      'PLAYING': ['PAUSED', 'GAMEOVER', 'IDLE'],
      'PAUSED': ['PLAYING', 'IDLE', 'GAMEOVER'],
      'GAMEOVER': ['LOADING', 'IDLE'],
      'ERROR': ['IDLE', 'LOADING']
    };

    if (nextState !== 'IDLE' && (!validTransitions[this.state] || !validTransitions[this.state].includes(nextState))) {
      console.warn(`[GameContainer] Blocked invalid state transition: ${this.state} -> ${nextState}`);
      return false;
    }

    console.log(`[GameContainer] State transition: ${this.state} -> ${nextState}`);
    this.state = nextState;
    this.updateOverlayStates();
    return true;
  }

  // --- Visual Effects & Juice ---
  shake(duration = 80, intensity = 3) {
    const start = performance.now();
    const animate = (time) => {
      const elapsed = time - start;
      if (elapsed < duration) {
        const dx = (Math.random() - 0.5) * intensity;
        const dy = (Math.random() - 0.5) * intensity;
        this.canvas.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(animate);
      } else {
        this.canvas.style.transform = '';
      }
    };
    requestAnimationFrame(animate);
  }

  // --- DOM & Layer Setup ---
  initDOM() {
    // Clear mount point
    this.mountPoint.innerHTML = '';
    this.mountPoint.style.position = 'relative';
    this.mountPoint.style.width = '100%';
    this.mountPoint.style.height = '100%';
    this.mountPoint.style.display = 'flex';
    this.mountPoint.style.alignItems = 'center';
    this.mountPoint.style.justifyContent = 'center';
    this.mountPoint.style.overflow = 'hidden';
    this.mountPoint.style.backgroundColor = '#0a0a0f';

    // Accent color
    const accent = this.manifest.accentColor || '#6c63ff';
    const accentRgb = this._hexToRgb(accent);

    // Insert Styles
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .container-layer {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease, transform 0.25s ease;
        z-index: 1;
        font-family: 'DM Sans', sans-serif;
        color: #fff;
        box-sizing: border-box;
      }
      .container-layer.active {
        opacity: 1;
        pointer-events: auto;
      }
      
      /* Layer 0: Canvas */
      .canvas-layer {
        z-index: 0;
        opacity: 1;
        pointer-events: auto;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        transition: filter 0.2s ease;
      }

      /* ═══════════════════════════════════════════ */
      /* Layer 1: PREMIUM HUD                       */
      /* ═══════════════════════════════════════════ */
      .hud-layer {
        z-index: 10;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 42px;
        background: linear-gradient(180deg, rgba(6,6,8,0.88) 0%, rgba(6,6,8,0.72) 100%);
        backdrop-filter: blur(16px) saturate(1.3);
        -webkit-backdrop-filter: blur(16px) saturate(1.3);
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        opacity: 0;
        pointer-events: none;
        box-sizing: border-box;
        border-bottom: 1px solid rgba(${accentRgb}, 0.15);
        box-shadow: 0 1px 12px rgba(${accentRgb}, 0.06);
        transition: opacity 0.25s ease;
      }
      .hud-layer.active {
        opacity: 1;
        pointer-events: auto;
      }

      /* HUD Sections */
      .hud-side {
        width: 30%;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .hud-game-name {
        font-family: 'DM Sans', sans-serif;
        font-size: 12px;
        font-weight: 700;
        color: rgba(255,255,255,0.85);
        letter-spacing: 0.3px;
      }
      .hud-center {
        width: 40%;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
      }
      .hud-score-label {
        font-size: 8px;
        font-family: 'JetBrains Mono', monospace;
        color: rgba(${accentRgb}, 0.6);
        letter-spacing: 2px;
        font-weight: 700;
        margin-bottom: 1px;
      }
      .hud-score-value {
        font-family: 'JetBrains Mono', monospace;
        font-size: 26px;
        font-weight: bold;
        color: #fff;
        line-height: 1;
        transition: transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.15s ease;
        will-change: transform;
      }
      .hud-score-value.bump {
        transform: scale(1.18);
        color: var(--accent);
      }

      /* Floating score text container */
      .hud-float-container {
        position: absolute;
        top: 36px;
        left: 50%;
        transform: translateX(-50%);
        pointer-events: none;
        z-index: 15;
        width: 120px;
        text-align: center;
      }
      .hud-float-text {
        position: absolute;
        left: 50%;
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        font-weight: 800;
        color: var(--accent);
        pointer-events: none;
        white-space: nowrap;
        animation: floatScoreUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        text-shadow: 0 0 8px rgba(${accentRgb}, 0.5);
      }
      @keyframes floatScoreUp {
        0% {
          opacity: 1;
          transform: translateX(-50%) translateY(0) scale(1.1);
        }
        70% {
          opacity: 0.7;
        }
        100% {
          opacity: 0;
          transform: translateX(-50%) translateY(-36px) scale(0.85);
        }
      }

      /* Lives Container */
      .hud-lives-container {
        display: flex;
        gap: 3px;
      }
      .hud-heart {
        width: 13px;
        height: 13px;
        fill: #ff6b6b;
        transition: transform 0.15s ease, opacity 0.2s ease;
      }
      .hud-heart.lost {
        fill: none;
        stroke: rgba(255,107,107,0.3);
        stroke-width: 2;
        opacity: 0.5;
      }
      .hud-heart.shake-loss {
        animation: shakeHeart 0.35s ease-out;
      }
      @keyframes shakeHeart {
        0%, 100% { transform: translateX(0); }
        15% { transform: translateX(-3px) rotate(-8deg); }
        30% { transform: translateX(2px) rotate(6deg); }
        45% { transform: translateX(-2px) rotate(-4deg); }
        60% { transform: translateX(1px) rotate(2deg); }
      }

      /* Combo Badge */
      .hud-combo-badge {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: 800;
        color: var(--accent);
        margin-top: 1px;
        opacity: 0;
        transform: translateX(12px);
        transition: opacity 0.2s ease, transform 0.2s ease;
        text-shadow: 0 0 6px rgba(${accentRgb}, 0.4);
      }
      .hud-combo-badge.active {
        opacity: 1;
        transform: translateX(0);
      }
      .hud-combo-badge.pulse {
        animation: comboPulse 0.6s ease;
      }
      @keyframes comboPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); text-shadow: 0 0 12px rgba(${accentRgb}, 0.6); }
      }

      /* Best Score display */
      .hud-best-display {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: rgba(255,255,255,0.35);
        margin-right: 10px;
        letter-spacing: 0.5px;
      }
      .hud-best-display strong {
        color: rgba(255,255,255,0.6);
        font-weight: 700;
      }

      /* Pause Button */
      .hud-pause-btn {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 6px;
        padding: 5px;
        margin-left: 6px;
        cursor: pointer;
        color: rgba(255,255,255,0.5);
        display: flex;
        align-items: center;
        transition: all 0.15s ease;
      }
      .hud-pause-btn:hover {
        background: rgba(255,255,255,0.08);
        color: #fff;
        border-color: rgba(255,255,255,0.15);
      }

      /* Timer Bar */
      .hud-timer-bar {
        position: absolute;
        top: 0;
        left: 0;
        height: 3px;
        background: linear-gradient(90deg, var(--accent), rgba(${accentRgb}, 0.6));
        width: 100%;
        transition: width 0.1s linear, height 0.2s ease, background-color 0.2s;
        border-radius: 0 0 2px 0;
      }
      .hud-timer-bar.critical {
        height: 4px;
        background: linear-gradient(90deg, #ef4444, #f97316);
        box-shadow: 0 0 8px rgba(239,68,68,0.5);
        animation: pulseTimer 0.5s infinite alternate;
      }
      @keyframes pulseTimer {
        from { opacity: 0.7; box-shadow: 0 0 4px rgba(239,68,68,0.3); }
        to { opacity: 1; box-shadow: 0 0 12px rgba(239,68,68,0.6); }
      }

      /* ═══════════════════════════════════════════ */
      /* Layer 2: INSTRUCTION ATTRACT SCREEN        */
      /* ═══════════════════════════════════════════ */
      .instruction-layer {
        z-index: 20;
        background: rgba(10, 10, 15, 0.96);
        border: 1px solid transparent;
        animation: instrGlow 3s ease-in-out infinite alternate;
      }
      @keyframes instrGlow {
        0% { border-color: rgba(${accentRgb}, 0.03); }
        100% { border-color: rgba(${accentRgb}, 0.12); }
      }
      .instr-logo {
        font-size: 56px;
        margin-bottom: 12px;
        animation: instrIconFloat 3s ease-in-out infinite;
      }
      @keyframes instrIconFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      .instr-title {
        font-family: 'Press Start 2P', monospace;
        font-size: 20px;
        color: #fff;
        text-transform: uppercase;
        margin-bottom: 8px;
        text-align: center;
      }
      .instr-objective {
        font-size: 14px;
        color: #8888a8;
        max-width: 420px;
        text-align: center;
        line-height: 1.5;
        margin-bottom: 30px;
      }
      .instr-keys-container {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 40px;
        width: 100%;
        max-width: 320px;
      }
      .keycap-row {
        display: flex;
        align-items: center;
        gap: 16px;
        width: 100%;
      }
      .keycap-box {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 36px;
        height: 36px;
        padding: 0 8px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-bottom-width: 3px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.04);
        color: #fff;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        font-weight: bold;
        box-sizing: border-box;
        box-shadow: inset 0 -1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .keycap-box:hover {
        transform: translateY(-1px);
        box-shadow: inset 0 -1px 2px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.3);
      }
      .keycap-action {
        font-size: 14px;
        color: #b8b8d0;
      }
      .instr-start-prompt {
        font-family: 'Press Start 2P', monospace;
        font-size: 13px;
        color: var(--accent);
        animation: pulseFloat 2s infinite ease-in-out;
        letter-spacing: 1px;
        text-align: center;
        cursor: pointer;
        text-shadow: 0 0 10px rgba(${accentRgb}, 0.3);
      }
      @keyframes pulseFloat {
        0%, 100% { opacity: 1; transform: translateY(0); }
        50% { opacity: 0.4; transform: translateY(-4px); }
      }

      /* ═══════════════════════════════════════════ */
      /* Layer 3: PAUSE OVERLAY                     */
      /* ═══════════════════════════════════════════ */
      .pause-layer {
        z-index: 30;
        background: radial-gradient(ellipse at center, rgba(10,10,15,0.5) 0%, rgba(10,10,15,0.75) 100%);
      }
      .pause-card {
        background: rgba(16, 16, 22, 0.92);
        border: 1px solid rgba(${accentRgb}, 0.12);
        border-radius: 14px;
        padding: 28px 32px;
        width: 90%;
        max-width: 340px;
        text-align: center;
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        transform: translateY(-20px) scale(0.97);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s;
        box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(${accentRgb}, 0.06), inset 0 1px 0 rgba(255,255,255,0.04);
      }
      .pause-layer.active .pause-card {
        transform: translateY(0) scale(1);
      }
      .pause-header-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .pause-icon {
        font-size: 24px;
      }
      .pause-title {
        font-family: 'Press Start 2P', monospace;
        font-size: 18px;
        letter-spacing: 1px;
        color: var(--accent);
      }
      .pause-divider {
        height: 2px;
        background: linear-gradient(90deg, transparent, rgba(${accentRgb}, 0.5), transparent);
        width: 100%;
        margin: 12px auto 16px auto;
      }
      .pause-score {
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        color: rgba(255,255,255,0.5);
        margin-bottom: 20px;
        letter-spacing: 1px;
      }
      .pause-btn-stack {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 16px;
      }
      .container-btn {
        width: 100%;
        height: 42px;
        border-radius: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
        box-sizing: border-box;
        letter-spacing: 0.5px;
      }
      .container-btn-primary {
        background: linear-gradient(135deg, var(--accent), rgba(${accentRgb}, 0.7));
        color: #fff;
        box-shadow: 0 4px 12px rgba(${accentRgb}, 0.25);
      }
      .container-btn-primary:hover {
        filter: brightness(1.15);
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(${accentRgb}, 0.35);
      }
      .container-btn-secondary {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.1);
        color: #b8b8d0;
      }
      .container-btn-secondary:hover {
        background: rgba(255,255,255,0.07);
        color: #fff;
        border-color: rgba(255,255,255,0.2);
      }
      .container-btn-danger {
        background: transparent;
        border: 1px solid rgba(239, 68, 68, 0.25);
        color: rgba(239,68,68,0.8);
      }
      .container-btn-danger:hover {
        background: rgba(239, 68, 68, 0.08);
        color: #ef4444;
        border-color: rgba(239,68,68,0.4);
      }
      .pause-reminders {
        font-size: 10px;
        color: rgba(255,255,255,0.2);
        letter-spacing: 0.5px;
      }

      /* ═══════════════════════════════════════════ */
      /* Layer 4: GAME OVER                         */
      /* ═══════════════════════════════════════════ */
      .gameover-layer {
        z-index: 40;
        background: rgba(6, 6, 8, 0.97);
      }
      .go-title {
        font-family: 'Press Start 2P', monospace;
        font-size: 24px;
        color: #fff;
        margin-bottom: 20px;
        transform: translateY(-40px);
        transition: transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        letter-spacing: 2px;
      }
      .gameover-layer.active .go-title {
        transform: translateY(0);
      }
      .go-score-wrap {
        position: relative;
        text-align: center;
        margin-bottom: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .go-score-label {
        font-size: 10px;
        font-family: 'JetBrains Mono', monospace;
        color: rgba(${accentRgb}, 0.5);
        letter-spacing: 3px;
        margin-bottom: 6px;
        font-weight: 700;
      }
      .go-score-number {
        font-family: 'JetBrains Mono', monospace;
        font-size: 58px;
        font-weight: bold;
        color: #fff;
        line-height: 1;
        text-shadow: 0 0 20px rgba(${accentRgb}, 0.15);
      }
      .go-record-badge {
        position: absolute;
        top: -8px;
        right: -75px;
        background: linear-gradient(135deg, #f59e0b, #fbbf24);
        color: #000;
        padding: 4px 10px;
        border-radius: 6px;
        font-family: 'Press Start 2P', monospace;
        font-size: 7px;
        font-weight: bold;
        letter-spacing: 1px;
        animation: scalePop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow: 0 4px 12px rgba(245,158,11,0.3);
      }
      @keyframes scalePop {
        from { transform: scale(0) rotate(-8deg); }
        to { transform: scale(1) rotate(0); }
      }
      .go-best-score {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: rgba(255,255,255,0.3);
        margin-bottom: 24px;
        letter-spacing: 1px;
      }
      .go-breakdown {
        width: 100%;
        max-width: 320px;
        border-top: 1px solid rgba(255,255,255,0.05);
        padding-top: 14px;
        margin-bottom: 20px;
      }
      .go-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        color: #b8b8d0;
        margin-bottom: 8px;
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 0.25s, transform 0.25s;
      }
      .go-row.animate {
        opacity: 1;
        transform: translateY(0);
      }
      .go-row-label {
        color: rgba(255,255,255,0.4);
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .go-row-label-icon {
        font-size: 12px;
        opacity: 0.7;
      }
      .go-funstat {
        font-size: 12px;
        font-style: italic;
        color: rgba(255,255,255,0.4);
        margin-bottom: 20px;
        text-align: center;
        max-width: 320px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      /* Sparkline mini-chart */
      .go-sparkline-wrap {
        width: 100%;
        max-width: 320px;
        height: 36px;
        margin-bottom: 16px;
        position: relative;
        border-radius: 6px;
        overflow: hidden;
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.04);
      }
      .go-sparkline-canvas {
        width: 100%;
        height: 100%;
      }
      .go-sparkline-label {
        position: absolute;
        top: 3px;
        right: 6px;
        font-size: 8px;
        font-family: 'JetBrains Mono', monospace;
        color: rgba(255,255,255,0.2);
        letter-spacing: 1px;
      }

      .go-coins {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
        border: 1px solid rgba(245, 158, 11, 0.2);
        border-radius: 10px;
        padding: 6px 16px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 28px;
        transform: scale(0);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow: 0 0 10px rgba(245,158,11,0.1);
      }
      .gameover-layer.active .go-coins {
        transform: scale(1);
      }
      .go-btn-row {
        display: flex;
        gap: 12px;
        width: 100%;
        max-width: 320px;
      }

      /* ═══════════════════════════════════════════ */
      /* Layer 5: LOADING                           */
      /* ═══════════════════════════════════════════ */
      .loading-layer {
        z-index: 50;
        background: #0a0a0f;
      }
      .load-icon {
        font-size: 40px;
        margin-bottom: 16px;
        animation: instrIconFloat 2s ease-in-out infinite;
      }
      .load-name {
        font-family: 'Press Start 2P', monospace;
        font-size: 18px;
        color: #fff;
        margin-bottom: 20px;
        text-transform: uppercase;
        letter-spacing: 1px;
        animation: fadeIn 0.4s;
      }
      .load-bar-bg {
        width: 180px;
        height: 4px;
        background: rgba(255,255,255,0.05);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 12px;
      }
      .load-bar-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, var(--accent), rgba(${accentRgb}, 0.5));
        transition: width 0.15s ease;
        border-radius: 2px;
      }
      .load-status {
        font-size: 11px;
        font-family: 'JetBrains Mono', monospace;
        color: rgba(255,255,255,0.3);
        letter-spacing: 0.5px;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      /* ═══════════════════════════════════════════ */
      /* Layer: ERROR                               */
      /* ═══════════════════════════════════════════ */
      .error-layer {
        z-index: 60;
        background: #0a0a0f;
      }
      .error-icon {
        font-size: 48px;
        color: #ef4444;
        margin-bottom: 16px;
      }
      .error-title {
        font-family: 'Press Start 2P', monospace;
        font-size: 14px;
        color: #fff;
        margin-bottom: 12px;
        text-transform: uppercase;
        text-align: center;
      }
      .error-desc {
        font-size: 13px;
        color: #8888a8;
        max-width: 320px;
        text-align: center;
        line-height: 1.5;
        margin-bottom: 30px;
      }

      /* Particle Canvas overlay on GameOver */
      .particle-canvas {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 45;
      }

      /* ═══════════════════════════════════════════ */
      /* CONTEXTUAL SIDEBAR (Wide screens ≥1100px)  */
      /* ═══════════════════════════════════════════ */
      .gc-sidebar {
        position: absolute;
        top: 42px;
        right: 0;
        bottom: 0;
        width: 0;
        background: rgba(8,8,12,0.9);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-left: 1px solid rgba(255,255,255,0.04);
        z-index: 8;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: opacity 0.25s ease;
        opacity: 0;
        pointer-events: none;
      }
      .gc-sidebar.active {
        opacity: 1;
        pointer-events: auto;
      }
      .gc-sidebar.dimmed {
        opacity: 0.25;
      }
      @media (min-width: 1100px) {
        .gc-sidebar {
          width: 200px;
        }
      }
      .sidebar-section {
        padding: 14px 14px 10px 14px;
        border-bottom: 1px solid rgba(255,255,255,0.04);
      }
      .sidebar-section-title {
        font-family: 'JetBrains Mono', monospace;
        font-size: 8px;
        color: rgba(${accentRgb}, 0.5);
        letter-spacing: 2px;
        font-weight: 800;
        margin-bottom: 8px;
        text-transform: uppercase;
      }
      .sidebar-stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        font-size: 11px;
      }
      .sidebar-stat-label {
        color: rgba(255,255,255,0.3);
      }
      .sidebar-stat-value {
        font-family: 'JetBrains Mono', monospace;
        font-weight: 700;
        color: rgba(255,255,255,0.7);
        font-size: 12px;
      }
      .sidebar-tip-text {
        font-size: 11px;
        color: rgba(255,255,255,0.35);
        line-height: 1.45;
        font-style: italic;
        transition: opacity 0.4s ease;
        min-height: 40px;
      }
    `;
    this.mountPoint.appendChild(styleEl);

    // Apply Accent color custom properties
    this.mountPoint.style.setProperty('--accent', accent);

    // --- Build DOM Elements ---

    // Layer 0: Canvas
    this.canvasWrap = document.createElement('div');
    this.canvasWrap.className = 'canvas-layer';
    this.canvas = document.createElement('canvas');
    this.canvasWrap.appendChild(this.canvas);
    this.mountPoint.appendChild(this.canvasWrap);

    // Layer 1: HUD
    this.hudLayer = document.createElement('div');
    this.hudLayer.className = 'container-layer hud-layer';
    
    const hasTimer = this.manifest.estimatedDuration !== undefined;
    this.hudLayer.innerHTML = `
      ${hasTimer ? `<div class="hud-timer-bar" id="hud-timer-bar"></div>` : ''}
      <div class="hud-side">
        <span style="font-size: 16px;">${this.manifest.icon || '🎮'}</span>
        <span class="hud-game-name">${this.manifest.name}</span>
      </div>
      <div class="hud-center">
        <span class="hud-score-label">SCORE</span>
        <span class="hud-score-value" id="hud-score-val">0</span>
        <span class="hud-combo-badge" id="hud-combo-badge"></span>
        <div class="hud-float-container" id="hud-float-container"></div>
      </div>
      <div class="hud-side" style="justify-content: flex-end;">
        <span class="hud-best-display">BEST <strong id="hud-best-val">0</strong></span>
        <div class="hud-lives-container" id="hud-lives"></div>
        <button class="hud-pause-btn" id="hud-pause-btn" title="Pause [P]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="14" y="4" width="4" height="16" rx="1"></rect><rect x="6" y="4" width="4" height="16" rx="1"></rect>
          </svg>
        </button>
      </div>
    `;
    this.mountPoint.appendChild(this.hudLayer);

    // Bind HUD pause button
    this.hudLayer.querySelector('#hud-pause-btn').addEventListener('click', () => {
      if (this.state === 'PLAYING') this.pause();
    });

    // Contextual Sidebar
    this.sidebarEl = document.createElement('div');
    this.sidebarEl.className = 'gc-sidebar';
    this.sidebarEl.innerHTML = `
      <div class="sidebar-section">
        <div class="sidebar-section-title">LIVE STATS</div>
        <div class="sidebar-stat-row">
          <span class="sidebar-stat-label">Score</span>
          <span class="sidebar-stat-value" id="sb-score">0</span>
        </div>
        <div class="sidebar-stat-row">
          <span class="sidebar-stat-label">Best</span>
          <span class="sidebar-stat-value" id="sb-best">0</span>
        </div>
        <div class="sidebar-stat-row">
          <span class="sidebar-stat-label">Session</span>
          <span class="sidebar-stat-value" id="sb-session">0:00</span>
        </div>
        <div class="sidebar-stat-row">
          <span class="sidebar-stat-label">Lives</span>
          <span class="sidebar-stat-value" id="sb-lives">♥♥♥</span>
        </div>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-title">💡 TIP</div>
        <div class="sidebar-tip-text" id="sb-tip">Loading tips...</div>
      </div>
    `;
    this.mountPoint.appendChild(this.sidebarEl);

    // Setup tip rotation
    this._tipIndex = 0;
    this._tipTexts = this._generateTips();

    // Layer 2: Instruction Attraction Screen
    this.instructionLayer = document.createElement('div');
    this.instructionLayer.className = 'container-layer instruction-layer';
    
    // Construct control physical keycaps
    const keycapsList = (this.manifest.controls || []).map(ctrl => {
      const keys = ctrl.key.split(' ');
      const caps = keys.map(k => `<div class="keycap-box">${k}</div>`).join('<span style="color:rgba(255,255,255,0.2); font-size:12px; margin:0 2px;">/</span>');
      return `
        <div class="keycap-row">
          <div style="display:flex; align-items:center; gap:4px;">${caps}</div>
          <span class="keycap-action">${ctrl.action}</span>
        </div>
      `;
    }).join('');

    this.instructionLayer.innerHTML = `
      <div class="instr-logo">${this.manifest.icon || '🎮'}</div>
      <h2 class="instr-title">${this.manifest.name}</h2>
      <p class="instr-objective">${this.manifest.howToPlay || this.manifest.description}</p>
      <div class="instr-keys-container">
        ${keycapsList}
      </div>
      <div class="instr-start-prompt" id="instr-start-prompt">
        PRESS SPACE TO START
      </div>
    `;
    this.mountPoint.appendChild(this.instructionLayer);

    // Click/tap instruction to start
    this.instructionLayer.querySelector('#instr-start-prompt').addEventListener('click', () => {
      if (this.state === 'READY') this.start();
    });

    // Layer 3: Pause
    this.pauseLayer = document.createElement('div');
    this.pauseLayer.className = 'container-layer pause-layer';
    this.pauseLayer.innerHTML = `
      <div class="pause-card">
        <div class="pause-header-row">
          <span class="pause-icon">${this.manifest.icon || '🎮'}</span>
          <h2 class="pause-title">PAUSED</h2>
        </div>
        <div class="pause-divider"></div>
        <div class="pause-score" id="pause-score-val">SCORE: 0</div>
        <div class="pause-btn-stack">
          <button class="container-btn container-btn-primary" id="pause-resume-btn">RESUME [P]</button>
          <button class="container-btn container-btn-secondary" id="pause-restart-btn">RESTART [R]</button>
          <button class="container-btn container-btn-danger" id="pause-quit-btn">QUIT TO GAMES [ESC]</button>
        </div>
        <div class="pause-reminders">
          P = Resume · R = Restart · ESC = Quit
        </div>
      </div>
    `;
    this.mountPoint.appendChild(this.pauseLayer);

    // Bind pause actions
    this.pauseLayer.querySelector('#pause-resume-btn').addEventListener('click', () => this.resume());
    this.pauseLayer.querySelector('#pause-restart-btn').addEventListener('click', () => {
      this.destroyGameInstance();
      this.transitionTo('LOADING');
      this.initiateGameLaunch();
    });
    this.pauseLayer.querySelector('#pause-quit-btn').addEventListener('click', () => {
      if (confirm('Quit back to library? Progress will be lost.')) {
        this.destroy();
      }
    });

    // Layer 4: GameOver
    this.gameoverLayer = document.createElement('div');
    this.gameoverLayer.className = 'container-layer gameover-layer';
    this.gameoverLayer.innerHTML = `
      <h2 class="go-title">GAME OVER</h2>
      <div class="go-score-wrap">
        <div class="go-score-label">YOUR SCORE</div>
        <div class="go-score-number" id="go-score-val">0</div>
        <div class="go-record-badge" id="go-record-badge" style="display:none;">NEW RECORD!</div>
      </div>
      <div class="go-best-score" id="go-best-val">PERSONAL BEST: 0</div>
      
      <div class="go-sparkline-wrap" id="go-sparkline-wrap" style="display:none;">
        <canvas class="go-sparkline-canvas" id="go-sparkline-canvas"></canvas>
        <span class="go-sparkline-label">SCORE HISTORY</span>
      </div>
      
      <div class="go-breakdown" id="go-breakdown-container"></div>
      
      <div class="go-funstat" id="go-funstat-container"></div>
      
      <div class="go-coins" id="go-coins-badge">+0 AP</div>
      
      <div class="go-btn-row">
        <button class="container-btn container-btn-primary" id="go-retry-btn">RETRY [R]</button>
        <button class="container-btn container-btn-secondary" id="go-back-btn">BACK [ESC]</button>
      </div>
    `;
    this.mountPoint.appendChild(this.gameoverLayer);

    // Bind gameover actions
    this.gameoverLayer.querySelector('#go-retry-btn').addEventListener('click', () => {
      this.transitionTo('LOADING');
      this.initiateGameLaunch();
    });
    this.gameoverLayer.querySelector('#go-back-btn').addEventListener('click', () => {
      this.destroy();
    });

    // Special GameOver particle canvas
    this.particleCanvas = document.createElement('canvas');
    this.particleCanvas.className = 'particle-canvas';
    this.gameoverLayer.appendChild(this.particleCanvas);
    this.particleCtx = this.particleCanvas.getContext('2d');

    // Layer 5: Loading
    this.loadingLayer = document.createElement('div');
    this.loadingLayer.className = 'container-layer loading-layer';
    this.loadingLayer.innerHTML = `
      <div class="load-icon">${this.manifest.icon || '🎮'}</div>
      <h2 class="load-name">${this.manifest.name}</h2>
      <div class="load-bar-bg">
        <div class="load-bar-fill" id="load-bar-fill"></div>
      </div>
      <div class="load-status" id="load-status">Initializing...</div>
    `;
    this.mountPoint.appendChild(this.loadingLayer);

    // Error Layer
    this.errorLayer = document.createElement('div');
    this.errorLayer.className = 'container-layer error-layer';
    this.errorLayer.innerHTML = `
      <div class="error-icon">⚠️</div>
      <h2 class="error-title" id="error-title">LOAD FAILURE</h2>
      <p class="error-desc" id="error-desc">Could not load the game module.</p>
      <button class="container-btn container-btn-secondary" id="error-back-btn" style="max-width:200px;">BACK TO GAMES</button>
    `;
    this.mountPoint.appendChild(this.errorLayer);
    this.errorLayer.querySelector('#error-back-btn').addEventListener('click', () => this.destroy());

    // --- Register Listeners ---
    document.addEventListener('keydown', this._boundKeyDown);
    document.addEventListener('keyup', this._boundKeyUp);
    this.canvas.addEventListener('mousemove', this._boundMouseMove);
    this.canvas.addEventListener('mousedown', this._boundMouseDown);
    this.canvas.addEventListener('mouseup', this._boundMouseUp);
    window.addEventListener('resize', this._boundResize);
  }

  // --- Tip Generation from manifest ---
  _generateTips() {
    const tips = [];
    if (this.manifest.howToPlay) {
      // Split howToPlay into sentences
      const sentences = this.manifest.howToPlay.split(/\.\s+/).filter(s => s.length > 10);
      tips.push(...sentences.map(s => s.trim().replace(/\.$/, '') + '.'));
    }
    if (this.manifest.scoringExplanation) {
      tips.push(this.manifest.scoringExplanation);
    }
    tips.push('Continuous streaks build multipliers fast.');
    tips.push('Press P to pause anytime during gameplay.');
    tips.push('Higher difficulty = bigger score multipliers.');
    return tips;
  }

  // --- Tip Rotation ---
  _startTipRotation() {
    const tipEl = this.sidebarEl.querySelector('#sb-tip');
    if (!tipEl || this._tipTexts.length === 0) return;
    
    tipEl.textContent = this._tipTexts[0];
    this._tipRotationTimer = setInterval(() => {
      this._tipIndex = (this._tipIndex + 1) % this._tipTexts.length;
      tipEl.style.opacity = '0';
      setTimeout(() => {
        tipEl.textContent = this._tipTexts[this._tipIndex];
        tipEl.style.opacity = '1';
      }, 300);
    }, 6000);
  }

  _stopTipRotation() {
    if (this._tipRotationTimer) {
      clearInterval(this._tipRotationTimer);
      this._tipRotationTimer = null;
    }
  }

  // --- Hex to RGB utility ---
  _hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '108, 99, 255';
  }

  // --- Dynamic Overlay Active State Controllers ---
  updateOverlayStates() {
    // Canvas filtering (Pause blur)
    if (this.state === 'PAUSED') {
      this.canvas.style.filter = 'blur(6px) brightness(0.3)';
    } else if (this.state === 'GAMEOVER') {
      this.canvas.style.filter = 'blur(4px) brightness(0.2)';
    } else {
      this.canvas.style.filter = 'none';
    }

    // Toggle layer classes
    this.loadingLayer.classList.toggle('active', this.state === 'LOADING');
    this.instructionLayer.classList.toggle('active', this.state === 'READY');
    this.hudLayer.classList.toggle('active', ['PLAYING', 'PAUSED'].includes(this.state));
    this.pauseLayer.classList.toggle('active', this.state === 'PAUSED');
    this.gameoverLayer.classList.toggle('active', this.state === 'GAMEOVER');
    this.errorLayer.classList.toggle('active', this.state === 'ERROR');

    // Sidebar state
    const isWideEnough = window.innerWidth >= 1100;
    this.sidebarEl.classList.toggle('active', this.state === 'PLAYING' && isWideEnough);
    this.sidebarEl.classList.toggle('dimmed', ['PAUSED', 'GAMEOVER'].includes(this.state));

    // Focus canvas on play
    if (this.state === 'PLAYING') {
      this.canvas.focus();
    }
  }

  // --- Virtual Resolution & High DPI Canvas Sizing ---
  handleResize() {
    const parent = this.mountPoint;
    if (!parent) return;

    const w = this.logicalWidth;
    const h = this.logicalHeight;
    const targetRatio = w / h;
    
    const clientW = parent.clientWidth;
    const clientH = parent.clientHeight;

    // Account for sidebar width on wide screens
    const sidebarWidth = (window.innerWidth >= 1100) ? 200 : 0;
    const availableW = clientW - sidebarWidth;
    const currentRatio = availableW / clientH;

    let displayW, displayH;
    if (currentRatio > targetRatio) {
      // Bound by height
      displayH = clientH;
      displayW = clientH * targetRatio;
    } else {
      // Bound by width
      displayW = availableW;
      displayH = availableW / targetRatio;
    }

    // Canvas scaling
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    
    const ctx = this.canvas.getContext('2d');
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    // CSS size
    this.canvas.style.width = `${displayW}px`;
    this.canvas.style.height = `${displayH}px`;
    
    // Set particle canvas match sizing
    this.particleCanvas.width = clientW * dpr;
    this.particleCanvas.height = clientH * dpr;
    this.particleCtx.resetTransform();
    this.particleCtx.scale(dpr, dpr);

    // Notify game instance of resize event
    if (this.gameInstance && typeof this.gameInstance.onResize === 'function') {
      this.gameInstance.onResize(w, h);
    }

    // Update sidebar visibility
    this.updateOverlayStates();
  }

  // --- Sandboxed Input Listeners ---
  handleKeyDown(e) {
    if (this.state === 'IDLE' || this.state === 'LOADING') return;

    const key = e.key;
    const keyLower = key.toLowerCase();

    // Prevent default scroll behaviors for standard gaming keys
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(keyLower) && this.state === 'PLAYING') {
      e.preventDefault();
    }

    // State specific filtering
    if (this.state === 'PAUSED') {
      if (keyLower === 'p') {
        e.preventDefault();
        this.resume();
      }
      return; // block all others
    }

    if (this.state === 'GAMEOVER') {
      if (keyLower === 'r') {
        e.preventDefault();
        this.transitionTo('LOADING');
        this.initiateGameLaunch();
      } else if (key === 'Escape') {
        e.preventDefault();
        this.destroy();
      }
      return; // block all others
    }

    if (this.state === 'READY') {
      if (key === ' ' || key === 'Spacebar') {
        e.preventDefault();
        this.start();
      }
      return; // block all others
    }

    if (this.state === 'PLAYING') {
      if (keyLower === 'p') {
        e.preventDefault();
        this.pause();
        return;
      }
      if (key === 'Escape') {
        e.preventDefault();
        this.pause(); // Esc pauses
        return;
      }

      // Track keypress
      this.pressedKeys.add(keyLower);

      // Trigger bound callbacks
      if (this.keyCallbacks[keyLower]) {
        this.keyCallbacks[keyLower].forEach(cb => cb(e));
      }
      
      // Pass to game input hook if existing
      if (this.gameInstance && typeof this.gameInstance.onInput === 'function') {
        this.gameInstance.onInput(keyLower, e);
      }
    }
  }

  handleKeyUp(e) {
    if (this.state !== 'PLAYING') return;
    
    const keyLower = e.key.toLowerCase();
    this.pressedKeys.delete(keyLower);
  }

  handleMouseMove(e) {
    if (this.state !== 'PLAYING') return;

    const rect = this.canvas.getBoundingClientRect();
    const rx = (e.clientX - rect.left) / rect.width;
    const ry = (e.clientY - rect.top) / rect.height;

    this.mousePos.x = rx * this.logicalWidth;
    this.mousePos.y = ry * this.logicalHeight;
    
    if (this.gameInstance && typeof this.gameInstance.onMouseMove === 'function') {
      this.gameInstance.onMouseMove(this.mousePos.x, this.mousePos.y, e);
    }
  }

  handleMouseDown(e) {
    if (this.state === 'READY') {
      this.start();
      return;
    }
    if (this.state !== 'PLAYING') return;
    
    if (this.gameInstance && typeof this.gameInstance.onMouseDown === 'function') {
      this.gameInstance.onMouseDown(this.mousePos.x, this.mousePos.y, e);
    }
  }

  handleMouseUp(e) {
    if (this.state !== 'PLAYING') return;

    if (this.gameInstance && typeof this.gameInstance.onMouseUp === 'function') {
      this.gameInstance.onMouseUp(this.mousePos.x, this.mousePos.y, e);
    }
  }

  // --- Loader Simulation Animation & Launch ---
  async loadAndInstantiate() {
    this.transitionTo('LOADING');
    const bar = this.mountPoint.querySelector('#load-bar-fill');
    const status = this.mountPoint.querySelector('#load-status');

    // Progressive loading indicator states
    const stages = [
      { pct: '20%', text: 'Initializing...' },
      { pct: '60%', text: 'Loading game resources...' },
      { pct: '90%', text: 'Preparing canvas context...' },
      { pct: '100%', text: 'Ready!' }
    ];

    for (let stage of stages) {
      if (bar) bar.style.width = stage.pct;
      if (status) status.textContent = stage.text;
      await new Promise(resolve => setTimeout(resolve, 100)); // min 100ms per stage, total 400ms
    }

    try {
      this.handleResize(); // ensure canvas sizes match logical width
      
      // Instantiate
      this.gameInstance = new this.GameClass(this.canvas, this);
      
      // Cache records
      const record = Storage.get(this.manifest.id, { score: 0 });
      const best = typeof record === 'number' ? record : (record.score || 0);
      const elBest = this.hudLayer.querySelector('#hud-best-val');
      if (elBest) elBest.textContent = best.toLocaleString();

      // Sidebar best
      const sbBest = this.sidebarEl.querySelector('#sb-best');
      if (sbBest) sbBest.textContent = best.toLocaleString();

      // Initialize
      await this.gameInstance.init();

      // Apply difficulty configurations
      if (typeof this.gameInstance.onDifficultyApplied === 'function') {
        this.gameInstance.onDifficultyApplied(this.config);
      }

      // Reset score tracking
      this._lastDisplayedScore = 0;

      this.transitionTo('READY');
    } catch (err) {
      console.error("[GameContainer] Failed game class instantiation:", err);
      this.showError("INVALID_EXPORT_TYPE", "The game file failed to initialize.");
    }
  }

  initiateGameLaunch() {
    this.loadAndInstantiate();
  }

  showError(errCode, details) {
    this.transitionTo('ERROR');
    const titleEl = this.mountPoint.querySelector('#error-title');
    const descEl = this.mountPoint.querySelector('#error-desc');
    if (titleEl) titleEl.textContent = errCode.replace(/_/g, ' ');
    if (descEl) descEl.textContent = details || "An error occurred while running the game module.";
  }

  // --- HUD Updates (Premium) ---
  updateScore(scoreVal) {
    const el = this.hudLayer.querySelector('#hud-score-val');
    if (el) {
      // Calculate delta for floating text
      const delta = scoreVal - this._lastDisplayedScore;
      
      el.textContent = scoreVal.toLocaleString();
      
      // Apply bump animation
      el.classList.remove('bump');
      void el.offsetWidth; // force reflow to restart animation
      el.classList.add('bump');
      setTimeout(() => el.classList.remove('bump'), 140);

      // Spawn floating text if delta > 0
      if (delta > 0) {
        this._showFloatingScoreText(`+${delta}`);
      }
      
      this._lastDisplayedScore = scoreVal;
    }

    // Update sidebar score
    const sbScore = this.sidebarEl.querySelector('#sb-score');
    if (sbScore) sbScore.textContent = scoreVal.toLocaleString();
  }

  _showFloatingScoreText(text) {
    const container = this.hudLayer.querySelector('#hud-float-container');
    if (!container) return;

    const span = document.createElement('span');
    span.className = 'hud-float-text';
    span.textContent = text;
    container.appendChild(span);

    // Auto-remove after animation
    setTimeout(() => {
      if (span.parentNode) span.parentNode.removeChild(span);
    }, 580);
  }

  updateLives(livesVal) {
    const el = this.hudLayer.querySelector('#hud-lives');
    if (el) {
      let heartsHtml = '';
      for (let i = 0; i < 3; i++) {
        const lost = i >= livesVal ? 'lost' : '';
        // Add shake class if this heart just got lost
        const justLost = (i === livesVal) ? 'shake-loss' : '';
        heartsHtml += `
          <svg class="hud-heart ${lost} ${justLost}" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        `;
      }
      el.innerHTML = heartsHtml;
    }

    // Update sidebar lives
    const sbLives = this.sidebarEl.querySelector('#sb-lives');
    if (sbLives) {
      let hearts = '';
      for (let i = 0; i < 3; i++) {
        hearts += i < livesVal ? '♥' : '♡';
      }
      sbLives.textContent = hearts;
    }
  }

  updateTimerBar(percent, isUnder10s = false) {
    const el = this.hudLayer.querySelector('#hud-timer-bar');
    if (el) {
      el.style.width = `${percent * 100}%`;
      el.classList.toggle('critical', isUnder10s);
    }
  }

  updateComboMultiplier(mult) {
    const el = this.hudLayer.querySelector('#hud-combo-badge');
    if (el) {
      if (mult > 1) {
        el.textContent = `×${mult.toFixed(1)}`;
        el.classList.add('active');
        el.classList.remove('pulse');
        void el.offsetWidth;
        el.classList.add('pulse');
      } else {
        el.classList.remove('active');
      }
    }
  }

  // --- Session Timer for Sidebar ---
  _startSessionTimer() {
    this._sessionStartTime = performance.now();
    this._sidebarTimerInterval = setInterval(() => {
      if (this.state !== 'PLAYING') return;
      const elapsed = Math.floor((performance.now() - this._sessionStartTime) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      const sbSession = this.sidebarEl.querySelector('#sb-session');
      if (sbSession) sbSession.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
  }

  _stopSessionTimer() {
    if (this._sidebarTimerInterval) {
      clearInterval(this._sidebarTimerInterval);
      this._sidebarTimerInterval = null;
    }
  }

  // --- LifeCycle State Executions ---
  start() {
    if (this.state !== 'READY') return;
    this.transitionTo('PLAYING');
    this.lastTime = performance.now();
    this.fpsHistory = [];
    this.fpsWarningTriggered = false;
    this.lowFpsDuration = 0;
    this._startSessionTimer();
    this._startTipRotation();
    this.gameLoop();
  }

  pause() {
    if (this.state !== 'PLAYING') return;
    this.transitionTo('PAUSED');
    if (this.gameInstance && typeof this.gameInstance.onVisibilityHidden === 'function') {
      this.gameInstance.onVisibilityHidden();
    }
    // Freeze score on pause overlay
    const scoreVal = this.gameInstance ? this.gameInstance.score : 0;
    const elPauseScore = this.pauseLayer.querySelector('#pause-score-val');
    if (elPauseScore) elPauseScore.textContent = `SCORE: ${scoreVal.toLocaleString()}`;
  }

  resume() {
    if (this.state !== 'PAUSED') return;
    this.transitionTo('PLAYING');
    this.lastTime = performance.now();
    this.gameLoop();
  }

  endGame() {
    if (this.state !== 'PLAYING') return;
    this.transitionTo('GAMEOVER');
    this._stopSessionTimer();
    this._stopTipRotation();
    
    // Play sound
    this.audio.play('gameover');

    const score = this.gameInstance ? this.gameInstance.score : 0;

    // Load record history
    const record = Storage.get(this.manifest.id, { score: 0, runs: 0, history: [] });
    const oldBest = typeof record === 'number' ? record : (record.score || 0);
    const newBest = score >= oldBest;

    // Save statistics
    const newHistory = [...(record.history || [])];
    newHistory.push(score);
    const updatedRecord = {
      score: Math.max(oldBest, score),
      runs: (record.runs || 0) + 1,
      history: newHistory
    };
    Storage.set(this.manifest.id, updatedRecord);

    // Save runs count separately for compatibility
    Storage.set(`${this.manifest.id}_runs`, updatedRecord.runs);

    // Award AP Coins (10% of score, minimum 1 coin if score > 0)
    const coinsEarned = score > 0 ? Math.max(1, Math.floor(score / 10)) : 0;
    if (coinsEarned > 0 && window.awardCoins) {
      window.awardCoins(coinsEarned, `Completed ${this.manifest.name}`);
    }

    // Trigger score counter increment animation
    this.animateScoreCountUp(score, Math.max(oldBest, score), newBest);

    // Display coin badge
    const coinBadge = this.gameoverLayer.querySelector('#go-coins-badge');
    if (coinBadge) {
      coinBadge.textContent = `+${coinsEarned} AP`;
    }

    // Display score breakdown rows staggered
    const breakdown = this.gameInstance && typeof this.gameInstance.getScoreBreakdown === 'function'
      ? this.gameInstance.getScoreBreakdown()
      : [{ label: 'Score Accumulation', value: score }];
    
    this.renderStaggeredBreakdown(breakdown);

    // Fun facts
    const funFactContainer = this.gameoverLayer.querySelector('#go-funstat-container');
    if (funFactContainer) {
      if (this.gameInstance && typeof this.gameInstance.getFunStat === 'function') {
        funFactContainer.innerHTML = `<span style="font-size: 13px;">📊</span> ${this.gameInstance.getFunStat()}`;
      } else {
        funFactContainer.innerHTML = `<span style="font-size: 13px;">✨</span> Great effort in this run!`;
      }
    }

    // Render sparkline chart if enough history
    this.renderSparkline(newHistory);
  }

  // --- Sparkline Chart ---
  renderSparkline(history) {
    const wrap = this.gameoverLayer.querySelector('#go-sparkline-wrap');
    const canvas = this.gameoverLayer.querySelector('#go-sparkline-canvas');
    if (!wrap || !canvas || history.length < 2) {
      if (wrap) wrap.style.display = 'none';
      return;
    }

    wrap.style.display = 'block';
    const last10 = history.slice(-10);
    const maxVal = Math.max(...last10, 1);
    
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    const accent = this.manifest.accentColor || '#6c63ff';
    const padding = { top: 6, bottom: 4, left: 8, right: 8 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    // Draw area fill
    ctx.beginPath();
    last10.forEach((val, i) => {
      const x = padding.left + (i / (last10.length - 1)) * plotW;
      const y = padding.top + (1 - val / maxVal) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(padding.left + plotW, padding.top + plotH);
    ctx.lineTo(padding.left, padding.top + plotH);
    ctx.closePath();
    ctx.fillStyle = `rgba(${this._hexToRgb(accent)}, 0.08)`;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    last10.forEach((val, i) => {
      const x = padding.left + (i / (last10.length - 1)) * plotW;
      const y = padding.top + (1 - val / maxVal) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw dots
    last10.forEach((val, i) => {
      const x = padding.left + (i / (last10.length - 1)) * plotW;
      const y = padding.top + (1 - val / maxVal) * plotH;
      ctx.beginPath();
      ctx.arc(x, y, i === last10.length - 1 ? 3 : 2, 0, Math.PI * 2);
      ctx.fillStyle = i === last10.length - 1 ? accent : `rgba(${this._hexToRgb(accent)}, 0.5)`;
      ctx.fill();
    });
  }

  // --- Animations on Game Over ---
  animateScoreCountUp(finalScore, bestScore, isNewBest) {
    const el = this.gameoverLayer.querySelector('#go-score-val');
    const elBest = this.gameoverLayer.querySelector('#go-best-val');
    const badge = this.gameoverLayer.querySelector('#go-record-badge');
    
    if (elBest) elBest.textContent = `PERSONAL BEST: ${bestScore.toLocaleString()}`;
    if (badge) badge.style.display = isNewBest ? 'block' : 'none';

    let current = 0;
    const duration = 800; // ms
    const startTime = performance.now();

    const count = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // easeOutCubic curve
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      current = Math.floor(easeProgress * finalScore);

      if (el) el.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(count);
      } else {
        if (el) el.textContent = finalScore.toLocaleString();
        
        // Final flash with accent color
        const accent = this.manifest.accentColor || '#6c63ff';
        if (el) {
          el.style.transform = 'scale(1.08)';
          el.style.textShadow = `0 0 24px ${accent}`;
          setTimeout(() => {
            el.style.transform = 'scale(1)';
            el.style.textShadow = `0 0 20px rgba(${this._hexToRgb(accent)}, 0.15)`;
          }, 250);
        }

        if (isNewBest && finalScore > 0) {
          this.triggerParticleBurst();
        }
      }
    };
    requestAnimationFrame(count);
  }

  triggerParticleBurst() {
    const particles = [];
    const count = 30;
    const center = {
      x: this.mountPoint.clientWidth / 2,
      y: this.mountPoint.clientHeight / 2 - 40 // align roughly around score
    };

    // Color definitions using accent color
    const accent = this.manifest.accentColor || '#6c63ff';
    const colors = [accent, '#f59e0b', '#ffd700', '#fff', '#fbbf24'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      particles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // slightly floating up
        size: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0,
        decay: Math.random() * 0.03 + 0.015
      });
    }

    const animateParticles = () => {
      const c = this.particleCtx;
      c.clearRect(0, 0, this.mountPoint.clientWidth, this.mountPoint.clientHeight);
      
      let active = false;
      particles.forEach(p => {
        if (p.life > 0) {
          active = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05; // gravity
          p.life -= p.decay;

          c.beginPath();
          c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          c.fillStyle = p.color;
          c.globalAlpha = p.life;
          c.fill();
        }
      });
      c.globalAlpha = 1.0;

      if (active && this.state === 'GAMEOVER') {
        requestAnimationFrame(animateParticles);
      } else {
        c.clearRect(0, 0, this.mountPoint.clientWidth, this.mountPoint.clientHeight);
      }
    };
    animateParticles();
  }

  renderStaggeredBreakdown(rows) {
    const container = this.gameoverLayer.querySelector('#go-breakdown-container');
    if (!container) return;
    container.innerHTML = '';

    // Icon map for common row labels
    const iconMap = {
      'foods': '🍎', 'food': '🍎', 'eaten': '🍎',
      'speed': '⚡', 'bonus': '⭐', 'drift': '🏎️',
      'combo': '🔥', 'streak': '🔥', 'chain': '🔗',
      'time': '⏱️', 'timer': '⏱️', 'duration': '⏱️',
      'kills': '💥', 'hits': '🎯', 'accuracy': '🎯',
      'level': '📊', 'wave': '🌊', 'round': '🔄',
      'score': '🏆', 'points': '💎', 'coins': '🪙',
      'laps': '🏁', 'perfect': '✨', 'keys': '⌨️',
      'words': '📝', 'tiles': '🔲', 'blocks': '🧱',
      'bubbles': '🫧', 'orbs': '🔮', 'matches': '🎰',
      'moves': '♟️', 'taps': '👆', 'reactions': '⚡',
      'flips': '🔄', 'swipes': '👋'
    };

    const getIcon = (label) => {
      const lower = label.toLowerCase();
      for (const [key, icon] of Object.entries(iconMap)) {
        if (lower.includes(key)) return icon;
      }
      return '📌';
    };

    rows.forEach((row, index) => {
      const el = document.createElement('div');
      el.className = 'go-row';
      el.innerHTML = `
        <span class="go-row-label"><span class="go-row-label-icon">${getIcon(row.label)}</span>${row.label}</span>
        <span style="font-family:'JetBrains Mono',monospace; font-weight:bold;">${row.value}</span>
      `;
      container.appendChild(el);

      // Staggered reveal
      setTimeout(() => {
        el.classList.add('animate');
      }, 800 + index * 80); // trigger after score countup completes
    });
  }

  // --- High Frequency Game Loop ---
  gameLoop(time = performance.now()) {
    if (this.state !== 'PLAYING') return;

    let delta = time - this.lastTime;
    this.lastTime = time;

    // Performance monitor check - rolling FPS average
    const currentFps = delta > 0 ? 1000 / delta : 60;
    this.fpsHistory.push(currentFps);
    if (this.fpsHistory.length > 60) this.fpsHistory.shift();

    const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    // Monitor drop under 30 fps
    if (avgFps < 30) {
      this.lowFpsDuration += delta;
      if (this.lowFpsDuration > 5000 && !this.fpsWarningTriggered) {
        this.fpsWarningTriggered = true;
        console.warn(`[GameContainer] Performance drop detected: average FPS is ${avgFps.toFixed(1)}`);
        // Notify game if it implements performance tuning
        if (this.gameInstance && typeof this.gameInstance.onPerformanceWarning === 'function') {
          this.gameInstance.onPerformanceWarning();
        }
      }
    } else {
      this.lowFpsDuration = 0;
    }

    // Cap delta at 100ms to avoid teleporting physics explosions
    const cappedDelta = Math.min(100, delta);

    try {
      if (this.gameInstance) {
        this.gameInstance.frameCount++;
        
        // Update game state logic
        this.gameInstance.update(cappedDelta);

        // Draw canvas
        if (this.state === 'PLAYING') {
          const ctx = this.canvas.getContext('2d');
          this.gameInstance.render(ctx);
        }
      }
    } catch (err) {
      console.error("[GameContainer] Loop crash: ", err);
      this.showError("RUNTIME_CRASH", "A critical error occurred while drawing the frame.");
      this.destroyGameInstance();
      return;
    }

    this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  // --- Teardown & Cleansers ---
  destroyGameInstance() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.gameInstance) {
      try {
        if (typeof this.gameInstance.destroy === 'function') {
          this.gameInstance.destroy();
        }
      } catch (err) {
        console.warn("[GameContainer] Error during gameInstance.destroy():", err);
      }
      this.gameInstance = null;
    }
  }

  destroy() {
    this.destroyGameInstance();
    this._stopSessionTimer();
    this._stopTipRotation();
    this.transitionTo('IDLE');

    // Remove Event Listeners
    document.removeEventListener('keydown', this._boundKeyDown);
    document.removeEventListener('keyup', this._boundKeyUp);
    this.canvas.removeEventListener('mousemove', this._boundMouseMove);
    this.canvas.removeEventListener('mousedown', this._boundMouseDown);
    this.canvas.removeEventListener('mouseup', this._boundMouseUp);
    window.removeEventListener('resize', this._boundResize);

    // Notify modal wrapper to close container mounting context
    if (window.closeGameModal) {
      window.closeGameModal();
    }
  }
}
