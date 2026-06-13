import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

function createOverlayShell(title, body, actions) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay fade-in';
  overlay.innerHTML = `
    <div class="overlay__panel panel">
      <div class="eyebrow">${title}</div>
      <div class="body-copy">${body}</div>
      <div class="button-row" data-actions></div>
    </div>
  `;

  const actionsRow = overlay.querySelector('[data-actions]');
  actions.forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = action.variant ? `button ${action.variant}` : 'button';
    button.textContent = action.label;
    button.addEventListener('click', action.onClick);
    actionsRow.appendChild(button);
  });

  return overlay;
}

export default class GameShell {
  constructor(canvasId, config = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.config = {
      name: 'unknown-game',
      title: 'Game',
      description: '',
      instructions: [],
      controls: [],
      width: this.canvas?.width || 0,
      height: this.canvas?.height || 0,
      ...config,
    };
    this.state = 'INSTRUCTIONS';
    this.score = 0;
    this.bestScore = Storage.getBestScore(this.config.name);
    this.lastFrame = 0;
    this.rafId = 0;
    this.sessionStart = 0;
    this.instructionsSeenKey = `instructions_seen_${this.config.name}`;
    this.unbindGameState = null;
    this.overlay = null;
    this.pauseReason = '';
  }

  mount() {
    if (!this.canvas) {
      throw new Error(`GameShell: canvas "${this.config.name}" not found.`);
    }

    this.canvas.setAttribute('aria-label', this.config.title);
    this.showInstructions();
    return this;
  }

  showInstructions() {
    this.removeOverlay();

    const hasSeenInstructions = Boolean(Storage.read(this.instructionsSeenKey, false));
    if (hasSeenInstructions) {
      this.start();
      return;
    }

    const lines = this.config.instructions.length > 0
      ? `<ul>${this.config.instructions.map((line) => `<li>${line}</li>`).join('')}</ul>`
      : '<p>Press space to begin.</p>';

    const controls = this.config.controls.length > 0
      ? `<div class="pill-row">${this.config.controls.map((control) => `<span class="badge">${control}</span>`).join('')}</div>`
      : '';

    this.overlay = createOverlayShell(
      this.config.title,
      `
        <p>${this.config.description || 'Get ready to play.'}</p>
        ${lines}
        ${controls}
        <p class="microcopy">Press space to start. This overlay appears on first play only.</p>
      `,
      [
        {
          label: 'Start',
          variant: 'button--primary',
          onClick: () => {
            Storage.write(this.instructionsSeenKey, true);
            this.start();
          },
        },
      ],
    );

    document.body.appendChild(this.overlay);
  }

  start() {
    this.removeOverlay();
    this.state = 'PLAYING';
    this.score = 0;
    this.sessionStart = performance.now();
    this.lastFrame = this.sessionStart;
    this.unbindGameState?.();
    this.unbindGameState = GameState.register((key, event) => this.handleKey?.(key, event));
    GameState.setActiveGame(this);
    this.loop(this.sessionStart);
  }

  pause(reason = 'manual') {
    if (this.state !== 'PLAYING') {
      return;
    }

    this.pauseReason = reason;
    this.state = 'PAUSED';
    this.stopLoop();
    this.renderPauseOverlay();
  }

  resume() {
    if (this.state !== 'PAUSED') {
      return;
    }

    this.removeOverlay();
    this.state = 'PLAYING';
    this.lastFrame = performance.now();
    this.loop(this.lastFrame);
  }

  gameOver(message = 'Game over') {
    this.state = 'GAMEOVER';
    this.stopLoop();
    this.saveBestScore();

    const overlayMessage = `${message}<br><span class="microcopy">Your score: ${Math.round(this.score)} · Best: ${Math.round(this.bestScore)}</span>`;
    this.overlay = createOverlayShell(
      this.config.title,
      overlayMessage,
      [
        {
          label: 'Retry',
          variant: 'button--primary',
          onClick: () => this.start(),
        },
        {
          label: 'Back to Games',
          variant: 'button--secondary',
          onClick: () => this.exit(),
        },
      ],
    );

    document.body.appendChild(this.overlay);
  }

  reset() {
    this.removeOverlay();
    this.state = 'INSTRUCTIONS';
    this.score = 0;
    this.showInstructions();
  }

  exit() {
    this.removeOverlay();
    this.stopLoop();
    this.state = 'INSTRUCTIONS';
    this.unbindGameState?.();
    GameState.clearActiveGame();
  }

  loop(timestamp) {
    if (this.state !== 'PLAYING') {
      return;
    }

    const deltaTime = Math.min(0.05, (timestamp - this.lastFrame) / 1000 || 0);
    this.lastFrame = timestamp;

    this.update?.(deltaTime, timestamp);
    this.render?.(this.ctx, deltaTime, timestamp);

    this.rafId = window.requestAnimationFrame((time) => this.loop(time));
  }

  stopLoop() {
    if (this.rafId) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  setScore(value) {
    this.score = Number(value) || 0;
    return this.score;
  }

  addScore(value) {
    this.score += Number(value) || 0;
    return this.score;
  }

  saveBestScore() {
    const nextBest = Math.max(this.bestScore, this.score);
    this.bestScore = nextBest;
    Storage.setBestScore(this.config.name, nextBest);
    return nextBest;
  }

  renderPauseOverlay() {
    this.removeOverlay();
    this.overlay = createOverlayShell(
      'Paused',
      this.pauseReason === 'visibility'
        ? 'The game paused while the tab was hidden.'
        : 'Press P to resume, restart, or exit to the game library.',
      [
        { label: 'Resume', variant: 'button--primary', onClick: () => this.resume() },
        { label: 'Restart', variant: 'button--secondary', onClick: () => this.start() },
        { label: 'Quit', variant: 'button--ghost', onClick: () => this.exit() },
      ],
    );

    document.body.appendChild(this.overlay);
  }

  removeOverlay() {
    if (this.overlay?.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }

    this.overlay = null;
  }

  handleKey(key) {
    if (key === 'p') {
      if (this.state === 'PLAYING') {
        this.pause();
      } else if (this.state === 'PAUSED') {
        this.resume();
      }
    }

    if (this.state === 'GAMEOVER' && key === 'r') {
      this.start();
    }

    if ((this.state === 'INSTRUCTIONS' || this.state === 'GAMEOVER') && key === ' ') {
      Storage.write(this.instructionsSeenKey, true);
      this.start();
    }
  }
}