/**
 * js/engine/input-manager.js
 * The Authoritative Input System
 */

export const InputContext = {
  NONE: 'NONE',
  GAME: 'GAME',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER',
  MODAL: 'MODAL'
};

const KeyState = {
  UP: 0,
  PRESSED: 1,
  HELD: 2,
  RELEASED: 3
};

export class InputManager {
  constructor() {
    this.context = InputContext.NONE;
    this.keys = new Map();
    this.nextKeys = new Map(); // State changes pending for next frame
    
    this.mouse = {
      x: 0,
      y: 0,
      isDown: false,
      isClicked: false,
      isReleased: false,
      _nextDown: false
    };

    // Callback to get coordinate transformations (injected by canvas manager)
    this.getLogicalCoordinates = (pageX, pageY) => ({ x: pageX, y: pageY });

    this.gameKeys = new Set([
      'up', 'down', 'left', 'right', 'space', 'enter', 'escape',
      'w', 'a', 's', 'd', 'p', 'r', '1', '2', '3', '4', '5', '6', '7', '8', '9'
    ]);

    this._bindEvents();
  }

  _normalizeKey(key) {
    if (key === ' ') return 'space';
    if (key === 'ArrowUp') return 'up';
    if (key === 'ArrowDown') return 'down';
    if (key === 'ArrowLeft') return 'left';
    if (key === 'ArrowRight') return 'right';
    return key.toLowerCase();
  }

  _bindEvents() {
    // Removed orphaned event listeners for Phase 1 cleanup
  }


  setContext(newContext) {
    this.context = newContext;
    this.clearAll();
  }

  clearAll() {
    this.keys.clear();
    this.nextKeys.clear();
    this.mouse.isDown = false;
    this.mouse.isClicked = false;
    this.mouse.isReleased = false;
    this.mouse._nextDown = false;
  }

  update() {
    for (const [key, state] of this.keys.entries()) {
      if (state === KeyState.PRESSED) {
        this.keys.set(key, KeyState.HELD);
      } else if (state === KeyState.RELEASED) {
        this.keys.set(key, KeyState.UP);
      }
    }

    for (const [key, nextState] of this.nextKeys.entries()) {
      this.keys.set(key, nextState);
    }
    this.nextKeys.clear();

    const wasDown = this.mouse.isDown;
    const isDownNow = this.mouse._nextDown;

    this.mouse.isClicked = (!wasDown && isDownNow);
    this.mouse.isReleased = (wasDown && !isDownNow);
    this.mouse.isDown = isDownNow;
  }

  isPressed(key) {
    return this.keys.get(this._normalizeKey(key)) === KeyState.PRESSED;
  }

  isHeld(key) {
    const state = this.keys.get(this._normalizeKey(key));
    return state === KeyState.PRESSED || state === KeyState.HELD;
  }

  isReleased(key) {
    return this.keys.get(this._normalizeKey(key)) === KeyState.RELEASED;
  }
}
