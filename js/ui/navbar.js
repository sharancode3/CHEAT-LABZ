import { checkStreak, getStreak, getCoins, formatCoins, awardCoins } from '../core/storage.js';

export function initNavbar() {
  const mount = document.getElementById('navbar-mount');
  if (!mount) return;

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  
  // Try to load sound preference, default to true
  let soundEnabled = true;
  try {
    const saved = localStorage.getItem('cheatLabz_soundEnabled');
    if (saved !== null) soundEnabled = saved === 'true';
  } catch (e) {}

  mount.innerHTML = `
    <nav class="navbar">
      <div class="nav-container container">
        <a href="index.html" class="nav-logo font-display">CHEAT LABZ</a>
        <div class="nav-links">
          <a href="games.html" class="${currentPath === 'games.html' ? 'active' : ''}">GAMES</a>
          <a href="arena.html" class="${currentPath === 'arena.html' ? 'active' : ''}">ARENA</a>
          <a href="leaderboard.html" class="${currentPath === 'leaderboard.html' ? 'active' : ''}">LEADERBOARD</a>
        </div>
        
        <div style="display: flex; gap: 16px; align-items: center;">
          <div class="navbar-stats">
            <div class="streak-display" title="Daily streak">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-flame"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"></path></svg>
              <span id="streak-count">0</span>
            </div>
            <div class="coin-display" title="Arena Points">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-hexagon"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
              <span id="coin-count">0</span>
            </div>
          </div>
          <button id="settings-toggle" class="btn-icon" aria-label="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </button>
          <button id="sound-toggle" class="btn-icon" aria-label="Toggle Sound">
            ${soundEnabled ? 
              '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>' : 
              '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>'
            }
          </button>
          
          <button id="mobile-menu-btn" class="btn-icon mobile-only" aria-label="Menu">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
      </div>
    </nav>
    
    <div id="mobile-menu" class="mobile-menu-overlay" style="display:none;">
      <button class="close-menu-btn" id="close-menu-btn">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      <div class="mobile-nav-links font-display">
        <a href="index.html">HOME</a>
        <a href="games.html">GAMES</a>
        <a href="arena.html">ARENA</a>
        <a href="leaderboard.html">LEADERBOARD</a>
      </div>
    </div>

    <!-- Settings Modal -->
    <div id="settings-modal" class="hidden" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); z-index: 10000; display: flex; align-items: center; justify-content: center;">
      <div style="background: var(--bg-card); border: 1px solid var(--border-bright); padding: 32px; border-radius: 16px; width: 400px; max-width: 90vw;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 style="font-family: 'Press Start 2P', monospace; font-size: 16px; color: var(--accent-1);">SYSTEM SETTINGS</h2>
          <button id="close-settings" style="color: var(--text-muted); cursor: pointer; background: none; border: none; font-size: 24px;">×</button>
        </div>
        
        <div style="margin-bottom: 24px;">
          <label style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-muted); display: block; margin-bottom: 8px;">THEME</label>
          <select id="theme-select" style="width: 100%; padding: 12px; background: var(--bg-primary); border: 1px solid var(--border); color: #fff; border-radius: 8px; font-family: 'Inter', sans-serif;">
            <option value="default">Default Dark</option>
            <option value="neon">Neon Pink</option>
            <option value="matrix">Matrix Green</option>
          </select>
        </div>

        <div style="margin-bottom: 24px;">
          <label style="display: flex; align-items: center; gap: 12px; font-family: 'Inter', sans-serif; font-size: 14px; cursor: pointer;">
            <input type="checkbox" id="anim-toggle" checked style="width: 18px; height: 18px; accent-color: var(--accent-1);">
            Enable Background Animations (Particle Dust)
          </label>
        </div>
      </div>
    </div>
  `;

  // Apply Theme Logic
  const savedTheme = localStorage.getItem('cheatLabz_theme') || 'default';
  document.body.className = savedTheme === 'default' ? '' : 'theme-' + savedTheme;

  // Apply Animation Logic
  let animEnabled = localStorage.getItem('cheatLabz_animEnabled') !== 'false';
  window.animEnabled = animEnabled;

  // Apply sound to global object if it exists
  if (window.Sound) {
    window.Sound.enabled = soundEnabled;
  }

  // Sound Toggle Logic
  const soundBtn = document.getElementById('sound-toggle');
  soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    try {
      localStorage.setItem('cheatLabz_soundEnabled', soundEnabled);
    } catch(e){}
    
    if (window.Sound) {
      window.Sound.enabled = soundEnabled;
    }
    
    // Update Icon
    soundBtn.innerHTML = soundEnabled ? 
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>' : 
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
  });

  // Settings Modal Logic
  const settingsModal = document.getElementById('settings-modal');
  const themeSelect = document.getElementById('theme-select');
  const animCheckbox = document.getElementById('anim-toggle');
  
  if (themeSelect) themeSelect.value = savedTheme;
  if (animCheckbox) animCheckbox.checked = animEnabled;

  document.getElementById('settings-toggle')?.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
  });

  document.getElementById('close-settings')?.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  themeSelect?.addEventListener('change', (e) => {
    const val = e.target.value;
    localStorage.setItem('cheatLabz_theme', val);
    document.body.className = val === 'default' ? '' : 'theme-' + val;
  });

  animCheckbox?.addEventListener('change', (e) => {
    window.animEnabled = e.target.checked;
    localStorage.setItem('cheatLabz_animEnabled', e.target.checked);
  });

  // Mobile Menu Logic
  const mobileMenu = document.getElementById('mobile-menu');
  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    mobileMenu.style.display = 'flex';
  });
  document.getElementById('close-menu-btn')?.addEventListener('click', () => {
    mobileMenu.style.display = 'none';
  });

  // Page Transitions
  document.querySelectorAll('a').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('#') && !anchor.hasAttribute('target')) {
        e.preventDefault();
        document.body.style.animation = 'none';
        document.body.style.transition = 'opacity 150ms ease, transform 150ms ease';
        document.body.style.opacity = '0';
        document.body.style.transform = 'translateY(8px)';
        setTimeout(() => {
          window.location.href = href;
        }, 150);
      }
    });
  });

  // Run streak validation check
  checkStreak();

  // Populate stats counters
  const streakEl = document.getElementById('streak-count');
  const coinEl = document.getElementById('coin-count');
  if (streakEl) streakEl.textContent = getStreak().current;
  if (coinEl) coinEl.textContent = formatCoins(getCoins().total);

  // 1. Dynamic Footer Injection
  if (!document.querySelector('.global-footer')) {
    const footer = document.createElement('footer');
    footer.className = 'global-footer';
    footer.innerHTML = `
      <div>&copy; 2026 CHEAT LABZ. All systems operational.</div>
      <div class="footer-links">
        <a href="index.html" class="footer-link">Home</a>
        <a href="games.html" class="footer-link">Library</a>
        <a href="arena.html" class="footer-link">Arena</a>
        <a href="leaderboard.html" class="footer-link">Leaderboard</a>
        <a href="ideas.html" class="footer-link">Submit a Game Idea</a>
      </div>
    `;
    document.body.appendChild(footer);
  }

  // 2. Dynamic Quick Feedback Widget Injection
  if (!document.querySelector('.feedback-widget-container')) {
    const widget = document.createElement('div');
    widget.className = 'feedback-widget-container';
    widget.innerHTML = `
      <button class="feedback-btn" id="btn-feedback-trigger" title="Quick Feedback">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>
      <div class="feedback-popup" id="feedback-popup-box">
        <div class="feedback-header">
          <span>Quick Feedback</span>
          <button class="feedback-close" id="btn-feedback-close">&times;</button>
        </div>
        <div class="feedback-options">
          <button class="fb-opt" data-val="love">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            Love it
          </button>
          <button class="fb-opt" data-val="bug">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4M12 18v2M8 15h8"/></svg>
            Found a bug
          </button>
          <button class="fb-opt" data-val="idea">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffd93d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px;"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4"/></svg>
            Have an idea
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(widget);

    const trigger = document.getElementById('btn-feedback-trigger');
    const popup = document.getElementById('feedback-popup-box');
    const closeBtn = document.getElementById('btn-feedback-close');

    if (trigger && popup) {
      trigger.onclick = (e) => {
        e.stopPropagation();
        popup.classList.toggle('open');
      };
    }

    if (closeBtn && popup) {
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        popup.classList.remove('open');
      };
    }

    document.addEventListener('click', (e) => {
      if (popup && !widget.contains(e.target)) {
        popup.classList.remove('open');
      }
    });

    const options = widget.querySelectorAll('.fb-opt');
    options.forEach(opt => {
      opt.onclick = () => {
        const val = opt.getAttribute('data-val');
        if (val === 'love') {
          const lovedKey = 'cheatLabz_loved_today';
          const todayStr = new Date().toISOString().slice(0, 10);
          if (localStorage.getItem(lovedKey) === todayStr) {
            showToast("You've already sent love today! Thank you!", "info");
            popup.classList.remove('open');
            return;
          }
          
          localStorage.setItem(lovedKey, todayStr);
          awardCoins(1, 'Quick feedback love');
          showToast("Thank you for the support! +1 AP", "success");
          
          const originalHTML = trigger.innerHTML;
          trigger.innerHTML = `<svg viewBox="0 0 24 24" fill="#ff6b6b" stroke="#ff6b6b" stroke-width="2" style="width: 20px; height: 20px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
          setTimeout(() => {
            trigger.innerHTML = originalHTML;
          }, 2000);
          
        } else if (val === 'bug') {
          window.location.href = 'mailto:cheatlabzidea@gmail.com?subject=' + encodeURIComponent('[BUG] Report');
        } else if (val === 'idea') {
          window.location.href = 'ideas.html';
        }
        popup.classList.remove('open');
      };
    });
  }
}

// Auto-init on load if mount exists
document.addEventListener('DOMContentLoaded', initNavbar);
