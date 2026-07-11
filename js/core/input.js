/**
 * js/core/input.js
 * One object. One keydown listener. One keyup listener.
 */

class InputManager {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.mouse = { x: 0, y: 0, down: false, clicked: false };
    
    this.canvas = null;

    this._bindEvents();
  }

  setCanvas(canvasElement) {
    this.canvas = canvasElement;
  }

  _bindEvents() {
    const keysToPrevent = new Set([' ', 'Spacebar', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

    document.addEventListener('keydown', (e) => {
      if (keysToPrevent.has(e.key)) {
        e.preventDefault();
      }
      if (!this.held.has(e.key)) {
        this.pressed.add(e.key);
      }
      this.held.add(e.key);
    });

    document.addEventListener('keyup', (e) => {
      this.held.delete(e.key);
      this.released.add(e.key);
    });

    document.addEventListener('mousemove', (e) => {
      this._updateMousePos(e.clientX, e.clientY);
    });

    document.addEventListener('mousedown', (e) => {
      this.mouse.down = true;
      this.mouse.clicked = true;
      this._updateMousePos(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });

    // Touch events mapped to mouse
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.mouse.down = true;
        this.mouse.clicked = true;
        this._updateMousePos(e.touches[0].clientX, e.touches[0].clientY);
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this._updateMousePos(e.touches[0].clientX, e.touches[0].clientY);
      }
    });

    document.addEventListener('touchend', () => {
      this.mouse.down = false;
    });
  }

  _updateMousePos(clientX, clientY) {
    if (!this.canvas) {
      this.mouse.x = clientX;
      this.mouse.y = clientY;
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // logical width and height of canvas, which are W and H in GameBase
    const logicalW = this.canvas.width / dpr;
    const logicalH = this.canvas.height / dpr;

    this.mouse.x = ((clientX - rect.left) / rect.width) * logicalW;
    this.mouse.y = ((clientY - rect.top) / rect.height) * logicalH;
  }

  isHeld(key) {
    return this.held.has(key);
  }

  wasPressed(key) {
    return this.pressed.has(key);
  }

  isHeldAny(arr) {
    return arr.some(k => this.held.has(k));
  }

  wasPressedAny(arr) {
    return arr.some(k => this.pressed.has(k));
  }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.mouse.clicked = false;
  }
}

export const Input = new InputManager();
export default Input;
