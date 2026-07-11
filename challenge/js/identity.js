// identity.js — Mounts the Identity Chip for Challenge Mode
// Mirrors the inline identity logic previously in challenge/index.html
import SocketClient from './socket-client.js';

function renderIdentityBar() {
  const container = document.getElementById('identity-bar-mount');
  if (!container) return;
  container.innerHTML = `
    <div class="identity-bar" id="identity-bar" style="margin-bottom: 32px;">
      <div class="identity-color-dot" id="identity-color" style="background: #6c63ff;"></div>
      <span style="color: var(--muted); font-size: 11px; letter-spacing: 0.1em;">PLAYING AS</span>
      <span class="identity-name" id="identity-name">Player7823</span>
      <input class="identity-edit-input" id="identity-edit-input" type="text" maxlength="16"
             placeholder="New name..." autocomplete="off" spellcheck="false" style="display:none;">
      <button class="identity-edit-btn" id="identity-edit-btn" aria-label="Edit display name" title="Edit name">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>`;

  const editBtn = document.getElementById('identity-edit-btn');
  const nameEl = document.getElementById('identity-name');
  const inputEl = document.getElementById('identity-edit-input');

  editBtn.addEventListener('click', () => {
    if (inputEl.style.display === 'none' || !inputEl.style.display) {
      inputEl.value = nameEl.textContent;
      nameEl.style.display = 'none';
      inputEl.style.display = 'block';
      inputEl.focus();
      inputEl.select();
      editBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>`;
    } else {
      saveName();
    }
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveName();
    if (e.key === 'Escape') cancelEdit();
  });

  function saveName() {
    const cleaned = inputEl.value.slice(0, 16).replace(/[^a-zA-Z0-9_]/g, '');
    if (cleaned) {
      nameEl.textContent = cleaned;
      SocketClient.rename(cleaned);
      if (window.showToast) window.showToast(`Name updated to "${cleaned}"`, 'success');
    }
    cancelEdit();
  }

  function cancelEdit() {
    nameEl.style.display = '';
    inputEl.style.display = 'none';
    editBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>`;
  }
}

export function loadIdentity() {
  const identity = SocketClient.getSavedIdentity();
  if (identity) {
    const nameEl = document.getElementById('identity-name');
    const colorEl = document.getElementById('identity-color');
    if (nameEl) nameEl.textContent = identity.displayName;
    if (colorEl) colorEl.style.background = identity.color;
  }
}

export function initIdentity() {
  renderIdentityBar();
  loadIdentity();
}

export default initIdentity;
