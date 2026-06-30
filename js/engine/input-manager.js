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
    window.addEventListener('keydown', (e) => {
      const key = this._normalizeKey(e.key);
      if (this.context === InputContext.GAME && this.gameKeys.has(key)) {
        e.preventDefault();
      }
      if (!this.nextKeys.has(key) || this.nextKeys.get(key) === KeyState.UP) {
        this.nextKeys.set(key, KeyState.PRESSED);
      }
    }, { passive: false });

    window.addEventListener('keyup', (e) => {
      const key = this._normalizeKey(e.key);
      this.nextKeys.set(key, KeyState.RELEASED);
    });

    window.addEventListener('mousemove', (e) => {
      const { x, y } = this.getLogicalCoordinates(e.clientX, e.clientY);
      this.mouse.x = x;
      this.mouse.y = y;
    });

    window.addEventListener('mousedown', (e) => {
      if (this.context === InputContext.GAME && e.button === 0) {
        this.mouse._nextDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouse._nextDown = false;
      }
    });

    // Touch Support
    let touchStartX = 0;
    let touchStartY = 0;

    window.addEventListener('touchstart', (e) => {
      if (this.context === InputContext.GAME) {
        e.preventDefault();
      }
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      
      const { x, y } = this.getLogicalCoordinates(touch.clientX, touch.clientY);
      this.mouse.x = x;
      this.mouse.y = y;
      this.mouse._nextDown = true;
      
      this.nextKeys.set('space', KeyState.PRESSED);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this.context === InputContext.GAME) e.preventDefault();
      const touch = e.touches[0];
      const { x, y } = this.getLogicalCoordinates(touch.clientX, touch.clientY);
      this.mouse.x = x;
      this.mouse.y = y;
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      if (this.context === InputContext.GAME) e.preventDefault();
      this.mouse._nextDown = false;
      this.nextKeys.set('space', KeyState.RELEASED);
      
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        if (Math.max(absDx, absDy) > 30) {
          if (absDx > absDy) {
            this.nextKeys.set(dx > 0 ? 'right' : 'left', KeyState.PRESSED);
            setTimeout(() => this.nextKeys.set(dx > 0 ? 'right' : 'left', KeyState.RELEASED), 50);
          } else {
            this.nextKeys.set(dy > 0 ? 'down' : 'up', KeyState.PRESSED);
            setTimeout(() => this.nextKeys.set(dy > 0 ? 'down' : 'up', KeyState.RELEASED), 50);
          }
        }
      }
    }, { passive: false });
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
