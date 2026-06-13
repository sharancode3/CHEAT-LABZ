const STORAGE_PREFIX = 'cheatLabz_';

function key(name) {
  return `${STORAGE_PREFIX}${name}`;
}

function safeParse(raw, fallback = null) {
  if (raw == null) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function read(name, fallback = null) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }

  const value = window.localStorage.getItem(key(name));
  return value == null ? fallback : safeParse(value, fallback);
}

function write(name, value) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return value;
  }

  window.localStorage.setItem(key(name), JSON.stringify(value));
  return value;
}

function remove(name) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  window.localStorage.removeItem(key(name));
}

function merge(name, patch) {
  const current = read(name, {});
  const next = { ...current, ...patch };
  return write(name, next);
}

function increment(name, amount = 1) {
  const current = Number(read(name, 0));
  const next = current + amount;
  write(name, next);
  return next;
}

function appendToList(name, value, limit = Infinity) {
  const current = Array.isArray(read(name, [])) ? read(name, []) : [];
  const next = [...current, value];

  if (Number.isFinite(limit)) {
    return write(name, next.slice(-limit));
  }

  return write(name, next);
}

function todayUtcKey(date = new Date()) {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

function defaultGameStats() {
  return {
    bestScore: 0,
    runs: 0,
    lastPlayedAt: null,
    previousBest: 0,
    arenaBest: 0,
    totalTime: 0,
  };
}

function getGameStats(gameId) {
  return { ...defaultGameStats(), ...read(`stats_${gameId}`, {}) };
}

function setGameStats(gameId, stats) {
  return write(`stats_${gameId}`, { ...defaultGameStats(), ...stats });
}

function recordRun(gameId, score, extra = {}) {
  const stats = getGameStats(gameId);
  const bestScore = Math.max(stats.bestScore, Number(score) || 0);
  const nextStats = {
    ...stats,
    ...extra,
    runs: stats.runs + 1,
    previousBest: stats.bestScore,
    bestScore,
    lastPlayedAt: new Date().toISOString(),
  };

  setGameStats(gameId, nextStats);
  return nextStats;
}

function getBestScore(gameId) {
  return Number(getGameStats(gameId).bestScore || 0);
}

function setBestScore(gameId, score) {
  const stats = getGameStats(gameId);
  return setGameStats(gameId, {
    ...stats,
    bestScore: Math.max(stats.bestScore, Number(score) || 0),
    lastPlayedAt: new Date().toISOString(),
  });
}

function getDailyStatus(date = new Date()) {
  return read(`daily_${todayUtcKey(date)}`, {});
}

function setDailyStatus(payload, date = new Date()) {
  return write(`daily_${todayUtcKey(date)}`, payload);
}

function resetGame(gameId) {
  remove(`stats_${gameId}`);
}

function resetAll(prefix = STORAGE_PREFIX) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const keys = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const storageKey = window.localStorage.key(index);
    if (storageKey && storageKey.startsWith(prefix)) {
      keys.push(storageKey);
    }
  }

  keys.forEach((storageKey) => window.localStorage.removeItem(storageKey));
}

function listGameStats() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  const stats = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const storageKey = window.localStorage.key(index);
    if (!storageKey || !storageKey.startsWith(`${STORAGE_PREFIX}stats_`)) {
      continue;
    }

    const gameId = storageKey.replace(`${STORAGE_PREFIX}stats_`, '');
    const value = read(`stats_${gameId}`, null);
    if (value) {
      stats.push({ gameId, ...defaultGameStats(), ...value });
    }
  }

  return stats;
}

function getMostPlayedGame() {
  const stats = listGameStats();
  return stats.sort((left, right) => right.runs - left.runs)[0] || null;
}

function getFavoriteCategory() {
  const stats = listGameStats();
  const counts = new Map();

  stats.forEach((entry) => {
    const category = entry.category || 'unknown';
    counts.set(category, (counts.get(category) || 0) + Math.max(1, entry.runs || 0));
  });

  let favorite = null;
  counts.forEach((value, category) => {
    if (!favorite || value > favorite.value) {
      favorite = { category, value };
    }
  });

  return favorite;
}

function getLastPlayedGame() {
  const stats = listGameStats();
  return stats
    .filter((entry) => Boolean(entry.lastPlayedAt))
    .sort((left, right) => new Date(right.lastPlayedAt) - new Date(left.lastPlayedAt))[0] || null;
}

function getBestStreak() {
  const streak = read('challengeStreak', { count: 0, lastCompleted: null });
  return Number(streak?.count || 0);
}

export const Storage = {
  prefix: STORAGE_PREFIX,
  key,
  read,
  write,
  remove,
  merge,
  increment,
  appendToList,
  todayUtcKey,
  getGameStats,
  setGameStats,
  recordRun,
  getBestScore,
  setBestScore,
  getDailyStatus,
  setDailyStatus,
  listGameStats,
  getMostPlayedGame,
  getFavoriteCategory,
  getLastPlayedGame,
  getBestStreak,
  resetGame,
  resetAll,
};

export {
  STORAGE_PREFIX,
  key,
  read,
  write,
  remove,
  merge,
  increment,
  appendToList,
  todayUtcKey,
  getGameStats,
  setGameStats,
  recordRun,
  getBestScore,
  setBestScore,
  getDailyStatus,
  setDailyStatus,
  listGameStats,
  getMostPlayedGame,
  getFavoriteCategory,
  getLastPlayedGame,
  getBestStreak,
  resetGame,
  resetAll,
};

export default Storage;