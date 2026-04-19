# Crazy Type (Monkey Type)

Typing game with falling words, streak-based scoring, power-ups, timer & endless modes, hotseat multiplayer, and persistent high score.

## Assumptions & Defaults
- Base spawn interval 1400ms accelerates per level.
- Levels advance every 14 words cleared/missed.
- Word HP = length * 1; longer words yield more points.
- Power-up chance 5% on spawn or clear.
- Timer modes: 60s / 120s; endless has no time cap.
- Hotseat: toggles active player every 30s (simple demo) and both players share keyboard.

## Features
- Difficulty tiers (easy/medium/hard) with weighted speed ranges.
- Lives (3). Word reaching bottom costs a life.
- Power-ups: DOUBLE (2x points), SLOW (slow time), CLEAR (remove all words).
- Streak multiplier up to 2.5x; partial bonus when words destroyed.
- Upload custom word list (.txt) — whitespace separated words <18 chars.
- Export score JSON.
- Pause/Resume, Restart, Fullscreen, Mute.
- High score & longest streak saved in `localStorage`.
- Analytics stub `sendAnalytics` logs key events.
- Debug panel: dt, spawn interval, counts.

## Controls
Keyboard:
- SPACE: Start
- ESC / P: Pause/Resume
- F11 or Fullscreen button: Fullscreen
- A–Z keys: Type letters
Hotseat rotates active player automatically.

## Touch (mobile)
- Tap Start button then on-screen keyboard provides input (system-level). Typing requires focusing body; fallback is device keyboard; (Advanced custom keyboard omitted for brevity).

## Configuration
Adjust spawn, power-up, and level settings in `main.js` CONFIG object.

## Persistence Keys
- High score: `crazytype_highscore`
- Longest streak: `crazytype_longeststreak`

## Analytics Integration
Replace `sendAnalytics` in `shared/utils.js` with real network calls.

## Playtesting Scenarios
1. Let words fall without typing – observe lives decrement and game over.
2. Rapid correct typing – verify streak growth, multiplier effect.
3. Trigger power-ups (clear screen, double, slow) – confirm visual badges and temporary effect.
4. Pause/resume – overlay appears/disappears; game state freezes.
5. Upload custom word list – words update to new set.

## Adding Words
Add to `wordlist.js` or upload a file.

## Extending
- Implement more nuanced difficulty scaling.
- Add achievements and UI skin themes.

