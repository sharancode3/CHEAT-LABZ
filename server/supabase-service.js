import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder-project.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'placeholderanonkey';

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Room State ──────────────────────────────────────────────────────────────
export async function saveRoomState(room) {
  try {
    const { data, error } = await supabase
      .from('game_rooms')
      .upsert({
        code: room.code,
        game_id: room.gameId,
        host_id: room.players.find(p => p.isHost)?.socketId || 'unknown',
        players: JSON.stringify(room.players.map(p => ({
          socketId: p.socketId,
          displayName: p.displayName,
          color: p.color
        }))),
        state: room.state,
        game_state: JSON.stringify(room.gameState || {}),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }, { onConflict: 'code' });
    
    if (error) console.error('[Supabase] saveRoomState error:', error.message);
  } catch (err) {
    console.error('[Supabase] saveRoomState exception:', err);
  }
}

// ── Scores & Leaderboards ───────────────────────────────────────────────────
export async function saveScore(gameId, playerId, displayName, score) {
  try {
    const { data, error } = await supabase
      .from('leaderboards')
      .insert({
        game_id: gameId,
        player_id: playerId,
        display_name: displayName,
        score: parseInt(score) || 0,
        created_at: new Date().toISOString()
      });
    
    if (error) console.error('[Supabase] saveScore error:', error.message);
  } catch (err) {
    console.error('[Supabase] saveScore exception:', err);
  }
}

// ── Players & Identity ──────────────────────────────────────────────────────
export async function registerPlayer(uid, displayName) {
  const { data, error } = await supabase
    .from('players')
    .upsert({ 
      uid, 
      display_name: displayName, 
      updated_at: new Date().toISOString() 
    });
  if (error) throw error;
  return data;
}

export async function fetchPlayer(uid) {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('uid, display_name, coins, streak, last_seen')
      .eq('uid', uid)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    if (err.code === '42703') { // Column does not exist
      const { data, error } = await supabase
        .from('players')
        .select('uid, display_name')
        .eq('uid', uid)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        return {
          ...data,
          coins: 0,
          streak: 0,
          last_seen: new Date().toISOString()
        };
      }
      return null;
    }
    throw err;
  }
}

// ── Game Stats (Runs, Levels, Best Scores) ───────────────────────────────
export async function saveGameStats(uid, gameId, displayName, score, level) {
  try {
    // 1. Save to global leaderboards for score run history
    await saveScore(gameId, uid, displayName, score);

    // 2. Fetch existing stats for aggregation
    const { data: existing, error: fetchErr } = await supabase
      .from('game_stats')
      .select('best_score, total_runs, highest_level')
      .eq('uid', uid)
      .eq('game_id', gameId)
      .maybeSingle();

    if (fetchErr && fetchErr.code !== 'PGRST205') {
      console.error('[Supabase] Fetch game stats error:', fetchErr.message);
    }

    const runs = existing ? existing.total_runs + 1 : 1;
    const best = existing ? Math.max(existing.best_score, score) : score;
    const highestLvl = existing ? Math.max(existing.highest_level, level) : level;

    // 3. Upsert stats
    const { error: upsertErr } = await supabase
      .from('game_stats')
      .upsert({
        uid,
        game_id: gameId,
        best_score: best,
        total_runs: runs,
        highest_level: highestLvl,
        last_played: new Date().toISOString()
      });

    if (upsertErr) {
      console.warn('[Supabase] Save game stats schema missing. Fallback local execution active.');
    }
  } catch (err) {
    console.error('[Supabase] saveGameStats exception:', err);
  }
}

export async function fetchUserStats(uid) {
  try {
    const { data: stats, error: statsErr } = await supabase
      .from('game_stats')
      .select('game_id, best_score, total_runs, highest_level, last_played')
      .eq('uid', uid);

    if (statsErr) throw statsErr;

    let player;
    const res = await supabase
      .from('players')
      .select('display_name, coins, streak')
      .eq('uid', uid)
      .maybeSingle();

    if (res.error) {
      if (res.error.code === '42703') {
        const resFallback = await supabase
          .from('players')
          .select('display_name')
          .eq('uid', uid)
          .maybeSingle();
        if (resFallback.error) throw resFallback.error;
        player = resFallback.data ? { ...resFallback.data, coins: 0, streak: 0 } : null;
      } else {
        throw res.error;
      }
    } else {
      player = res.data;
    }

    return {
      stats: stats || [],
      coins: player ? player.coins : 0,
      streak: player ? player.streak : 0,
      displayName: player ? player.display_name : 'Player'
    };
  } catch (err) {
    console.warn('[Supabase] fetchUserStats schema cache missing. Reverting to local storage mode.');
    return null;
  }
}

export async function fetchGlobalLeaderboard(gameId) {
  try {
    const { data, error } = await supabase
      .from('leaderboards')
      .select('player_id, display_name, score, created_at')
      .eq('game_id', gameId)
      .order('score', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[Supabase] fetchGlobalLeaderboard error:', err.message);
    return [];
  }
}

// ── Currency/Streak Syncing ─────────────────────────────────────────────────
export async function syncCurrencyAndStreak(uid, coins, streak, lastSeen) {
  try {
    const { error } = await supabase
      .from('players')
      .update({
        coins,
        streak,
        last_seen: lastSeen,
        updated_at: new Date().toISOString()
      })
      .eq('uid', uid);

    if (error) throw error;
  } catch (err) {
    console.warn('[Supabase] syncCurrencyAndStreak warning (columns may not exist yet):', err.message);
  }
}
