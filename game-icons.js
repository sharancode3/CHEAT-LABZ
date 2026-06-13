// Unique SVG icons for each game — hand-crafted, colorful, filled+stroked
const GAME_ICONS = {
  'neon-serpent': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 24c0-4 4-8 8-8s8 4 8 0 4-8 8-8 8 4 8 8" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/>
    <circle cx="38" cy="16" r="3" fill="currentColor"/>
    <circle cx="36" cy="14" r="1" fill="#0a0a0f"/>
    <path d="M8 24c0 4 2 8 4 8s4-4 4-8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
  </svg>`,
  
  'loop-rally': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="18" width="4" height="12" rx="2" fill="currentColor"/>
    <rect x="40" y="18" width="4" height="12" rx="2" fill="currentColor" opacity="0.5"/>
    <circle cx="24" cy="24" r="4" fill="currentColor"/>
    <path d="M12 24h8M28 24h8" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2" opacity="0.3"/>
    <rect x="2" y="8" width="44" height="32" rx="4" stroke="currentColor" stroke-width="2" fill="none"/>
  </svg>`,

  'turbo-drift': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 32h28l4-8-6-4H14l-8 4 4 8z" fill="currentColor" opacity="0.15"/>
    <path d="M10 32h28l4-8-6-4H14l-8 4 4 8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="14" cy="32" r="3" fill="currentColor"/>
    <circle cx="34" cy="32" r="3" fill="currentColor"/>
    <path d="M6 28l-2 0M4 24l-2 0M6 20l-2 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
  </svg>`,

  'key-frenzy': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="14" width="36" height="22" rx="4" stroke="currentColor" stroke-width="2"/>
    <rect x="12" y="19" width="6" height="5" rx="1" fill="currentColor" opacity="0.8"/>
    <rect x="21" y="19" width="6" height="5" rx="1" fill="currentColor" opacity="0.5"/>
    <rect x="30" y="19" width="6" height="5" rx="1" fill="currentColor" opacity="0.3"/>
    <rect x="15" y="27" width="18" height="5" rx="1" fill="currentColor" opacity="0.15"/>
  </svg>`,

  'astro-strider': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 6l4 16h-8l4-16z" fill="currentColor" opacity="0.2"/>
    <path d="M24 6l4 16h-8l4-16z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <path d="M20 22l-6 14 10-4 10 4-6-14" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="24" cy="16" r="2" fill="currentColor"/>
    <path d="M20 38l-2 4M28 38l2 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
  </svg>`,

  'cipher-quest': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="20" r="12" stroke="currentColor" stroke-width="2"/>
    <path d="M24 32v6" stroke="currentColor" stroke-width="3"/>
    <rect x="18" y="38" width="12" height="4" rx="2" fill="currentColor" opacity="0.3"/>
    <path d="M20 16l4 4 4-4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="24" cy="24" r="1.5" fill="currentColor"/>
  </svg>`,

  'phantom-calc': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="6" width="28" height="36" rx="4" stroke="currentColor" stroke-width="2"/>
    <rect x="14" y="10" width="20" height="10" rx="2" fill="currentColor" opacity="0.15"/>
    <circle cx="18" cy="26" r="2" fill="currentColor" opacity="0.7"/>
    <circle cx="24" cy="26" r="2" fill="currentColor" opacity="0.5"/>
    <circle cx="30" cy="26" r="2" fill="currentColor" opacity="0.3"/>
    <circle cx="18" cy="34" r="2" fill="currentColor" opacity="0.2"/>
    <circle cx="24" cy="34" r="2" fill="currentColor"/>
    <circle cx="30" cy="34" r="2" fill="currentColor" opacity="0.2"/>
  </svg>`,

  'word-pulse': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 24h8l4-12 4 24 4-16 4 8h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="24" cy="24" r="16" stroke="currentColor" stroke-width="1" opacity="0.15"/>
    <circle cx="24" cy="24" r="10" stroke="currentColor" stroke-width="1" opacity="0.1"/>
  </svg>`,

  'pixel-dodge': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="28" width="8" height="12" rx="1" fill="currentColor"/>
    <circle cx="24" cy="22" r="6" fill="currentColor" opacity="0.8"/>
    <path d="M10 10l6 6M38 10l-6 6M10 38l6-6M38 38l-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
    <path d="M24 4v4M4 24h4M44 24h-4M24 44v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.25"/>
  </svg>`,

  'stack-blitz': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="14" y="34" width="20" height="6" rx="1" fill="currentColor" opacity="0.3"/>
    <rect x="16" y="26" width="16" height="6" rx="1" fill="currentColor" opacity="0.5"/>
    <rect x="18" y="18" width="12" height="6" rx="1" fill="currentColor" opacity="0.7"/>
    <rect x="20" y="10" width="8" height="6" rx="1" fill="currentColor"/>
    <path d="M24 4v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 2"/>
  </svg>`,

  'memory-grid': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="14" height="14" rx="3" fill="currentColor" opacity="0.8"/>
    <rect x="28" y="6" width="14" height="14" rx="3" fill="currentColor" opacity="0.3"/>
    <rect x="6" y="28" width="14" height="14" rx="3" fill="currentColor" opacity="0.15"/>
    <rect x="28" y="28" width="14" height="14" rx="3" fill="currentColor" opacity="0.5"/>
  </svg>`,

  'hyper-tap': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="18" stroke="currentColor" stroke-width="2" opacity="0.2"/>
    <circle cx="24" cy="24" r="12" stroke="currentColor" stroke-width="2" opacity="0.4"/>
    <circle cx="24" cy="24" r="6" stroke="currentColor" stroke-width="2" opacity="0.7"/>
    <circle cx="24" cy="24" r="3" fill="currentColor"/>
  </svg>`,

  'gravity-flip': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 8l-8 14h16l-8-14z" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <path d="M24 40l-8-14h16l-8 14z" fill="currentColor" opacity="0.6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <path d="M18 24h12" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2" opacity="0.3"/>
  </svg>`,

  'chain-burst': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="6" fill="currentColor" opacity="0.7"/>
    <circle cx="32" cy="16" r="6" fill="currentColor" opacity="0.4"/>
    <circle cx="24" cy="30" r="6" fill="currentColor" opacity="0.55"/>
    <path d="M20 19l4 7M28 19l-4 7" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <path d="M16 16l16 0" stroke="currentColor" stroke-width="1.5" opacity="0.2"/>
  </svg>`,

  'reflex-rush': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="24,4 28,18 42,18 30,26 34,40 24,32 14,40 18,26 6,18 20,18" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="24" cy="24" r="4" fill="currentColor"/>
  </svg>`,

  'tile-runner': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="10" height="16" rx="2" fill="currentColor"/>
    <rect x="19" y="6" width="10" height="16" rx="2" fill="currentColor" opacity="0.15"/>
    <rect x="32" y="6" width="10" height="16" rx="2" fill="currentColor" opacity="0.6"/>
    <rect x="6" y="26" width="10" height="16" rx="2" fill="currentColor" opacity="0.15"/>
    <rect x="19" y="26" width="10" height="16" rx="2" fill="currentColor" opacity="0.4"/>
    <rect x="32" y="26" width="10" height="16" rx="2" fill="currentColor" opacity="0.15"/>
  </svg>`,

  'beat-drop': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="30" width="5" height="12" rx="1" fill="currentColor" opacity="0.4"/>
    <rect x="16" y="22" width="5" height="20" rx="1" fill="currentColor" opacity="0.6"/>
    <rect x="24" y="14" width="5" height="28" rx="1" fill="currentColor" opacity="0.8"/>
    <rect x="32" y="20" width="5" height="22" rx="1" fill="currentColor" opacity="0.5"/>
    <path d="M10 8a6 6 0 0 1 6-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
    <circle cx="16" cy="5" r="2" fill="currentColor" opacity="0.3"/>
  </svg>`,

  'slide-forge': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="16" height="16" rx="4" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="2"/>
    <rect x="26" y="6" width="16" height="16" rx="4" fill="currentColor" opacity="0.5" stroke="currentColor" stroke-width="2"/>
    <rect x="6" y="26" width="16" height="16" rx="4" fill="currentColor" opacity="0.35" stroke="currentColor" stroke-width="2"/>
    <rect x="26" y="26" width="16" height="16" rx="4" fill="currentColor" opacity="0.8" stroke="currentColor" stroke-width="2"/>
    <text x="12" y="18" font-size="9" fill="currentColor" font-weight="bold" font-family="monospace">2</text>
    <text x="30" y="18" font-size="9" fill="currentColor" font-weight="bold" font-family="monospace">4</text>
    <text x="10" y="38" font-size="9" fill="currentColor" font-weight="bold" font-family="monospace">8</text>
  </svg>`,

  'orb-pop-deluxe': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="8" fill="currentColor" opacity="0.6"/>
    <circle cx="32" cy="16" r="8" fill="currentColor" opacity="0.3"/>
    <circle cx="24" cy="32" r="8" fill="currentColor" opacity="0.8"/>
    <circle cx="16" cy="16" r="8" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
    <circle cx="32" cy="16" r="8" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
    <circle cx="24" cy="32" r="8" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
    <circle cx="14" cy="13" r="2" fill="white" opacity="0.4"/>
    <circle cx="22" cy="29" r="2" fill="white" opacity="0.4"/>
  </svg>`
};
