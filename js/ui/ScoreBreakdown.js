// ScoreBreakdown.js
// Renders score breakdown UI for game over screen.
// Expects an object: { rows: [{label:string,value:any,points:number}], total:number, coinsEarned:number }

export function renderScoreBreakdown(breakdown) {
  const container = document.getElementById('score-breakdown');
  if (!container) return;
  // Clear previous content
  container.innerHTML = '';

  // Title
  const title = document.createElement('div');
  title.className = 'sb-title';
  title.textContent = 'SCORE BREAKDOWN';
  title.style = "font-family: 'JetBrains Mono', monospace; font-size: 14px; color: var(--text-muted); text-align: center; margin-bottom: 8px;";
  container.appendChild(title);

  const rowsWrapper = document.createElement('div');
  rowsWrapper.className = 'sb-rows';
  rowsWrapper.style = "display: flex; flex-direction: column; gap: 6px;";

  // Create each row with staggered animation
  breakdown.rows.forEach((row, idx) => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sb-row';
    rowDiv.style = "display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #fff; opacity: 0; transform: translateY(8px);";
    rowDiv.innerHTML = `
      <span>${row.label}</span>
      <span>${row.value}</span>
      <span>+${row.points}</span>
    `;
    rowsWrapper.appendChild(rowDiv);
    // Stagger animation using CSS transition
    setTimeout(() => {
      rowDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      rowDiv.style.opacity = '1';
      rowDiv.style.transform = 'translateY(0)';
    }, idx * 80);
  });

  container.appendChild(rowsWrapper);

  // Divider
  const divider = document.createElement('div');
  divider.className = 'sb-divider';
  divider.style = "height: 1px; background: rgba(255,255,255,0.1); margin: 8px 0;";
  container.appendChild(divider);

  // Total
  const totalDiv = document.createElement('div');
  totalDiv.className = 'sb-total';
  totalDiv.style = "display: flex; justify-content: space-between; font-family: 'Press Start 2P', monospace; font-size: 20px; color: var(--accent-1);";
  totalDiv.innerHTML = `TOTAL <strong>${breakdown.total}</strong>`;
  container.appendChild(totalDiv);

  // Coins earned (optional)
  if (breakdown.coinsEarned) {
    const coinsDiv = document.createElement('div');
    coinsDiv.style = "font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #ffd700; text-align: center; margin-top: 4px;";
    coinsDiv.textContent = `Coins earned: ${breakdown.coinsEarned}`;
    container.appendChild(coinsDiv);
  }
}
