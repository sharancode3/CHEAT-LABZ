/**
 * js/core/input-manager.js
 * The authoritative, single-source-of-truth Input System.
 * Games MUST poll this system each frame using the public API.
 */

class InputManagerClass {
  constructor() {
    this.heldKeys = new Set();
    this.justPressedKeys = new Set();
    this.justReleasedKeys = new Set();
    
    this.mousePosition = { x: 0, y: 0 };
    this.mouseButtons = { left: false, right: false, middle: false };
    this.mouseJustClicked = false;
    
    this.activeCanvas = null;

    this.ACTIONS = {
      UP:      ['ArrowUp', 'w', 'W'],
      DOWN:    ['ArrowDown', 's', 'S'],
      LEFT:    ['ArrowLeft', 'a', 'A'],
      RIGHT:   ['ArrowRight', 'd', 'D'],
      ACTION:  ['Space', ' '],
      PAUSE:   ['p', 'P', 'Escape'],
      CONFIRM: ['Enter', 'Space', ' ']
    };

    this._bindGlobalEvents();
  }

  /**
   * Called by the GameRunner to set the active canvas for coordinate mapping.
   */
  setActiveCanvas(canvas) {
    this.activeCanvas = canvas;
  }

  _bindGlobalEvents() {
    const keysToPrevent = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar']);

    document.addEventListener('keydown', (e) => {
      if (keysToPrevent.has(e.key)) {
        e.preventDefault();
      }
      
      const key = e.key;
      // If it wasn't already held, it's just pressed
      if (!this.heldKeys.has(key)) {
        this.justPressedKeys.add(key);
      }
      this.heldKeys.add(key);
    });

    document.addEventListener('keyup', (e) => {
      const key = e.key;
      this.heldKeys.delete(key);
      this.justReleasedKeys.add(key);
    });

    // Mouse Tracking
    document.addEventListener('mousemove', (e) => {
      this._updateMousePos(e.clientX, e.clientY);
    });

    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseButtons.left = true;
        this.mouseJustClicked = true;
      }
      this._updateMousePos(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouseButtons.left = false;
      }
    });

    // Touch Support (mapped to mouse)
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.mouseButtons.left = true;
        this.mouseJustClicked = true;
        this._updateMousePos(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this._updateMousePos(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      this.mouseButtons.left = false;
    });
  }

  _updateMousePos(clientX, clientY) {
    if (!this.activeCanvas) return;
    const rect = this.activeCanvas.getBoundingClientRect();
    
    // Fallback if canvas has no intrinsic dimensions defined
    const logicalWidth = this.activeCanvas.logicalWidth || this.activeCanvas.width;
    const logicalHeight = this.activeCanvas.logicalHeight || this.activeCanvas.height;

    const scaleX = logicalWidth / rect.width;
    const scaleY = logicalHeight / rect.height;

    this.mousePosition.x = (clientX - rect.left) * scaleX;
    this.mousePosition.y = (clientY - rect.top) * scaleY;
  }

  /**
   * Called by the GameRunner at the end of EVERY frame.
   */
  endFrame() {
    this.justPressedKeys.clear();
    this.justReleasedKeys.clear();
    this.mouseJustClicked = false;
  }

  // --- Public Polling API ---

  isHeld(key) {
    return this.heldKeys.has(key);
  }

  wasPressed(key) {
    return this.justPressedKeys.has(key);
  }

  wasReleased(key) {
    return this.justReleasedKeys.has(key);
  }

  isHeldAny(keysArray) {
    return keysArray.some(k => this.heldKeys.has(k));
  }

  wasPressedAny(keysArray) {
    return keysArray.some(k => this.justPressedKeys.has(k));
  }

  wasReleasedAny(keysArray) {
    return keysArray.some(k => this.justReleasedKeys.has(k));
  }

  getMousePos() {
    return { x: this.mousePosition.x, y: this.mousePosition.y };
  }

  isMouseHeld() {
    return this.mouseButtons.left;
  }

  wasMouseClicked() {
    return this.mouseJustClicked;
  }
}

export const InputManager = new InputManagerClass();
