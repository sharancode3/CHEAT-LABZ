/**
 * js/engine/canvas-manager.js
 * The Rendering System
 */

export class CanvasManager {
  constructor(mountPoint) {
    this.mountPoint = mountPoint;
    
    // Ensure mount point is styled appropriately
    if (getComputedStyle(this.mountPoint).position === 'static') {
      this.mountPoint.style.position = 'relative';
    }
    this.mountPoint.style.overflow = 'hidden';

    // Game Canvas
    this.gameCanvas = document.createElement('canvas');
    this.gameCanvas.style.position = 'absolute';
    this.gameCanvas.style.top = '50%';
    this.gameCanvas.style.left = '50%';
    this.gameCanvas.style.transform = 'translate(-50%, -50%)';
    this.gameCanvas.style.zIndex = '0';
    
    // UI Canvas
    this.uiCanvas = document.createElement('canvas');
    this.uiCanvas.style.position = 'absolute';
    this.uiCanvas.style.top = '50%';
    this.uiCanvas.style.left = '50%';
    this.uiCanvas.style.transform = 'translate(-50%, -50%)';
    this.uiCanvas.style.zIndex = '1';

    // Overlay Div
    this.overlayDiv = document.createElement('div');
    this.overlayDiv.style.position = 'absolute';
    this.overlayDiv.style.top = '50%';
    this.overlayDiv.style.left = '50%';
    this.overlayDiv.style.transform = 'translate(-50%, -50%)';
    this.overlayDiv.style.zIndex = '2';
    this.overlayDiv.style.pointerEvents = 'none'; // let clicks pass through to canvas
    
    // Top Bar Div
    this.topBarDiv = document.createElement('div');
    this.topBarDiv.style.position = 'absolute';
    this.topBarDiv.style.top = '50%';
    this.topBarDiv.style.left = '50%';
    this.topBarDiv.style.transform = 'translate(-50%, -50%)';
    this.topBarDiv.style.zIndex = '3';
    this.topBarDiv.style.pointerEvents = 'none';

    this.mountPoint.appendChild(this.gameCanvas);
    this.mountPoint.appendChild(this.uiCanvas);
    this.mountPoint.appendChild(this.overlayDiv);
    this.mountPoint.appendChild(this.topBarDiv);

    this.gameCtx = this.gameCanvas.getContext('2d', { alpha: false });
    this.uiCtx = this.uiCanvas.getContext('2d');

    this.logicalWidth = 800;
    this.logicalHeight = 600;
    this.scale = 1;

    // Handle resize
    this.resizeObserver = new ResizeObserver(() => this._resize());
    this.resizeObserver.observe(this.mountPoint);
  }

  setup(logicalWidth, logicalHeight) {
    this.logicalWidth = logicalWidth;
    this.logicalHeight = logicalHeight;
    this._resize();
  }

  _resize() {
    const rect = this.mountPoint.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    const scaleX = containerWidth / this.logicalWidth;
    const scaleY = containerHeight / this.logicalHeight;
    this.scale = Math.min(scaleX, scaleY);

    const cssWidth = Math.floor(this.logicalWidth * this.scale);
    const cssHeight = Math.floor(this.logicalHeight * this.scale);

    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = cssWidth * dpr;
    const pixelHeight = cssHeight * dpr;

    [this.gameCanvas, this.uiCanvas].forEach(canvas => {
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    });
    
    [this.overlayDiv, this.topBarDiv].forEach(div => {
      div.style.width = `${cssWidth}px`;
      div.style.height = `${cssHeight}px`;
    });

    this.gameCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.uiCtx.setTransform(1, 0, 0, 1, 0, 0);
    
    this.gameCtx.scale(this.scale * dpr, this.scale * dpr);
    this.uiCtx.scale(this.scale * dpr, this.scale * dpr);
  }

  clearGame() {
    this.gameCtx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
  }

  clearUI() {
    this.uiCtx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
  }

  getLogicalCoordinates(pageX, pageY) {
    const rect = this.gameCanvas.getBoundingClientRect();
    
    // Mouse coords relative to canvas top-left
    const x = pageX - rect.left;
    const y = pageY - rect.top;
    
    return {
      x: x / this.scale,
      y: y / this.scale
    };
  }

  destroy() {
    this.resizeObserver.disconnect();
    this.gameCanvas.remove();
    this.uiCanvas.remove();
    this.overlayDiv.remove();
    this.topBarDiv.remove();
  }
}
