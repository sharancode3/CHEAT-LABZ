export const GAME_ICONS = {
  'neon-serpent': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2">
    <path d="M 12 36 Q 12 12 24 24 T 36 16" fill="none" />
    <polygon points="32,16 40,12 40,20" fill="currentColor" stroke="none" />
    <polygon points="32,16 40,12 40,20" fill="var(--accent-1)" stroke="none" />
    <circle cx="36" cy="14" r="1.5" fill="#fff" stroke="none" />
    <circle cx="36" cy="18" r="1.5" fill="#fff" stroke="none" />
  </svg>`,
  'loop-rally': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2">
    <rect x="14" y="8" width="20" height="4" rx="1" />
    <rect x="14" y="36" width="20" height="4" rx="1" />
    <line x1="24" y1="16" x2="24" y2="32" stroke-dasharray="4 4" />
    <circle cx="24" cy="24" r="4" fill="var(--accent-2)" stroke="none" />
  </svg>`,
  'turbo-drift': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="1.5">
    <!-- Wheels rotated for drift -->
    <rect x="10" y="14" width="4" height="8" rx="1" transform="rotate(15 12 18)" fill="currentColor" />
    <rect x="34" y="14" width="4" height="8" rx="1" transform="rotate(15 36 18)" fill="currentColor" />
    <rect x="10" y="28" width="4" height="8" rx="1" transform="rotate(15 12 32)" fill="currentColor" />
    <rect x="34" y="28" width="4" height="8" rx="1" transform="rotate(15 36 32)" fill="currentColor" />
    <!-- Car body -->
    <rect x="14" y="10" width="20" height="30" rx="4" />
    <!-- Stripe -->
    <line x1="24" y1="10" x2="24" y2="40" stroke="var(--accent-4)" stroke-width="3" />
    <!-- Speed lines -->
    <line x1="16" y1="44" x2="10" y2="48" />
    <line x1="24" y1="44" x2="18" y2="48" />
    <line x1="32" y1="44" x2="26" y2="48" />
  </svg>`,
  'key-frenzy': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2">
    <rect x="8" y="8" width="32" height="32" rx="4" />
    <rect x="12" y="12" width="24" height="24" rx="2" />
    <path d="M26 14 L18 26 H24 L22 34 L30 22 H24 L26 14 Z" fill="var(--accent-3)" stroke="none" />
    <rect x="14" y="14" width="4" height="4" fill="currentColor" stroke="none" />
  </svg>`,
  'astro-strider': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="1.5">
    <!-- Main Body -->
    <path d="M 12 36 C 8 20 20 8 36 4 C 36 4 32 20 28 32 C 24 44 12 36 12 36 Z" />
    <!-- Fins -->
    <path d="M 12 36 L 4 44 L 16 38 Z" />
    <path d="M 28 32 L 36 40 L 32 28 Z" />
    <!-- Window -->
    <circle cx="26" cy="18" r="4" fill="var(--accent-5)" stroke="none" />
    <!-- Flames -->
    <line x1="16" y1="36" x2="8" y2="46" />
    <line x1="20" y1="38" x2="16" y2="48" />
    <line x1="24" y1="34" x2="22" y2="44" />
    <!-- Stars -->
    <polygon points="10,8 12,4 14,8 18,10 14,12 12,16 10,12 6,10" fill="currentColor" stroke="none" />
    <polygon points="38,24 39,21 40,24 43,25 40,26 39,29 38,26 35,25" fill="currentColor" stroke="none" />
  </svg>`,
  'cipher-quest': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2">
    <!-- Shackle -->
    <path d="M 16 22 V 14 C 16 9 32 9 32 14 V 22" />
    <!-- Body -->
    <rect x="12" y="22" width="24" height="18" rx="3" />
    <!-- A -> Z -->
    <rect x="16" y="27" width="4" height="8" fill="var(--accent-2)" stroke="none" />
    <rect x="28" y="27" width="4" height="8" fill="var(--accent-2)" stroke="none" />
    <path d="M 22 31 H 26 M 24 29 L 26 31 L 24 33" stroke-width="1.5" />
    <!-- Dots around -->
    <circle cx="6" cy="24" r="1" fill="currentColor" stroke="none" />
    <circle cx="8" cy="34" r="1" fill="currentColor" stroke="none" />
    <circle cx="42" cy="24" r="1" fill="currentColor" stroke="none" />
    <circle cx="40" cy="34" r="1" fill="currentColor" stroke="none" />
  </svg>`,
  'phantom-calc': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2">
    <!-- Solid Left Half -->
    <g clip-path="url(#left-half)">
      <rect x="10" y="6" width="28" height="36" rx="3" />
      <rect x="14" y="10" width="20" height="8" fill="var(--accent-3)" stroke="none" />
      <circle cx="16" cy="24" r="2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="30" r="2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="36" r="2" fill="currentColor" stroke="none" />
      <circle cx="24" cy="24" r="2" fill="currentColor" stroke="none" />
      <circle cx="24" cy="30" r="2" fill="currentColor" stroke="none" />
      <circle cx="24" cy="36" r="2" fill="currentColor" stroke="none" />
      <circle cx="32" cy="24" r="2" fill="currentColor" stroke="none" />
      <circle cx="32" cy="30" r="2" fill="currentColor" stroke="none" />
      <circle cx="32" cy="36" r="2" fill="currentColor" stroke="none" />
    </g>
    <!-- Dashed/Faded Right Half -->
    <g clip-path="url(#right-half)" opacity="0.3" stroke-dasharray="2 2">
      <rect x="10" y="6" width="28" height="36" rx="3" />
      <rect x="14" y="10" width="20" height="8" fill="var(--accent-3)" stroke="none" />
      <circle cx="16" cy="24" r="2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="30" r="2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="36" r="2" fill="currentColor" stroke="none" />
      <circle cx="24" cy="24" r="2" fill="currentColor" stroke="none" />
      <circle cx="24" cy="30" r="2" fill="currentColor" stroke="none" />
      <circle cx="24" cy="36" r="2" fill="currentColor" stroke="none" />
      <circle cx="32" cy="24" r="2" fill="currentColor" stroke="none" />
      <circle cx="32" cy="30" r="2" fill="currentColor" stroke="none" />
      <circle cx="32" cy="36" r="2" fill="currentColor" stroke="none" />
    </g>
    <defs>
      <clipPath id="left-half"><rect x="0" y="0" width="24" height="48" /></clipPath>
      <clipPath id="right-half"><rect x="24" y="0" width="24" height="48" /></clipPath>
    </defs>
  </svg>`,
  'word-pulse': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2">
    <!-- Equalizer -->
    <rect x="8" y="20" width="4" height="8" rx="1" />
    <rect x="16" y="14" width="4" height="20" rx="1" />
    <rect x="24" y="8" width="4" height="32" rx="1" stroke="none" fill="var(--accent-5)" />
    <rect x="32" y="16" width="4" height="16" rx="1" />
    <rect x="40" y="22" width="4" height="4" rx="1" />
    <!-- Blinking Text Cursor -->
    <line x1="26" y1="12" x2="26" y2="36" stroke="var(--text-primary)" stroke-width="2" />
    <!-- Letter Hints -->
    <rect x="10" y="32" width="2" height="4" fill="currentColor" stroke="none" />
    <rect x="34" y="36" width="2" height="4" fill="currentColor" stroke="none" />
  </svg>`,
  'pixel-dodge': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2">
    <!-- Shield Glow -->
    <circle cx="24" cy="24" r="10" stroke="var(--accent-3)" opacity="0.4" stroke-width="1.5" />
    <!-- Player -->
    <rect x="20" y="20" width="8" height="8" fill="var(--accent-3)" stroke="none" />
    <!-- Arrows -->
    <path d="M 24 4 L 24 14 M 20 10 L 24 14 L 28 10" stroke-width="1.5" />
    <path d="M 24 44 L 24 34 M 20 38 L 24 34 L 20 28" stroke-width="1.5" />
    <path d="M 4 24 L 14 24 M 10 20 L 14 24 L 10 28" stroke-width="1.5" />
    <path d="M 44 24 L 34 24 M 38 20 L 34 24 L 38 28" stroke-width="1.5" />
  </svg>`,
  'stack-blitz': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2">
    <!-- Stack -->
    <rect x="6" y="36" width="36" height="6" rx="1" />
    <rect x="9" y="28" width="30" height="6" rx="1" />
    <rect x="12" y="20" width="24" height="6" rx="1" />
    <rect x="18" y="12" width="18" height="6" rx="1" stroke="none" fill="var(--accent-4)" />
    <!-- Animated Dots -->
    <circle cx="10" cy="15" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="40" cy="15" r="1.5" fill="currentColor" stroke="none" />
  </svg>`,
  'memory-grid': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2">
    <!-- 3x3 Grid -->
    <rect x="8" y="8" width="8" height="8" rx="1" fill="var(--accent-1)" stroke="none" />
    <rect x="20" y="8" width="8" height="8" rx="1" />
    <rect x="32" y="8" width="8" height="8" rx="1" fill="var(--accent-1)" stroke="none" />
    <rect x="8" y="20" width="8" height="8" rx="1" />
    <rect x="20" y="20" width="8" height="8" rx="1" fill="var(--accent-1)" stroke="none" />
    <rect x="32" y="20" width="8" height="8" rx="1" />
    <rect x="8" y="32" width="8" height="8" rx="1" fill="var(--accent-1)" stroke="none" />
    <rect x="20" y="32" width="8" height="8" rx="1" />
    <rect x="32" y="32" width="8" height="8" rx="1" />
    <!-- Badge -->
    <circle cx="40" cy="40" r="6" fill="var(--bg-primary)" />
    <circle cx="40" cy="40" r="4" fill="var(--text-primary)" stroke="none" />
  </svg>`,
  'hyper-tap': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2">
    <!-- Concentric Circles -->
    <circle cx="20" cy="20" r="16" />
    <circle cx="20" cy="20" r="10" />
    <circle cx="20" cy="20" r="4" fill="var(--accent-5)" stroke="none" />
    <!-- Star burst -->
    <path d="M 20 14 L 20 26 M 14 20 L 26 20 M 16 16 L 24 24 M 16 24 L 24 16" stroke="var(--accent-5)" stroke-width="1.5" />
    <!-- Finger Cursor -->
    <path d="M 30 30 L 40 40 L 34 42 L 28 36 Z" fill="currentColor" stroke="none" />
    <path d="M 30 30 L 22 22 L 26 22 L 32 30" fill="currentColor" stroke="none" />
  </svg>`,
  'gravity-flip': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2">
    <!-- Character -->
    <rect x="20" y="20" width="8" height="8" rx="1" fill="var(--accent-2)" stroke="none" />
    <!-- Double Arrow -->
    <path d="M 24 8 V 40 M 20 12 L 24 8 L 28 12 M 20 36 L 24 40 L 28 36" stroke-width="1.5" />
    <!-- Spikes Top -->
    <polygon points="10,4 14,10 18,4" fill="currentColor" stroke="none" />
    <polygon points="26,4 30,10 34,4" fill="currentColor" stroke="none" />
    <!-- Spikes Bottom -->
    <polygon points="14,44 18,38 22,44" fill="currentColor" stroke="none" />
    <polygon points="30,44 34,38 38,44" fill="currentColor" stroke="none" />
    <!-- Speed Lines -->
    <line x1="8" y1="20" x2="4" y2="20" />
    <line x1="12" y1="24" x2="6" y2="24" />
    <line x1="8" y1="28" x2="4" y2="28" />
  </svg>`,
  'chain-burst': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2">
    <!-- Lines -->
    <line x1="12" y1="12" x2="24" y2="20" />
    <line x1="24" y1="20" x2="20" y2="34" />
    <line x1="20" y1="34" x2="36" y2="34" />
    <!-- Circles -->
    <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    <circle cx="24" cy="20" r="4" fill="currentColor" stroke="none" opacity="0.8" />
    <circle cx="20" cy="34" r="4" fill="currentColor" stroke="none" opacity="0.6" />
    <!-- Burst -->
    <path d="M 36 24 L 38 28 L 42 28 L 39 31 L 40 35 L 36 33 L 32 35 L 33 31 L 30 28 L 34 28 Z" fill="var(--accent-4)" stroke="none" />
    <circle cx="36" cy="34" r="4" fill="var(--bg-primary)" stroke="none" />
  </svg>`,
  'reflex-rush': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2">
    <!-- Stopwatch Body -->
    <circle cx="24" cy="26" r="18" />
    <circle cx="24" cy="6" r="2" fill="currentColor" stroke="none" />
    <rect x="22" y="6" width="4" height="4" />
    <line x1="24" y1="8" x2="24" y2="10" />
    <!-- Lightning Bolt -->
    <path d="M 26 16 L 20 26 H 24 L 22 36 L 30 24 H 26 L 26 16 Z" fill="var(--accent-3)" stroke="none" />
    <!-- Arc Marks -->
    <line x1="8" y1="26" x2="12" y2="26" />
    <line x1="40" y1="26" x2="36" y2="26" />
  </svg>`,
  'tile-runner': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="1.5">
    <!-- Columns -->
    <rect x="6" y="8" width="8" height="32" rx="1" />
    <rect x="16" y="8" width="8" height="32" rx="1" />
    <rect x="26" y="8" width="8" height="32" rx="1" />
    <rect x="36" y="8" width="8" height="32" rx="1" />
    <!-- Dark Tiles -->
    <rect x="6" y="16" width="8" height="12" rx="1" fill="currentColor" stroke="none" />
    <rect x="16" y="24" width="8" height="12" rx="1" fill="currentColor" stroke="none" />
    <rect x="26" y="12" width="8" height="12" rx="1" fill="var(--accent-1)" stroke="none" />
    <rect x="36" y="20" width="8" height="12" rx="1" fill="currentColor" stroke="none" />
    <!-- Down Arrow -->
    <path d="M 24 4 L 24 8 M 22 6 L 24 8 L 26 6" />
    <!-- Tap Indicator -->
    <path d="M 28 32 Q 30 38 34 40" stroke-dasharray="2 2" />
    <circle cx="30" cy="30" r="3" fill="var(--accent-1)" stroke="none" />
  </svg>`,
  'beat-drop': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2">
    <!-- Music Note -->
    <ellipse cx="20" cy="14" rx="4" ry="3" fill="currentColor" stroke="none" transform="rotate(-15 20 14)" />
    <line x1="24" y1="14" x2="24" y2="4" />
    <path d="M 24 4 Q 30 4 32 10" />
    <!-- Falling Path -->
    <line x1="20" y1="20" x2="20" y2="34" stroke-dasharray="2 2" />
    <!-- Hit Line -->
    <line x1="8" y1="38" x2="40" y2="38" />
    <!-- Hit Burst -->
    <path d="M 20 34 L 22 36 L 26 36 L 23 38 L 24 42 L 20 39 L 16 42 L 17 38 L 14 36 L 18 36 Z" fill="var(--accent-5)" stroke="none" />
    <!-- Labels -->
    <rect x="10" y="42" width="2" height="2" fill="currentColor" stroke="none" />
    <rect x="18" y="42" width="2" height="2" fill="currentColor" stroke="none" />
    <rect x="28" y="42" width="2" height="2" fill="currentColor" stroke="none" />
    <rect x="36" y="42" width="2" height="2" fill="currentColor" stroke="none" />
  </svg>`,
  'slide-forge': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2">
    <!-- Grid -->
    <rect x="8" y="10" width="12" height="12" rx="2" />
    <rect x="8" y="26" width="12" height="12" rx="2" />
    <rect x="28" y="18" width="12" height="12" rx="2" fill="var(--accent-4)" stroke="none" />
    <!-- Fake Numbers via lines -->
    <path d="M 12 14 Q 16 12 16 16 L 12 20 H 16" stroke-width="1.5" />
    <path d="M 12 30 Q 16 28 16 32 L 12 36 H 16" stroke-width="1.5" />
    <path d="M 34 20 L 32 24 H 36 M 34 20 V 28" stroke="var(--bg-primary)" stroke-width="1.5" />
    <!-- Arrow -->
    <path d="M 18 24 L 24 24 M 22 22 L 24 24 L 22 26" stroke-width="1.5" />
    <!-- Sparkle -->
    <path d="M 40 12 L 42 16 L 46 18 L 42 20 L 40 24 L 38 20 L 34 18 L 38 16 Z" fill="currentColor" stroke="none" />
  </svg>`,
  'orb-pop-deluxe': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2">
    <!-- Top Orbs -->
    <circle cx="16" cy="10" r="4" fill="var(--accent-2)" stroke="none" />
    <circle cx="24" cy="10" r="4" fill="currentColor" stroke="none" />
    <circle cx="32" cy="10" r="4" fill="currentColor" stroke="none" />
    <circle cx="20" cy="18" r="4" fill="currentColor" stroke="none" />
    <circle cx="28" cy="18" r="4" />
    <!-- Burst Orb -->
    <circle cx="16" cy="10" r="6" stroke-dasharray="2 2" stroke="var(--accent-2)" />
    <circle cx="8" cy="10" r="1" fill="var(--accent-2)" stroke="none" />
    <circle cx="16" cy="2" r="1" fill="var(--accent-2)" stroke="none" />
    <circle cx="24" cy="10" r="1" fill="var(--accent-2)" stroke="none" />
    <!-- Launcher -->
    <polygon points="24,36 20,44 28,44" fill="currentColor" stroke="none" />
    <!-- Aim Arc -->
    <path d="M 24 34 Q 24 26 20 22" stroke-dasharray="2 2" />
  </svg>`,
  'default': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2">
    <rect x="8" y="12" width="32" height="20" rx="2" />
    <line x1="24" y1="32" x2="24" y2="38" />
    <line x1="16" y1="38" x2="32" y2="38" />
    <circle cx="24" cy="22" r="4" fill="var(--accent-1)" stroke="none" />
  </svg>`
};
