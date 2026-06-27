/**
 * challenge-icons.js — SVG Icons for all 19 CHEAT LABZ Multiplayer Games
 *
 * Rules: viewBox="0 0 48 48", stroke="currentColor", stroke-width="1.5"
 * Each icon has one accent-color filled element.
 * Accent color set via CSS --game-color on the card, icon uses currentColor.
 */

export const CHALLENGE_ICONS = {

  // ── Rock Paper Scissors (#ff6b6b) ─────────────────────────────────────
  'rock-paper-scissors': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Rock (fist) — top center -->
    <circle cx="24" cy="10" r="5.5" fill="#ff6b6b" opacity="0.9"/>
    <path d="M19.5 10.5 C19.5 14 20.5 16 24 17 C27.5 16 28.5 14 28.5 10.5"/>
    <!-- Paper (open hand) — bottom left -->
    <rect x="6" y="30" width="12" height="14" rx="2" stroke-width="1.5"/>
    <line x1="9" y1="30" x2="9" y2="26" stroke-width="1.5"/>
    <line x1="12" y1="30" x2="12" y2="25" stroke-width="1.5"/>
    <line x1="15" y1="30" x2="15" y2="26" stroke-width="1.5"/>
    <!-- Scissors (V) — bottom right -->
    <line x1="30" y1="44" x2="38" y2="32" stroke-width="2.5" stroke="#ff6b6b"/>
    <line x1="38" y1="44" x2="30" y2="32" stroke-width="2.5" stroke="#ff6b6b"/>
    <circle cx="34" cy="36" r="3" fill="#ff6b6b" opacity="0.3"/>
    <!-- Triangle connecting lines -->
    <line x1="24" y1="15.5" x2="12" y2="30" stroke-width="1" opacity="0.3"/>
    <line x1="24" y1="15.5" x2="34" y2="30" stroke-width="1" opacity="0.3"/>
    <line x1="12" y1="44" x2="30" y2="44" stroke-width="1" opacity="0.3"/>
  </svg>`,

  // ── Tic Tac Toe (#6c63ff) ─────────────────────────────────────────────
  'tic-tac-toe': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Grid lines -->
    <line x1="16" y1="6" x2="16" y2="42"/>
    <line x1="32" y1="6" x2="32" y2="42"/>
    <line x1="6" y1="16" x2="42" y2="16"/>
    <line x1="6" y1="32" x2="42" y2="32"/>
    <!-- X in top-left cell -->
    <line x1="9" y1="9" x2="13" y2="13" stroke-width="2"/>
    <line x1="13" y1="9" x2="9" y2="13" stroke-width="2"/>
    <!-- O in center cell — accent filled ring -->
    <circle cx="24" cy="24" r="4.5" stroke="#6c63ff" stroke-width="2.5" fill="#6c63ff" fill-opacity="0.15"/>
    <!-- X in bottom-right cell -->
    <line x1="35" y1="35" x2="39" y2="39" stroke-width="2"/>
    <line x1="39" y1="35" x2="35" y2="39" stroke-width="2"/>
    <!-- O ghost in top-right -->
    <circle cx="37" cy="11" r="3.5" stroke-width="1.5" opacity="0.3"/>
  </svg>`,

  // ── Battleship (#4ecdc4) ──────────────────────────────────────────────
  'battleship': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Ship silhouette (top-right) -->
    <path d="M26 6 L42 10 L42 18 L26 20 L22 13 Z" stroke-width="1.5"/>
    <line x1="34" y1="8" x2="34" y2="20" stroke-width="1"/>
    <line x1="38" y1="9" x2="38" y2="19" stroke-width="1"/>
    <!-- Ocean grid dots (bottom-left) -->
    <circle cx="8"  cy="28" r="1" fill="currentColor"/>
    <circle cx="14" cy="28" r="1" fill="currentColor"/>
    <circle cx="20" cy="28" r="1" fill="currentColor"/>
    <circle cx="8"  cy="34" r="1" fill="currentColor"/>
    <circle cx="14" cy="34" r="1" fill="currentColor"/>
    <circle cx="20" cy="34" r="1" fill="currentColor"/>
    <circle cx="8"  cy="40" r="1" fill="currentColor"/>
    <circle cx="14" cy="40" r="1" fill="currentColor"/>
    <circle cx="20" cy="40" r="1" fill="currentColor"/>
    <!-- Hit marker — explosion starburst (accent) -->
    <circle cx="20" cy="28" r="3.5" fill="#4ecdc4" fill-opacity="0.25" stroke="#4ecdc4"/>
    <line x1="20" y1="23" x2="20" y2="25" stroke="#4ecdc4" stroke-width="1.5"/>
    <line x1="20" y1="31" x2="20" y2="33" stroke="#4ecdc4" stroke-width="1.5"/>
    <line x1="15" y1="28" x2="17" y2="28" stroke="#4ecdc4" stroke-width="1.5"/>
    <line x1="23" y1="28" x2="25" y2="28" stroke="#4ecdc4" stroke-width="1.5"/>
  </svg>`,

  // ── Multiplayer Snake (#00d4aa) ───────────────────────────────────────
  'multiplayer-snake': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Snake 1 (going right) — teal accent head -->
    <circle cx="38" cy="12" r="4" fill="#00d4aa" stroke="#00d4aa"/>
    <circle cx="30" cy="12" r="3" stroke-width="1.5"/>
    <circle cx="22" cy="12" r="3" stroke-width="1.5"/>
    <circle cx="14" cy="12" r="3" stroke-width="1.5"/>
    <circle cx="8"  cy="18" r="3" stroke-width="1.5"/>
    <!-- Snake 2 (going left) -->
    <circle cx="10" cy="36" r="4" stroke-width="2"/>
    <circle cx="18" cy="36" r="3" stroke-width="1.5"/>
    <circle cx="26" cy="36" r="3" stroke-width="1.5"/>
    <circle cx="34" cy="36" r="3" stroke-width="1.5"/>
    <circle cx="40" cy="30" r="3" stroke-width="1.5"/>
    <!-- Collision point indicator -->
    <circle cx="24" cy="24" r="2.5" stroke="#00d4aa" stroke-width="1" fill="#00d4aa" fill-opacity="0.2"/>
    <!-- Eye on snake 1 head -->
    <circle cx="40" cy="10" r="1" fill="#000"/>
  </svg>`,

  // ── Physics Soccer (#ffd93d) ──────────────────────────────────────────
  'physics-soccer': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Soccer ball (center, accent filled) -->
    <circle cx="24" cy="24" r="9" fill="#ffd93d" fill-opacity="0.15" stroke="#ffd93d" stroke-width="1.5"/>
    <path d="M24 15 L27 20 L24 20 L21 20 Z" fill="#ffd93d" fill-opacity="0.6"/>
    <path d="M15.5 20 L21 20 L19 26 L14 24 Z" fill="#ffd93d" fill-opacity="0.4"/>
    <path d="M32.5 20 L27 20 L29 26 L34 24 Z" fill="#ffd93d" fill-opacity="0.4"/>
    <!-- Goal post (right) -->
    <line x1="39" y1="16" x2="45" y2="16"/>
    <line x1="39" y1="32" x2="45" y2="32"/>
    <line x1="45" y1="16" x2="45" y2="32"/>
    <!-- Player 1 (left) -->
    <circle cx="8" cy="22" r="3" fill="currentColor" fill-opacity="0.6"/>
    <line x1="8" y1="25" x2="8" y2="31"/>
    <!-- Player 2 (right side) -->
    <circle cx="14" cy="30" r="3" fill="currentColor" fill-opacity="0.4"/>
    <line x1="14" y1="33" x2="14" y2="39"/>
  </svg>`,

  // ── Mini Clash (#e17055) ──────────────────────────────────────────────
  'mini-clash': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Left tower (player) -->
    <rect x="4" y="10" width="12" height="32" rx="1"/>
    <rect x="4" y="6"  width="3"  height="5"/>
    <rect x="9" y="6"  width="3"  height="5"/>
    <!-- Right tower (enemy, accent) -->
    <rect x="32" y="14" width="12" height="28" rx="1" fill="#e17055" fill-opacity="0.2" stroke="#e17055"/>
    <rect x="32" y="10" width="3"  height="5" fill="#e17055" fill-opacity="0.4"/>
    <rect x="37" y="10" width="3"  height="5" fill="#e17055" fill-opacity="0.4"/>
    <!-- Units in middle -->
    <rect x="19" y="28" width="5" height="7" rx="1"/>
    <rect x="24" y="26" width="5" height="7" rx="1" opacity="0.6"/>
    <!-- Projectile lines -->
    <line x1="16" y1="22" x2="31" y2="22" stroke-dasharray="2 2" opacity="0.6"/>
    <line x1="32" y1="24" x2="17" y2="24" stroke="#e17055" stroke-dasharray="2 2" opacity="0.6"/>
  </svg>`,

  // ── Word Duel (#fd79a8) ───────────────────────────────────────────────
  'word-duel': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Left speech bubble (accent) -->
    <path d="M4 8 H28 Q30 8 30 10 V24 Q30 26 28 26 H10 L4 32 V26 H4 Q2 26 2 24 V10 Q2 8 4 8 Z" fill="#fd79a8" fill-opacity="0.15" stroke="#fd79a8"/>
    <!-- Letters in left bubble -->
    <rect x="7"  y="14" width="4" height="6" rx="1" fill="#fd79a8" fill-opacity="0.7"/>
    <rect x="13" y="14" width="4" height="6" rx="1" fill="#fd79a8" fill-opacity="0.7"/>
    <rect x="19" y="14" width="4" height="6" rx="1" fill="#fd79a8" fill-opacity="0.7"/>
    <!-- Right speech bubble -->
    <path d="M18 22 H44 Q46 22 46 24 V38 Q46 40 44 40 H26 L20 46 V40 Q18 40 18 38 V24 Q18 22 20 22 Z" fill="none"/>
    <!-- Letters in right bubble (one still typing) -->
    <rect x="22" y="28" width="4" height="6" rx="1" fill="currentColor" fill-opacity="0.6"/>
    <rect x="28" y="28" width="4" height="6" rx="1" fill="currentColor" fill-opacity="0.6"/>
    <rect x="34" y="28" width="4" height="6" rx="1" fill="currentColor" fill-opacity="0.2" stroke-dasharray="1 1"/>
  </svg>`,

  // ── Reflex Duel (#00b894) ─────────────────────────────────────────────
  'reflex-duel': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Vertical divider -->
    <line x1="24" y1="4" x2="24" y2="44" stroke-dasharray="3 2" opacity="0.4"/>
    <!-- Left lightning bolt (accent) -->
    <path d="M8 6 L14 6 L10 22 L16 22 L8 42 L12 42 L18 22 L12 22 L18 6 Z" fill="#00b894" fill-opacity="0.25" stroke="#00b894"/>
    <!-- Right lightning bolt (dim) -->
    <path d="M30 6 L36 6 L32 22 L38 22 L30 42 L34 42 L40 22 L34 22 L40 6 Z" opacity="0.45"/>
    <!-- Center stimulus circle -->
    <circle cx="24" cy="24" r="5.5" fill="#00b894" fill-opacity="0.15" stroke="#00b894" stroke-width="2"/>
    <circle cx="24" cy="24" r="2" fill="#00b894"/>
  </svg>`,

  // ── Pixel Gunfight (#ff7675) ──────────────────────────────────────────
  'pixel-gunfight': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Left character -->
    <circle cx="8" cy="14" r="4"/>
    <rect x="5" y="18" width="6" height="10" rx="1"/>
    <line x1="8" y1="28" x2="6" y2="36"/>
    <line x1="8" y1="28" x2="10" y2="36"/>
    <!-- Left gun pointing right -->
    <rect x="11" y="21" width="9" height="3" rx="1"/>
    <line x1="20" y1="21.5" x2="22" y2="21.5" stroke-width="2"/>
    <!-- Right character -->
    <circle cx="40" cy="14" r="4"/>
    <rect x="37" y="18" width="6" height="10" rx="1"/>
    <line x1="40" y1="28" x2="38" y2="36"/>
    <line x1="40" y1="28" x2="42" y2="36"/>
    <!-- Right gun pointing left -->
    <rect x="28" y="21" width="9" height="3" rx="1"/>
    <line x1="28" y1="21.5" x2="26" y2="21.5" stroke-width="2"/>
    <!-- Bullet paths crossing + impact -->
    <line x1="22" y1="22.5" x2="27" y2="22.5" stroke-dasharray="2 1.5" opacity="0.5"/>
    <circle cx="24" cy="22.5" r="3" fill="#ff7675" fill-opacity="0.3" stroke="#ff7675"/>
    <!-- Shield between them -->
    <path d="M22 30 L24 28 L26 30 L26 36 Q24 38 22 36 Z" fill="currentColor" fill-opacity="0.2"/>
  </svg>`,

  // ── Color Flood Duel (#a29bfe) ────────────────────────────────────────
  'color-flood-duel': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- 4x4 grid outline -->
    <rect x="4" y="4" width="40" height="40" rx="3"/>
    <!-- Vertical grid lines -->
    <line x1="14" y1="4" x2="14" y2="44"/>
    <line x1="24" y1="4" x2="24" y2="44"/>
    <line x1="34" y1="4" x2="34" y2="44"/>
    <!-- Horizontal grid lines -->
    <line x1="4" y1="14" x2="44" y2="14"/>
    <line x1="4" y1="24" x2="44" y2="24"/>
    <line x1="4" y1="34" x2="44" y2="34"/>
    <!-- Left cells (lavender accent) -->
    <rect x="5"  y="5"  width="8" height="8" rx="1" fill="#a29bfe" fill-opacity="0.7"/>
    <rect x="5"  y="15" width="8" height="8" rx="1" fill="#a29bfe" fill-opacity="0.5"/>
    <rect x="5"  y="25" width="8" height="8" rx="1" fill="#a29bfe" fill-opacity="0.7"/>
    <rect x="5"  y="35" width="8" height="8" rx="1" fill="#a29bfe" fill-opacity="0.4"/>
    <rect x="15" y="5"  width="8" height="8" rx="1" fill="#a29bfe" fill-opacity="0.5"/>
    <rect x="15" y="15" width="8" height="8" rx="1" fill="#a29bfe" fill-opacity="0.3"/>
    <!-- Right cells -->
    <rect x="25" y="25" width="8" height="8" rx="1" fill="currentColor" fill-opacity="0.4"/>
    <rect x="35" y="25" width="8" height="8" rx="1" fill="currentColor" fill-opacity="0.6"/>
    <rect x="25" y="35" width="8" height="8" rx="1" fill="currentColor" fill-opacity="0.35"/>
    <rect x="35" y="35" width="8" height="8" rx="1" fill="currentColor" fill-opacity="0.55"/>
    <!-- Battle zigzag line -->
    <polyline points="24,4 18,14 26,24 18,34 24,44" stroke="#a29bfe" stroke-width="2" fill="none"/>
  </svg>`,

  // ── Ludo (#fdcb6e) ────────────────────────────────────────────────────
  'ludo': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Ludo cross board -->
    <rect x="4"  y="16" width="14" height="16" rx="1"/>
    <rect x="30" y="16" width="14" height="16" rx="1"/>
    <rect x="16" y="4"  width="16" height="14" rx="1"/>
    <rect x="16" y="30" width="16" height="14" rx="1"/>
    <!-- Center cross -->
    <rect x="16" y="16" width="16" height="16" rx="1"/>
    <!-- Token circles in each quadrant -->
    <circle cx="9"  cy="24" r="3.5" fill="currentColor" fill-opacity="0.5"/>
    <circle cx="39" cy="24" r="3.5" fill="currentColor" fill-opacity="0.4"/>
    <circle cx="24" cy="9"  r="3.5" fill="currentColor" fill-opacity="0.6"/>
    <circle cx="24" cy="39" r="3.5" fill="currentColor" fill-opacity="0.3"/>
    <!-- Dice (center, accent) -->
    <rect x="18" y="18" width="12" height="12" rx="2" fill="#fdcb6e" fill-opacity="0.25" stroke="#fdcb6e"/>
    <circle cx="21" cy="21" r="1" fill="#fdcb6e"/>
    <circle cx="24" cy="24" r="1" fill="#fdcb6e"/>
    <circle cx="27" cy="27" r="1" fill="#fdcb6e"/>
  </svg>`,

  // ── Bomberman Arena (#e84393) ─────────────────────────────────────────
  'bomberman-arena': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Maze blocks -->
    <rect x="4"  y="4"  width="8" height="8" rx="1" fill="currentColor" fill-opacity="0.3"/>
    <rect x="20" y="4"  width="8" height="8" rx="1" fill="currentColor" fill-opacity="0.3"/>
    <rect x="36" y="4"  width="8" height="8" rx="1" fill="currentColor" fill-opacity="0.3"/>
    <rect x="4"  y="20" width="8" height="8" rx="1" fill="currentColor" fill-opacity="0.3"/>
    <rect x="20" y="20" width="8" height="8" rx="1" fill="currentColor" fill-opacity="0.3"/>
    <rect x="36" y="20" width="8" height="8" rx="1" fill="currentColor" fill-opacity="0.3"/>
    <rect x="4"  y="36" width="8" height="8" rx="1" fill="currentColor" fill-opacity="0.3"/>
    <rect x="36" y="36" width="8" height="8" rx="1" fill="currentColor" fill-opacity="0.3"/>
    <!-- Bomber character (top area between blocks) -->
    <circle cx="30" cy="13" r="3"/>
    <rect x="28" y="16" width="4" height="6" rx="1"/>
    <!-- Bomb (accent, center-left area) -->
    <circle cx="15" cy="34" r="5.5" fill="#e84393" fill-opacity="0.25" stroke="#e84393" stroke-width="1.5"/>
    <!-- Fuse -->
    <path d="M15 28.5 Q17 24 20 23" stroke="#e84393" stroke-width="1.5" fill="none"/>
    <!-- Blast lines (+) -->
    <line x1="15" y1="28" x2="15" y2="22" stroke="#e84393" stroke-dasharray="1.5 1.5"/>
    <line x1="9"  y1="34" x2="4"  y2="34" stroke="#e84393" stroke-dasharray="1.5 1.5"/>
    <line x1="21" y1="34" x2="26" y2="34" stroke="#e84393" stroke-dasharray="1.5 1.5"/>
    <line x1="15" y1="40" x2="15" y2="44" stroke="#e84393" stroke-dasharray="1.5 1.5"/>
  </svg>`,

  // ── Tank Battle (#55efc4) ─────────────────────────────────────────────
  'tank-battle': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Left tank body (accent, facing right) -->
    <rect x="4" y="22" width="16" height="10" rx="2" fill="#55efc4" fill-opacity="0.2" stroke="#55efc4"/>
    <!-- Left tank turret -->
    <rect x="8" y="17" width="8" height="6" rx="1" fill="#55efc4" fill-opacity="0.3" stroke="#55efc4"/>
    <!-- Left tank barrel -->
    <line x1="16" y1="20" x2="22" y2="20" stroke="#55efc4" stroke-width="2"/>
    <!-- Left tank treads -->
    <rect x="4"  y="31" width="16" height="3" rx="1.5" fill="#55efc4" fill-opacity="0.2"/>
    <!-- Right tank body (facing left) -->
    <rect x="28" y="22" width="16" height="10" rx="2"/>
    <!-- Right tank turret -->
    <rect x="32" y="17" width="8" height="6" rx="1"/>
    <!-- Right tank barrel -->
    <line x1="32" y1="20" x2="26" y2="20" stroke-width="2"/>
    <!-- Right tank treads -->
    <rect x="28" y="31" width="16" height="3" rx="1.5" fill="currentColor" fill-opacity="0.3"/>
    <!-- Explosion center -->
    <circle cx="24" cy="24" r="4" fill="currentColor" fill-opacity="0.1"/>
    <line x1="22" y1="22" x2="20" y2="20" stroke-width="1.5"/>
    <line x1="26" y1="22" x2="28" y2="20" stroke-width="1.5"/>
    <line x1="24" y1="20" x2="24" y2="17" stroke-width="1.5"/>
    <line x1="22" y1="26" x2="20" y2="28" stroke-width="1.5"/>
    <line x1="26" y1="26" x2="28" y2="28" stroke-width="1.5"/>
  </svg>`,

  // ── Top-Down Racer (#6c5ce7) ──────────────────────────────────────────
  'top-down-racer': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Race track oval -->
    <ellipse cx="24" cy="24" rx="20" ry="14" stroke-width="5" stroke="currentColor" fill="none" opacity="0.2"/>
    <ellipse cx="24" cy="24" rx="20" ry="14" stroke-width="1.5" stroke="currentColor" fill="none"/>
    <ellipse cx="24" cy="24" rx="12" ry="7" stroke-width="1.5" fill="none"/>
    <!-- Leading car (accent) -->
    <rect x="30" y="18" width="8" height="5" rx="1.5" fill="#6c5ce7" stroke="#6c5ce7"/>
    <rect x="31" y="17" width="6" height="2" rx="0.5" fill="#6c5ce7" fill-opacity="0.5"/>
    <!-- Following car -->
    <rect x="10" y="24" width="7" height="4" rx="1" fill="currentColor" fill-opacity="0.5"/>
    <!-- Checkered flag (top-right) -->
    <rect x="36" y="4" width="4" height="4" fill="currentColor"/>
    <rect x="40" y="4" width="4" height="4" fill="currentColor" fill-opacity="0.2"/>
    <rect x="36" y="8" width="4" height="4" fill="currentColor" fill-opacity="0.2"/>
    <rect x="40" y="8" width="4" height="4" fill="currentColor"/>
    <line x1="36" y1="4" x2="36" y2="14"/>
    <!-- Speed lines behind leading car -->
    <line x1="29" y1="19" x2="24" y2="19" stroke="#6c5ce7" stroke-dasharray="1.5 1.5" opacity="0.6"/>
    <line x1="29" y1="22" x2="23" y2="22" stroke="#6c5ce7" stroke-dasharray="1.5 1.5" opacity="0.4"/>
  </svg>`,

  // ── King of the Hill (#00cec9) ────────────────────────────────────────
  'king-of-the-hill': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Hill triangle -->
    <path d="M4 44 L24 10 L44 44 Z" fill="currentColor" fill-opacity="0.1"/>
    <path d="M4 44 L24 10 L44 44"/>
    <!-- Crown (accent) on peak -->
    <path d="M18 12 L20 7 L24 10 L28 7 L30 12 Z" fill="#00cec9" fill-opacity="0.3" stroke="#00cec9"/>
    <rect x="17" y="12" width="14" height="5" rx="1" fill="#00cec9" fill-opacity="0.2" stroke="#00cec9"/>
    <!-- Character on top (near crown) -->
    <circle cx="24" cy="19" r="3"/>
    <line x1="24" y1="22" x2="24" y2="29"/>
    <!-- Characters climbing slopes -->
    <circle cx="14" cy="32" r="2.5"/>
    <line x1="14" y1="34" x2="14" y2="40"/>
    <circle cx="34" cy="32" r="2.5"/>
    <line x1="34" y1="34" x2="34" y2="40"/>
    <!-- Ground line -->
    <line x1="2" y1="44" x2="46" y2="44" stroke-width="2"/>
  </svg>`,

  // ── Zombie Survival (#b2bec3) ─────────────────────────────────────────
  'zombie-survival': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Player characters (center triangle formation, accent) -->
    <circle cx="24" cy="18" r="3.5" fill="#b2bec3" fill-opacity="0.9" stroke="#b2bec3"/>
    <line x1="24" y1="21.5" x2="24" y2="27" stroke="#b2bec3" stroke-width="1.5"/>
    <circle cx="18" cy="28" r="3" fill="#b2bec3" fill-opacity="0.8" stroke="#b2bec3"/>
    <line x1="18" y1="31" x2="18" y2="36" stroke="#b2bec3" stroke-width="1.5"/>
    <circle cx="30" cy="28" r="3" fill="#b2bec3" fill-opacity="0.8" stroke="#b2bec3"/>
    <line x1="30" y1="31" x2="30" y2="36" stroke="#b2bec3" stroke-width="1.5"/>
    <!-- Health bar -->
    <rect x="16" y="8" width="16" height="3" rx="1.5" fill="currentColor" fill-opacity="0.2"/>
    <rect x="16" y="8" width="10" height="3" rx="1.5" fill="#00b894"/>
    <!-- Zombie 1 (top-left, reaching arm) -->
    <circle cx="6" cy="8" r="3" opacity="0.5"/>
    <line x1="9" y1="8" x2="13" y2="12" stroke-width="2" opacity="0.5"/>
    <line x1="6" y1="11" x2="6" y2="18" opacity="0.5"/>
    <!-- Zombie 2 (top-right) -->
    <circle cx="42" cy="8" r="3" opacity="0.5"/>
    <line x1="39" y1="8" x2="35" y2="12" stroke-width="2" opacity="0.5"/>
    <!-- Zombie 3 (bottom-left) -->
    <circle cx="6" cy="42" r="3" opacity="0.5"/>
    <line x1="9" y1="42" x2="13" y2="36" stroke-width="2" opacity="0.5"/>
    <!-- Zombie 4 (bottom-right) -->
    <circle cx="42" cy="42" r="3" opacity="0.5"/>
    <line x1="39" y1="42" x2="35" y2="36" stroke-width="2" opacity="0.5"/>
  </svg>`,

  // ── Mini Party Pack (#ff6b6b) ─────────────────────────────────────────
  'mini-party-pack': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Dividers -->
    <line x1="24" y1="4" x2="24" y2="44"/>
    <line x1="4" y1="24" x2="44" y2="24"/>
    <!-- Top-left: Dice -->
    <rect x="6" y="6" width="14" height="14" rx="2.5"/>
    <circle cx="9.5" cy="9.5" r="1.2" fill="currentColor"/>
    <circle cx="16.5" cy="9.5" r="1.2" fill="currentColor"/>
    <circle cx="13" cy="13" r="1.2" fill="currentColor"/>
    <circle cx="9.5" cy="16.5" r="1.2" fill="currentColor"/>
    <circle cx="16.5" cy="16.5" r="1.2" fill="currentColor"/>
    <!-- Top-right: Trophy (accent) -->
    <path d="M28 6 H40 V16 Q40 22 34 22 Q28 22 28 16 Z" fill="#ff6b6b" fill-opacity="0.2" stroke="#ff6b6b"/>
    <line x1="34" y1="22" x2="34" y2="26" stroke="#ff6b6b"/>
    <line x1="30" y1="26" x2="38" y2="26" stroke="#ff6b6b" stroke-width="2"/>
    <line x1="28" y1="10" x2="24" y2="10" stroke="#ff6b6b"/>
    <line x1="40" y1="10" x2="44" y2="10" stroke="#ff6b6b"/>
    <!-- Bottom-left: Lightning bolt -->
    <path d="M14 26 L10 36 L15 36 L12 44 L20 32 L15 32 L18 26 Z" fill="currentColor" fill-opacity="0.4"/>
    <!-- Bottom-right: Star -->
    <path d="M34 26 L35.5 31 L41 31 L36.8 34.5 L38.5 40 L34 36.5 L29.5 40 L31.2 34.5 L27 31 L32.5 31 Z" fill="currentColor" fill-opacity="0.5"/>
  </svg>`,

  // ── Capture the Flag (#0984e3) ────────────────────────────────────────
  'capture-the-flag': `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Left base (top-left) -->
    <rect x="4" y="4" width="14" height="12" rx="1.5"/>
    <!-- Left flag (muted) -->
    <line x1="9" y1="4" x2="9" y2="0"/>
    <line x1="9" y1="2" x2="14" y2="5" stroke-width="2" opacity="0.4"/>
    <!-- Right base (bottom-right, accent) -->
    <rect x="30" y="32" width="14" height="12" rx="1.5" fill="#0984e3" fill-opacity="0.15" stroke="#0984e3"/>
    <!-- Right flag (accent) -->
    <line x1="39" y1="32" x2="39" y2="28" stroke="#0984e3" stroke-width="1.5"/>
    <polygon points="39,28 44,31 39,34" fill="#0984e3"/>
    <!-- Player paths (dotted lines crossing) -->
    <path d="M16 10 Q24 10 32 32" stroke-dasharray="2.5 2" fill="none" opacity="0.5"/>
    <path d="M4 44 Q14 30 38 10" stroke-dasharray="2.5 2" fill="none" opacity="0.3"/>
    <!-- Small player shapes on paths -->
    <circle cx="20" cy="14" r="2.5" fill="currentColor" fill-opacity="0.6"/>
    <circle cx="28" cy="34" r="2.5" fill="currentColor" fill-opacity="0.4"/>
    <!-- Flag mast on left base -->
    <line x1="11" y1="4" x2="11" y2="0"/>
    <polygon points="11,0 16,3 11,6" fill="currentColor" fill-opacity="0.5"/>
  </svg>`,

};

// Helper: get icon HTML for a game ID
export function getChallengeIcon(gameId) {
  return CHALLENGE_ICONS[gameId] || `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="24" cy="24" r="16"/><text x="24" y="28" text-anchor="middle" font-size="14" fill="currentColor">?</text></svg>`;
}

export default CHALLENGE_ICONS;
