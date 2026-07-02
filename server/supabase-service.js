import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder-project.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'placeholderanonkey';

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

export async function saveScore(gameId, playerId, displayName, score) {
  try {
    const { data, error } = await supabase
      .from('leaderboards')
      .insert({
        game_id: gameId,
        player_id: playerId,
        display_name: displayName,
        score: score,
        created_at: new Date().toISOString()
      });
    
    if (error) console.error('[Supabase] saveScore error:', error.message);
  } catch (err) {
    console.error('[Supabase] saveScore exception:', err);
  }
}

export async function registerPlayer(uid, displayName) {
  const { data, error } = await supabase
    .from('players')
    .upsert({ uid, display_name: displayName, updated_at: new Date().toISOString() });
  if (error) throw error;
  return data;
}

export async function fetchPlayer(uid) {
  const { data, error } = await supabase
    .from('players')
    .select('uid, display_name')
    .eq('uid', uid)
    .maybeSingle();
  if (error) throw error;
  return data;
}
