// ScoreBreakdown.js
// Renders score breakdown UI for game over screen.
// Expects an object: { rows: [{label:string,value:any,points:number}], total:number, coinsEarned:number }

export function renderScoreBreakdown(breakdown) {
  const container = document.getElementById('score-breakdown');
  if (!container) return;
  // Clear previous content
  container.innerHTML = '';
  
  // Add premium class
  container.className = 'premium-breakdown-container';

  // Title
  const title = document.createElement('div');
  title.className = 'sb-title';
  title.textContent = 'SCORE BREAKDOWN';
  container.appendChild(title);

  const rowsWrapper = document.createElement('div');
  rowsWrapper.className = 'sb-rows';

  // Create each row with staggered animation
  breakdown.rows.forEach((row, idx) => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sb-row';
    rowDiv.style.animationDelay = `${idx * 80}ms`;
    rowDiv.innerHTML = `
      <span class="sb-label">${row.label}</span>
      <span class="sb-value">${row.value}</span>
      <span class="sb-points">+${row.points}</span>
    `;
    rowsWrapper.appendChild(rowDiv);
  });

  container.appendChild(rowsWrapper);

  // Divider
  const divider = document.createElement('div');
  divider.className = 'sb-divider';
  container.appendChild(divider);

  // Total
  const totalDiv = document.createElement('div');
  totalDiv.className = 'sb-total';
  totalDiv.innerHTML = `TOTAL <strong>${breakdown.total}</strong>`;
  container.appendChild(totalDiv);

  // Coins earned (optional)
  if (breakdown.coinsEarned) {
    const coinsDiv = document.createElement('div');
    coinsDiv.className = 'sb-coins';
    coinsDiv.textContent = `Coins earned: ${breakdown.coinsEarned}`;
    container.appendChild(coinsDiv);
  }
}
