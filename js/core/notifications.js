// Premium Toast Notification System

class ToastSystem {
  constructor() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        display: flex;
        flex-direction: column-reverse;
        gap: 8px;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }

    // Append styles to head if not present
    if (!document.getElementById('toast-system-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-system-styles';
      style.textContent = `
        .toast-notification {
          position: relative;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 12px 16px 12px 24px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: var(--text-primary);
          max-width: 320px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          pointer-events: auto;
          opacity: 0;
          transform: translateX(110%);
          transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease;
        }
        .toast-notification.show {
          opacity: 1;
          transform: translateX(0);
        }
        .toast-notification.exit {
          transform: translateX(110%);
          opacity: 0;
          transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease;
        }
        .toast-accent {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          border-radius: 3px 0 0 3px;
        }
        .toast-accent.success { background: var(--success); }
        .toast-accent.error { background: var(--danger); }
        .toast-accent.info { background: var(--accent); }
        .toast-accent.warning { background: var(--gold); }
      `;
      document.head.appendChild(style);
    }
  }

  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    
    const accent = document.createElement('div');
    accent.className = `toast-accent ${type}`;
    toast.appendChild(accent);

    const textNode = document.createTextNode(message);
    toast.appendChild(textNode);

    this.container.appendChild(toast);

    // Force reflow and show
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto dismiss
    setTimeout(() => {
      toast.classList.add('exit');
      toast.addEventListener('transitionend', () => {
        toast.remove();
      });
    }, duration);
  }
}

let toastSystemInstance = null;

export function showToast(message, type = 'error', duration = 3000) {
  if (typeof document === 'undefined') return;
  if (!toastSystemInstance) {
    toastSystemInstance = new ToastSystem();
  }
  toastSystemInstance.show(message, type, duration);
}

// Global binding
if (typeof window !== 'undefined') {
  window.showToast = showToast;
}
