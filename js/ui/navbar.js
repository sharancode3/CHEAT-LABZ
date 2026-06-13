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
  `;

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

  // Mobile Menu Logic
  const mobileMenu = document.getElementById('mobile-menu');
  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    mobileMenu.style.display = 'flex';
  });
  document.getElementById('close-menu-btn')?.addEventListener('click', () => {
    mobileMenu.style.display = 'none';
  });
}

// Auto-init on load if mount exists
document.addEventListener('DOMContentLoaded', initNavbar);
