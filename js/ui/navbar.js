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
}

// Auto-init on load if mount exists
document.addEventListener('DOMContentLoaded', initNavbar);
