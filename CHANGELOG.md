# CHANGELOG

## 2026-03-05 — Phase 2 Module 1 Foundations (Games + Arena + Daily)
- Added 5 new game entries to the lobby and runner pipeline: `gravityflip`, `chainburst`, `reflexrush`, `tilerunner`, `beatdrop`.
- Implemented initial playable mode logic for the 5 new games in `games/play.js`, including scoring, fail states, and mode-specific controls.
- Added Daily Challenges system in `script.js` with date-seeded generation, live reset countdown, local progress storage, challenge launch routing, completion handling, and daily streak updates.
- Added Arena Mode shell in `index.html` + `style.css` + `script.js` with game select, 3-round session flow, hazard assignment, round transitions, score breakdown, PB tracking, and local top-5 mock/real leaderboard merge.
- Added runner-side Arena flags in `games/play.js` (`arenaDuration`, speed/multiplier/hazards) with round-end messaging back to the parent view.
- Added challenge context support in `games/play.js` with in-run completion detection (`score`, `survive`, `combo`, `level`) and completion postMessage events.
- Added accessibility/mobile baseline improvements: `aria-label` on icon-only header buttons, updated viewport meta for gameplay, safe-area-aware containers, reduced-motion fallback, and touch-action safeguards.

## 2026-03-05 — Gameplay QA & Mode Stabilization
- Upgraded core mode logic in `games/play.js` for `pixeldodge`, `stackblitz`, `memorygrid`, `hypertap`, and `neonpong` with cleaner pacing, richer feedback, and improved match flow.
- Added `dodgeblitz` mode metadata + runtime behavior and aligned shared control descriptions for updated modes.
- Fixed score inflation bugs in survival modes by replacing frame-based milestone checks with one-time milestone tracking for exits/passed counts.
- Corrected `dodgeblitz` passive scoring from per-frame accumulation to true once-per-second increments.
- Improved `pixeldodge` collision detection to match visible sprite sizes for fair hit registration.
- Applied targeted balancing pass: smoother early spawn ramps in `pixeldodge`/`dodgeblitz`, reduced late-game speed spikes in `stackblitz`, less punitive fail state in `memorygrid`, stabilized final score consistency in `hypertap`, and capped velocity growth + softened AI tracking in `neonpong`.
- Synced lobby card descriptions/controls in `script.js` with the latest in-game mechanics for `memorygrid`, `hypertap`, and `neonpong`.
- Normalized lobby control strings across the full game registry in `script.js` to match `games/play.js` metadata wording and reduce user-facing instruction drift.
- Applied final microcopy consistency polish across user-facing text (`index.html`, `script.js`, `games/play.js`) for punctuation/casing alignment in modal text, reset confirmations, and end-screen feedback.
- Verified diagnostics for updated files (`games/play.js`, `script.js`, `style.css`, `index.html`) with no reported errors.

## 2026-02-26 — Full Gaming UI/UX Redesign
- Redesigned `index.html`, `style.css`, and `script.js` with a new landing experience, spotlight cards, category filters, search, and improved navigation actions.
- Redesigned authentication experience in `login.html`, `login.css`, and `login.js` with improved visual hierarchy, password visibility toggles, guest entry, and direct portal routing after auth.
- Rebuilt `register.html` to match the new auth system and styling.
- Redesigned `portal.html`, `portal.style.css`, and `portal.app.js` into a game command center layout with player stats, category pills, live filtering, and polished fullscreen game shell controls (pause/resume/replay/exit).
- Redesigned `about.html` to match the new visual language and structure.
- Redesigned `tests/tests.html` into an interactive styled utility test runner while preserving test coverage behavior.
- Updated `README.md` sections to reflect the new architecture, UX flow, and troubleshooting notes.

## Initial Multi-Game Expansion (Crazy Type)
- Added shared modules: `soundManager.js`, `utils.js` with analytics stub and helpers.
- Implemented Crazy Type typing game: falling words, HP, difficulty tiers, timer & endless modes, streak multiplier, power-ups (double/slow/clear), lives, custom word list upload, score export, pause/resume, fullscreen, mute, high score & longest streak persistence.
- Added debug overlay and hotseat rotation mode.
- Created tests harness `tests/tests.html` for shared utils.
- Added per-game README and initial CHANGELOG entry.
