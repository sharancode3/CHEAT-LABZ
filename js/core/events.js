/**
 * Global Keyboard Manager
 * Resolves keyboard conflicts by preventing default browser actions for game keys
 * when a game is currently active, and routes the key events to the active game.
 */

const GAME_KEYS = ['p', 'r', 'escape', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'];
// 'm' is a global key handled directly below

// Global GameState object to coordinate events
export const GameState = {
  isPlaying: false,
  activeGame: null,

  /**
   * Registers a game to receive keyboard events
   * @param {Object} gameInstance - The game instance (should extend GameShell)
   */
  registerGame(gameInstance) {
    this.activeGame = gameInstance;
    this.isPlaying = true;
  },

  /**
   * Unregisters the current game
   */
  unregisterGame() {
    this.activeGame = null;
    this.isPlaying = false;
  },

  /**
   * Dispatches the key event to the active game
   * @param {string} key - The key pressed
   * @param {KeyboardEvent} event - The full event object
   */
  dispatchKey(key, event) {
    if (this.activeGame && typeof this.activeGame.handleInput === 'function') {
      this.activeGame.handleInput(key, event);
    }
  },

  /**
   * Dispatches the keyup event to the active game
   * @param {string} key - The key released
   * @param {KeyboardEvent} event - The full event object
   */
  dispatchKeyUp(key, event) {
    if (this.activeGame && typeof this.activeGame.handleKeyUp === 'function') {
      this.activeGame.handleKeyUp(key, event);
    }
  }
};

document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  
  if (key === 'm') {
    if (window.Sound) {
      window.Sound.toggleMute();
      // Optional: Add a visual indicator
    }
    return;
  }

  if (GameState.isPlaying && GAME_KEYS.includes(key)) {
    e.preventDefault(); // Stop browser from doing anything like scrolling or refreshing
    GameState.dispatchKey(key, e); // Route to active game
  }
});

document.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (GameState.isPlaying && GAME_KEYS.includes(key)) {
    e.preventDefault();
    GameState.dispatchKeyUp(key, e);
  }
});

window.GameState = GameState;

// --- Mobile Controls ---
class MobileControls {
  constructor() {
    this.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    this.container = null;
    
    if (this.isTouch) {
      window.addEventListener('load', () => this.init());
      window.addEventListener('resize', () => this.checkVisibility());
    }
  }

  init() {
    this.container = document.createElement('div');
    this.container.id = 'mobile-controls';
    
    this.container.innerHTML = `
      <div class="dpad">
        <button class="m-btn m-up" data-key="arrowup">▲</button>
        <button class="m-btn m-left" data-key="arrowleft">◀</button>
        <button class="m-btn m-right" data-key="arrowright">▶</button>
        <button class="m-btn m-down" data-key="arrowdown">▼</button>
      </div>
      <div class="action-btns">
        <button class="m-btn m-b" data-key="escape">ESC</button>
        <button class="m-btn m-a" data-key=" ">SPACE</button>
      </div>
    `;

    document.body.appendChild(this.container);

    const buttons = this.container.querySelectorAll('.m-btn');
    buttons.forEach(btn => {
      const key = btn.dataset.key;
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn.classList.add('active');
        GameState.dispatchKey(key, { preventDefault: () => {} });
      });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        btn.classList.remove('active');
        GameState.dispatchKeyUp(key, { preventDefault: () => {} });
      });
    });

    this.checkVisibility();
  }

  checkVisibility() {
    if (window.innerWidth < 768 && document.getElementById('game-canvas')) {
      this.container.style.display = 'flex';
    } else {
      this.container.style.display = 'none';
    }
  }
}

new MobileControls();