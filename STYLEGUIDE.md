# Neon Core Style Guide

## Palette
- Electric Blue: `#00CFFF`
- Neon Purple: `#A020F0`
- Hyper Pink: `#FF007F`
- Jet Black: `#000000`
- Dark Charcoal: `#0D0D0D`
- Accent Gradient: linear-gradient(135deg,#00CFFF,#A020F0 45%,#FF007F)

## Typography
- Display: Russo One (headings, hero)
- Body: Inter 400 / 600 / 700 / 800
- Letter spacing for headings: .05em to .3em
- Small caps / uppercase for navigation & category labels.

## Spacing Scale (px)
- 4, 8, 12, 16, 22, 30, 40, 60, 90, 120

## Radius
- Base: 14px buttons
- Cards / panels: 22–28px
- Mascot / hero object: 40px

## Shadow & Glow
- Base Shadow: `0 10px 40px -10px rgba(0,0,0,.6)`
- Neon Edge: `0 0 22px 4px rgba(0,207,255,.4)` (on active states)
- Mascot Glow: radial gradient + blur(40px)

## Glass Panels
Background: `rgba(16,19,29,0.50)`
Backdrop Filter: `blur(12px) saturate(140%)`
Border: `1px solid rgba(255,255,255,.06)`

## Animations
- Pulse: Gentle brightness oscillation for CTAs.
- Float: Hero assets slow vertical drift.
- Ring: Expanding energy rings under hero CTA area.
- Glitch: Clip-path shifting on headings.
- Hue Shift: Global ambient gradient rotation every 10s.
- Row Flash: Leaderboard update flash.
- Spark Fly: Category tile hover sparks.

## Responsive Targets
- 1100px: Stack hero columns.
- 780px: Shrink cards, video height.
- 520px: Reduce tile width & heading size.

## Interaction Notes
- All actionable elements show hover transform / glow.
- Back to top only appears after 60% viewport scroll.
- Theme toggle persists with `localStorage` key `neoncore_theme`.
- Email signup stored under `neoncore_email`.

## Accessibility
- Focus ring triggered on first Tab press (`show-focus` class).
- Semantic landmarks: header (hero), sections with aria-labels, footer.
- High contrast gradients maintained in light mode by palette swap.

## Extensibility
Add new games by pushing to `games` array in `script.js`. Provide an SVG under `assets/thumbs` for quick visual integration.
