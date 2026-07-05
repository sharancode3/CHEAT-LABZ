// js/ui/AdaptivePanel.js
// Adaptive right‑side panel for Challenge Mode
// Listens for custom events: 'game:start', 'game:pause', 'game:over', 'level:complete'
// Toggles between expanded (setup) and collapsed (focus) states and emits a canvas resize event.

export const AdaptivePanel = (function () {
  const PANEL_ID = 'adaptive-panel';
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.className = 'adaptive-panel expanded';
  // Placeholder content – games can inject their own UI later
  panel.innerHTML = `<div class="panel-content">Loading...</div>`;
  document.body.appendChild(panel);

  function setState(expanded) {
    panel.classList.toggle('expanded', expanded);
    panel.classList.toggle('collapsed', !expanded);
    // Notify canvas to resize
    window.dispatchEvent(new Event('canvas:resize'));
  }

  function init() {
    window.addEventListener('game:start', () => setState(false));
    window.addEventListener('game:pause', () => setState(true));
    window.addEventListener('game:over', () => setState(true));
    window.addEventListener('level:complete', () => setState(true));
  }

  // Auto‑init on load
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  return { init, setState, panel };
})();
