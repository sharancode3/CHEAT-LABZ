import { Identity } from '../core/identity.js';

export function checkIdentitySetup() {
  if (Identity.getUID()) {
    Identity.validateOrRecreate();
    return;
  }

  showIdentityModal();
}

function showIdentityModal() {
  let backdrop = document.getElementById('identity-modal-backdrop');
  if (backdrop) return;

  backdrop = document.createElement('div');
  backdrop.id = 'identity-modal-backdrop';
  backdrop.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: rgba(10, 10, 15, 0.85);
    backdrop-filter: blur(12px);
    display: flex; align-items: center; justify-content: center;
    font-family: 'DM Sans', sans-serif;
  `;

  // Pre-generate a UID to show in chip
  const tempUid = Identity.generateUID();
  const shortUid = tempUid.slice(0, 8);

  backdrop.innerHTML = `
    <div style="background: #111118; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px; width: 360px; text-align: center; color: #fff; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">IDENTITY SETUP</h2>
      <p style="font-size: 13px; color: rgba(255,255,255,0.5); margin-bottom: 24px;">Choose your player tag to access global leaderboards & challenge mode.</p>
      
      <input type="text" id="id-name-input" maxlength="16" placeholder="Enter display name..." style="width: 100%; height: 48px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: #fff; padding: 0 16px; font-family: 'DM Sans', sans-serif; font-size: 14px; margin-bottom: 16px; outline: none; text-align: center;">
      
      <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 32px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); padding: 8px 12px; border-radius: 6px;">
        <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: rgba(255,255,255,0.4);">UID:</span>
        <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #6c63ff;" id="id-uid-display">${shortUid}</span>
        <button id="id-copy-uid" style="background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.3); display: flex; align-items: center;" title="Copy full UID">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
        </button>
      </div>

      <button id="id-submit-btn" style="width: 100%; height: 48px; background: #6c63ff; border: none; border-radius: 8px; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: filter 0.15s ease;">
        SAVE PROFILE
      </button>
    </div>
  `;

  document.body.appendChild(backdrop);

  // Copy UID functionality
  backdrop.querySelector('#id-copy-uid').onclick = () => {
    navigator.clipboard.writeText(tempUid);
    const display = backdrop.querySelector('#id-uid-display');
    display.textContent = 'COPIED!';
    setTimeout(() => {
      display.textContent = shortUid;
    }, 1500);
  };

  // Submit button functionality
  const input = backdrop.querySelector('#id-name-input');
  const submitBtn = backdrop.querySelector('#id-submit-btn');

  submitBtn.onclick = async () => {
    const rawName = input.value.trim();
    if (rawName.length < 3) {
      alert('Name must be at least 3 characters.');
      return;
    }
    const cleaned = rawName.replace(/[^a-zA-Z0-9_\-\s]/g, '');

    // Set loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'CONNECTING TO GRID...';
    input.disabled = true;

    try {
      Identity.setIdentity(tempUid, cleaned);
      await Identity.registerWithBackend(tempUid, cleaned);

      // Remove modal and reload to refresh nav state
      backdrop.remove();
      window.location.reload();
    } catch (e) {
      console.error('[Identity] Registration failed:', e);
      alert('Network issue. Retrying connection...');
      submitBtn.disabled = false;
      submitBtn.textContent = 'SAVE PROFILE';
      input.disabled = false;
    }
  };
}
