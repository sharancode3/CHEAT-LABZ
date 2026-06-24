// Custom SVG Registry for CHEAT LABZ
// All icons use viewBox="0 0 64 64", stroke-based retro-cyber aesthetic.

const createSVG = (paths) => \`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="game-svg-icon">
  \${paths}
</svg>
\`;

window.GAME_ICONS = {
  // 1. Neon Serpent: segmented neon snake wrapped around a glowing apple icon
  'neon-serpent': createSVG(\`
    <!-- Apple -->
    <path d="M32 20 C24 20, 24 32, 32 38 C40 32, 40 20, 32 20 Z" fill="var(--danger)" stroke="var(--danger)"/>
    <path d="M32 20 Q36 14 40 14" stroke="var(--accent-4)"/>
    <!-- Snake wrapped -->
    <path d="M16 48 Q20 38 32 44 T48 40 Q54 36 50 28 T36 12 Q28 6 20 16 T12 32 Q16 42 24 50 T40 54" stroke="var(--cyan)" stroke-width="3"/>
    <circle cx="45" cy="52" r="2" fill="var(--cyan)"/>
  \`),

  // 2. Loop Rally: curved paddle trail forming an infinity loop
  'loop-rally': createSVG(\`
    <path d="M16 32 C16 16, 32 16, 32 32 C32 48, 48 48, 48 32 C48 16, 32 16, 32 32 C32 48, 16 48, 16 32 Z" stroke="var(--neon)" stroke-dasharray="6 4" stroke-width="3"/>
    <path d="M12 32 C12 20, 28 20, 32 32" stroke="var(--cyan)" stroke-width="4"/>
    <circle cx="48" cy="32" r="4" fill="var(--accent-1)"/>
  \`),

  // 3. Turbo Drift: drifting sports car leaving tire smoke
  'turbo-drift': createSVG(\`
    <!-- Tire Smoke -->
    <path d="M16 50 Q24 40 32 46 T48 36" stroke="var(--muted)" stroke-dasharray="2 4" stroke-width="6"/>
    <path d="M10 56 Q18 46 26 52 T42 42" stroke="var(--muted)" stroke-dasharray="2 4" stroke-width="6"/>
    <!-- Car Chassis angled -->
    <g transform="rotate(-15 32 32)">
      <rect x="20" y="24" width="24" height="16" rx="4" stroke="var(--danger)" stroke-width="2"/>
      <rect x="24" y="26" width="16" height="6" stroke="var(--cyan)"/>
      <!-- Tires -->
      <rect x="18" y="22" width="6" height="4" fill="currentColor"/>
      <rect x="18" y="38" width="6" height="4" fill="currentColor"/>
      <rect x="40" y="22" width="6" height="4" fill="currentColor"/>
      <rect x="40" y="38" width="6" height="4" fill="currentColor"/>
    </g>
  \`),

  // 4. Key Frenzy: keyboard with exploding keys
  'key-frenzy': createSVG(\`
    <rect x="10" y="20" width="44" height="24" rx="2" stroke="currentColor"/>
    <rect x="14" y="24" width="6" height="6"/>
    <rect x="24" y="24" width="6" height="6"/>
    <rect x="34" y="24" width="6" height="6"/>
    <rect x="44" y="24" width="6" height="6"/>
    <rect x="14" y="34" width="20" height="6"/>
    <!-- Exploding Key -->
    <path d="M40 10 L44 4 L48 10 Z" fill="var(--cyan)" stroke="none"/>
    <path d="M44 14 L36 8 M44 14 L52 8 M44 14 L44 4" stroke="var(--danger)"/>
    <rect x="40" y="12" width="8" height="8" stroke="var(--neon)" fill="var(--bg)"/>
  \`),

  // 5. Astro Strider: small spaceship firing lasers
  'astro-strider': createSVG(\`
    <!-- Ship -->
    <polygon points="16,40 32,16 48,40 32,32" stroke="var(--cyan)" stroke-width="2" fill="rgba(6,182,212,0.1)"/>
    <line x1="24" y1="36" x2="24" y2="44" stroke="currentColor"/>
    <line x1="40" y1="36" x2="40" y2="44" stroke="currentColor"/>
    <!-- Lasers -->
    <line x1="32" y1="24" x2="32" y2="8" stroke="var(--danger)" stroke-width="3" stroke-dasharray="4 4"/>
    <line x1="20" y1="30" x2="20" y2="14" stroke="var(--neon)" stroke-width="2"/>
    <line x1="44" y1="30" x2="44" y2="14" stroke="var(--neon)" stroke-width="2"/>
  \`),

  // 6. Cipher Quest: lock combined with encrypted symbols
  'cipher-quest': createSVG(\`
    <!-- Lock Body -->
    <rect x="20" y="28" width="24" height="20" rx="2" stroke="var(--neon)"/>
    <!-- Lock Shackle -->
    <path d="M24 28 V18 A8 8 0 0 1 40 18 V28" stroke="currentColor"/>
    <!-- Keyhole -->
    <circle cx="32" cy="36" r="3" fill="var(--cyan)" stroke="none"/>
    <path d="M30 38 L34 38 L33 42 L31 42 Z" fill="var(--cyan)" stroke="none"/>
    <!-- Symbols -->
    <text x="8" y="24" fill="var(--danger)" stroke="none" font-family="monospace" font-size="10">X</text>
    <text x="50" y="32" fill="var(--accent-4)" stroke="none" font-family="monospace" font-size="10">0</text>
    <text x="12" y="44" fill="currentColor" stroke="none" font-family="monospace" font-size="10">?</text>
  \`),

  // 7. Phantom Calc: floating equations dissolving into particles
  'phantom-calc': createSVG(\`
    <text x="12" y="36" fill="var(--cyan)" stroke="none" font-family="monospace" font-size="18" font-weight="bold">5x</text>
    <text x="36" y="36" fill="currentColor" stroke="none" font-family="monospace" font-size="18">+</text>
    <!-- Dissolving = ? -->
    <path d="M48 30 L54 30 M48 34 L52 34" stroke="var(--danger)" stroke-dasharray="2 2"/>
    <!-- Particles -->
    <circle cx="46" cy="20" r="1" fill="var(--neon)"/>
    <circle cx="56" cy="24" r="1.5" fill="var(--neon)"/>
    <circle cx="50" cy="42" r="1" fill="var(--neon)"/>
    <circle cx="58" cy="38" r="1" fill="var(--cyan)"/>
  \`),

  // 8. Word Pulse: rhythmic sound waves around a keyboard
  'word-pulse': createSVG(\`
    <!-- Soundwaves -->
    <path d="M8 32 Q16 16 24 32 T40 32 T56 32" stroke="var(--neon)" stroke-width="2"/>
    <path d="M8 32 Q16 48 24 32 T40 32 T56 32" stroke="var(--cyan)" stroke-width="2"/>
    <!-- Keyboard overlay -->
    <rect x="16" y="24" width="32" height="16" rx="2" fill="var(--bg)" stroke="currentColor"/>
    <line x1="24" y1="24" x2="24" y2="40" stroke="currentColor"/>
    <line x1="32" y1="24" x2="32" y2="40" stroke="currentColor"/>
    <line x1="40" y1="24" x2="40" y2="40" stroke="currentColor"/>
  \`),

  // 9. Pixel Dodge: bullet trails around a tiny pixel character
  'pixel-dodge': createSVG(\`
    <!-- Pixel Character -->
    <rect x="28" y="28" width="8" height="8" fill="var(--cyan)" stroke="var(--cyan)"/>
    <!-- Bullets -->
    <circle cx="16" cy="16" r="3" fill="var(--danger)" stroke="none"/>
    <line x1="8" y1="8" x2="14" y2="14" stroke="var(--danger)" stroke-dasharray="2 2"/>
    
    <circle cx="48" cy="12" r="3" fill="var(--danger)" stroke="none"/>
    <line x1="56" y1="4" x2="50" y2="10" stroke="var(--danger)" stroke-dasharray="2 2"/>
    
    <circle cx="12" cy="48" r="3" fill="var(--danger)" stroke="none"/>
    <line x1="4" y1="56" x2="10" y2="50" stroke="var(--danger)" stroke-dasharray="2 2"/>
    
    <circle cx="52" cy="52" r="3" fill="var(--danger)" stroke="none"/>
    <line x1="60" y1="60" x2="54" y2="54" stroke="var(--danger)" stroke-dasharray="2 2"/>
  \`),

  // 10. Stack Blitz: stacked glowing blocks
  'stack-blitz': createSVG(\`
    <!-- Bottom Block -->
    <polygon points="16,50 32,58 48,50 32,42" fill="none" stroke="var(--muted)"/>
    <polygon points="16,50 16,42 32,50 48,42 48,50 32,58" fill="none" stroke="var(--muted)"/>
    <!-- Middle Block -->
    <polygon points="18,44 32,51 46,44 32,37" fill="none" stroke="var(--cyan)"/>
    <polygon points="18,44 18,36 32,43 46,36 46,44 32,51" fill="none" stroke="var(--cyan)"/>
    <!-- Top Glowing Block -->
    <polygon points="20,38 32,44 44,38 32,32" fill="rgba(139,92,246,0.2)" stroke="var(--neon)" stroke-width="2"/>
    <polygon points="20,38 20,30 32,36 44,30 44,38 32,44" fill="none" stroke="var(--neon)" stroke-width="2"/>
    <line x1="32" y1="44" x2="32" y2="36" stroke="var(--neon)" stroke-width="2"/>
  \`),

  // 11. Memory Grid: illuminated squares arranged in a matrix
  'memory-grid': createSVG(\`
    <rect x="16" y="16" width="12" height="12" rx="2" stroke="currentColor"/>
    <rect x="36" y="16" width="12" height="12" rx="2" stroke="currentColor"/>
    <rect x="16" y="36" width="12" height="12" rx="2" fill="var(--cyan)" stroke="var(--cyan)"/>
    <!-- Inner glow effect for active square -->
    <rect x="18" y="38" width="8" height="8" fill="var(--bg)" stroke="none"/>
    <rect x="36" y="36" width="12" height="12" rx="2" stroke="currentColor"/>
  \`),

  // 12. Hyper Tap: concentric target circles
  'hyper-tap': createSVG(\`
    <circle cx="32" cy="32" r="24" stroke="currentColor" stroke-dasharray="4 4"/>
    <circle cx="32" cy="32" r="16" stroke="var(--cyan)"/>
    <circle cx="32" cy="32" r="8" fill="var(--danger)" stroke="var(--danger)"/>
    <line x1="32" y1="4" x2="32" y2="12" stroke="currentColor"/>
    <line x1="32" y1="52" x2="32" y2="60" stroke="currentColor"/>
    <line x1="4" y1="32" x2="12" y2="32" stroke="currentColor"/>
    <line x1="52" y1="32" x2="60" y2="32" stroke="currentColor"/>
  \`),

  // 13. Gravity Flip: split arrow pointing upward and downward
  'gravity-flip': createSVG(\`
    <!-- Divider -->
    <line x1="10" y1="32" x2="54" y2="32" stroke="var(--neon)" stroke-width="4" stroke-linecap="square"/>
    <!-- Up Arrow -->
    <path d="M32 26 L32 10 M24 18 L32 10 L40 18" stroke="var(--cyan)" stroke-width="3"/>
    <!-- Down Arrow -->
    <path d="M32 38 L32 54 M24 46 L32 54 L40 46" stroke="var(--danger)" stroke-width="3"/>
  \`),

  // 14. Chain Burst: connected colored orbs
  'chain-burst': createSVG(\`
    <!-- Links -->
    <line x1="24" y1="24" x2="40" y2="24" stroke="currentColor" stroke-width="2"/>
    <line x1="24" y1="24" x2="32" y2="40" stroke="currentColor" stroke-width="2"/>
    <line x1="40" y1="24" x2="32" y2="40" stroke="currentColor" stroke-width="2"/>
    <!-- Orbs -->
    <circle cx="24" cy="24" r="6" fill="var(--bg)" stroke="var(--danger)" stroke-width="3"/>
    <circle cx="40" cy="24" r="6" fill="var(--bg)" stroke="var(--cyan)" stroke-width="3"/>
    <circle cx="32" cy="40" r="6" fill="var(--bg)" stroke="var(--neon)" stroke-width="3"/>
    <circle cx="32" cy="40" r="2" fill="var(--neon)" stroke="none"/>
  \`),

  // 15. Reflex Rush: lightning bolt inside an eye
  'reflex-rush': createSVG(\`
    <!-- Eye -->
    <path d="M8 32 Q32 12 56 32 Q32 52 8 32" fill="none" stroke="currentColor" stroke-width="2"/>
    <circle cx="32" cy="32" r="12" fill="none" stroke="var(--cyan)"/>
    <!-- Lightning -->
    <path d="M34 18 L26 32 L34 32 L30 46 L40 28 L32 28 Z" fill="var(--danger)" stroke="var(--danger)"/>
  \`),

  // 16. Tile Runner: dark piano tiles
  'tile-runner': createSVG(\`
    <rect x="12" y="8" width="12" height="48" rx="1" fill="none" stroke="currentColor"/>
    <rect x="26" y="8" width="12" height="48" rx="1" fill="none" stroke="currentColor"/>
    <rect x="40" y="8" width="12" height="48" rx="1" fill="none" stroke="currentColor"/>
    <!-- Active Tiles -->
    <rect x="12" y="24" width="12" height="20" fill="var(--cyan)" stroke="none"/>
    <rect x="26" y="40" width="12" height="16" fill="currentColor" stroke="none"/>
    <rect x="40" y="12" width="12" height="24" fill="var(--neon)" stroke="none"/>
  \`),

  // 17. Beat Drop: musical notes dropping toward a line
  'beat-drop': createSVG(\`
    <!-- Target Line -->
    <line x1="12" y1="48" x2="52" y2="48" stroke="var(--danger)" stroke-width="3" stroke-dasharray="4 2"/>
    <!-- Tracks -->
    <line x1="20" y1="8" x2="20" y2="56" stroke="currentColor" stroke-width="1" opacity="0.3"/>
    <line x1="32" y1="8" x2="32" y2="56" stroke="currentColor" stroke-width="1" opacity="0.3"/>
    <line x1="44" y1="8" x2="44" y2="56" stroke="currentColor" stroke-width="1" opacity="0.3"/>
    <!-- Notes -->
    <path d="M20 28 L26 24 V16" stroke="var(--cyan)" stroke-width="2"/>
    <circle cx="20" cy="28" r="3" fill="var(--cyan)" stroke="none"/>
    
    <path d="M32 40 L38 36 V28" stroke="var(--neon)" stroke-width="2"/>
    <circle cx="32" cy="40" r="3" fill="var(--neon)" stroke="none"/>
    
    <path d="M44 16 L50 12 V4" stroke="currentColor" stroke-width="2"/>
    <circle cx="44" cy="16" r="3" fill="currentColor" stroke="none"/>
  \`),

  // 18. Slide Forge: merging numbered tiles
  'slide-forge': createSVG(\`
    <rect x="16" y="16" width="32" height="32" rx="4" fill="none" stroke="currentColor"/>
    <!-- Sliding tiles -->
    <rect x="20" y="20" width="10" height="10" rx="2" fill="var(--cyan)" stroke="none"/>
    <text x="25" y="27" fill="var(--bg)" stroke="none" font-family="monospace" font-size="8" font-weight="bold" text-anchor="middle">2</text>
    
    <rect x="34" y="20" width="10" height="10" rx="2" fill="var(--cyan)" stroke="none"/>
    <text x="39" y="27" fill="var(--bg)" stroke="none" font-family="monospace" font-size="8" font-weight="bold" text-anchor="middle">2</text>
    
    <!-- Merge Arrow -->
    <path d="M26 36 Q32 40 38 36" fill="none" stroke="var(--neon)" stroke-width="2"/>
    <polygon points="38,36 34,34 36,40" fill="var(--neon)" stroke="none"/>
  \`),

  // 19. Orb Pop Deluxe: clustered colored bubbles with spark effects
  'orb-pop-deluxe': createSVG(\`
    <!-- Bubbles -->
    <circle cx="32" cy="24" r="8" fill="rgba(6,182,212,0.1)" stroke="var(--cyan)" stroke-width="2"/>
    <circle cx="22" cy="34" r="8" fill="rgba(139,92,246,0.1)" stroke="var(--neon)" stroke-width="2"/>
    <circle cx="42" cy="34" r="8" fill="rgba(239,68,68,0.1)" stroke="var(--danger)" stroke-width="2"/>
    <!-- Highlight reflections -->
    <path d="M28 20 A 4 4 0 0 1 32 18" stroke="var(--bg)" stroke-width="2"/>
    <path d="M18 30 A 4 4 0 0 1 22 28" stroke="var(--bg)" stroke-width="2"/>
    <path d="M38 30 A 4 4 0 0 1 42 28" stroke="var(--bg)" stroke-width="2"/>
    <!-- Spark -->
    <path d="M32 8 L32 2 M28 4 L36 4" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="32" cy="4" r="1" fill="currentColor"/>
  \`)
};
