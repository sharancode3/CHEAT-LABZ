export const GAME_KEYS = new Set([
  'p',
  'r',
  'escape',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
  ' ',
  'space',
  'w',
  'a',
  's',
  'd',
]);

function normalizeKey(event) {
  if (event.key === ' ') {
    return ' ';
  }

  return event.key.toLowerCase();
}

function createGameState() {
  return {
    isPlaying: false,
    activeGame: null,
    handlers: new Set(),
    lastKey: null,
    pauseBlocked: false,
    register(handler) {
      this.handlers.add(handler);
      return () => this.handlers.delete(handler);
    },
    setActiveGame(game) {
      this.activeGame = game || null;
      this.isPlaying = Boolean(game);
      this.pauseBlocked = Boolean(game?.arenaMode);
    },
    clearActiveGame() {
      this.activeGame = null;
      this.isPlaying = false;
      this.pauseBlocked = false;
    },
    dispatchKey(key, event) {
      this.lastKey = key;

      if (typeof this.activeGame?.handleKey === 'function') {
        this.activeGame.handleKey(key, event);
      }

      this.handlers.forEach((handler) => {
        handler(key, event, this.activeGame);
      });
    },
  };
}

export const GameState = createGameState();

function shouldBlockKey(key) {
  return GameState.isPlaying && GAME_KEYS.has(key);
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (event) => {
    const key = normalizeKey(event);

    if (!shouldBlockKey(key)) {
      return;
    }

    event.preventDefault();
    GameState.dispatchKey(key, event);
  }, true);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      return;
    }

    if (GameState.isPlaying && typeof GameState.activeGame?.pause === 'function' && !GameState.pauseBlocked) {
      GameState.activeGame.pause('visibility');
    }
  });
}

export function bindGame(gameShell) {
  GameState.setActiveGame(gameShell);
  return () => {
    if (GameState.activeGame === gameShell) {
      GameState.clearActiveGame();
    }
  };
}

export default GameState;