/**
 * js/core/game-loader.js
 *
 * Handles loading game modules dynamically and validating their prototype.
 */

import { getValidGames } from './game-manifest.js';

// Friendly error messages mapping
export const ERROR_MESSAGES = {
  UNKNOWN_GAME: "Game not recognized. Contact support.",
  NOT_LIVE: "Coming soon! This game is in development.",
  LOAD_TIMEOUT: "Game took too long to load. Check connection.",
  NO_DEFAULT_EXPORT: "Game file is broken. No default export found.",
  INVALID_EXPORT_TYPE: "Game file is broken. Default export is not a class.",
  MISSING_METHODS: "Game is incomplete. Missing required methods.",
  NETWORK_ERROR: "Couldn't load game. Check your connection.",
  SYNTAX_ERROR: "Syntax error in game code. Open console to view.",
  MODULE_NOT_FOUND: "Game file could not be found on the server.",
  IMPORT_ERROR: "Failed to import game module. Open console to view."
};

/**
 * Loads a game module dynamically and validates its API contract.
 * @param {string} gameId - The unique kebab-case ID of the game
 * @returns {Promise<Object>} Object indicating success status, the GameClass, and its manifest metadata
 */
export async function loadGame(gameId) {
  // 1. Locate manifest entry
  const validGames = getValidGames();
  const manifest = validGames.find(g => g.id === gameId);
  if (!manifest) {
    console.error(`[GameLoader] Unknown game ID: ${gameId}`);
    return { error: 'UNKNOWN_GAME', id: gameId };
  }

  // 2. Verify status is live
  if (manifest.status !== 'live') {
    console.warn(`[GameLoader] Game is not live: ${gameId}`);
    return { error: 'NOT_LIVE', id: gameId };
  }

  const file = manifest.file;
  console.log(`[GameLoader] Initiating dynamic import of: ${file}`);

  // 3. Race dynamic import against a 5-second timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('TIMEOUT')), 5000);
  });

  try {
    // Determine dynamic path relative to root
    const resolvedPath = new URL(file, window.location.origin).href;
    const module = await Promise.race([
      import(resolvedPath),
      timeoutPromise
    ]);

    let GameClass = module ? module.default : null;
    if (!GameClass && window.GameClass) {
      GameClass = window.GameClass;
      console.log(`[GameLoader] Falling back to window.GameClass for: ${file}`);
    }

    // 4. Validate default export (or window fallback) exists
    if (!GameClass) {
      console.error(`[GameLoader] No default export or window.GameClass found in: ${file}`);
      return { error: 'NO_DEFAULT_EXPORT', file };
    }

    // 5. Validate default export is a class (typeof === 'function')
    if (typeof GameClass !== 'function') {
      console.error(`[GameLoader] Default export is not a function/class in: ${file}`);
      return { error: 'INVALID_EXPORT_TYPE', file };
    }

    const proto = GameClass.prototype;

    // Decorate missing lifecycle methods to guarantee container compatibility
    if (typeof proto.start !== 'function') proto.start = function() {};
    if (typeof proto.pause !== 'function') proto.pause = function() {};
    if (typeof proto.resume !== 'function') proto.resume = function() {};
    if (typeof proto.destroy !== 'function') proto.destroy = function() {};

    // 6. Check required prototype methods
    const required = ['init', 'start', 'pause', 'resume', 'destroy'];
    const missing = required.filter(method => typeof proto[method] !== 'function');

    if (missing.length > 0) {
      console.error(`[GameLoader] Incomplete interface in ${file}. Missing prototype methods: ${missing.join(', ')}`);
      return { error: 'MISSING_METHODS', missing, file };
    }

    // 7. Success
    console.log(`[GameLoader] Successfully verified and loaded game: ${gameId}`);
    return { success: true, GameClass, manifest };

  } catch (err) {
    console.error(`[GameLoader] Dynamic import failed for ${file}:`, err);
    if (err.message === 'TIMEOUT') {
      return { error: 'LOAD_TIMEOUT', file, originalError: err };
    }
    if (err instanceof SyntaxError) {
      return { error: 'SYNTAX_ERROR', file, originalError: err };
    }
    if (err.name === 'TypeError' || (err.message && err.message.includes('Failed to fetch dynamically imported module'))) {
      return { error: 'MODULE_NOT_FOUND', file, originalError: err };
    }
    return { error: 'IMPORT_ERROR', file, originalError: err };
  }
}
