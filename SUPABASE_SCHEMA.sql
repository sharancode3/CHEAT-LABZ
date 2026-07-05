-- ================================================================
-- CHEAT LABZ Supabase Database Schema
-- Phase 7: Real DB Layer & Stats Persistence
-- Run these DDL statements in the Supabase SQL Editor.
-- ================================================================

-- 1. Create players table (Identity, coins, streak)
CREATE TABLE IF NOT EXISTS players (
  uid text PRIMARY KEY,
  display_name text NOT NULL,
  coins integer DEFAULT 0 NOT NULL,
  streak integer DEFAULT 0 NOT NULL,
  last_seen timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public upsert players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update players" ON players FOR UPDATE USING (true);

-- 2. Create game_stats table (UID per game statistics)
CREATE TABLE IF NOT EXISTS game_stats (
  uid text NOT NULL,
  game_id text NOT NULL,
  best_score integer DEFAULT 0 NOT NULL,
  total_runs integer DEFAULT 0 NOT NULL,
  highest_level integer DEFAULT 1 NOT NULL,
  last_played timestamp with time zone DEFAULT now(),
  PRIMARY KEY (uid, game_id)
);

ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read game_stats" ON game_stats FOR SELECT USING (true);
CREATE POLICY "Allow public upsert game_stats" ON game_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update game_stats" ON game_stats FOR UPDATE USING (true);

-- 3. Create leaderboards table (Persistent score history)
CREATE TABLE IF NOT EXISTS leaderboards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id text NOT NULL,
  player_id text NOT NULL,
  display_name text NOT NULL,
  score integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read leaderboards" ON leaderboards FOR SELECT USING (true);
CREATE POLICY "Allow public insert leaderboards" ON leaderboards FOR INSERT WITH CHECK (true);

-- 4. Create coin_history table (Transaction log for coins)
CREATE TABLE IF NOT EXISTS coin_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  uid text NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE coin_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read coin_history" ON coin_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert coin_history" ON coin_history FOR INSERT WITH CHECK (true);

-- 5. Create game_rooms table (Active multiplayer lobbies)
CREATE TABLE IF NOT EXISTS game_rooms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  game_id text NOT NULL,
  host_id text NOT NULL,
  players jsonb DEFAULT '[]'::jsonb, -- Kept for backward compatibility
  state text DEFAULT 'waiting',
  game_state jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone
);

ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read game_rooms" ON game_rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert game_rooms" ON game_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update game_rooms" ON game_rooms FOR UPDATE USING (true);

-- 6. Create room_players table (Fine-grained multiplayer lobby membership)
CREATE TABLE IF NOT EXISTS room_players (
  room_code text NOT NULL,
  player_uid text NOT NULL,
  display_name text NOT NULL,
  is_ready boolean DEFAULT false NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (room_code, player_uid)
);

ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read room_players" ON room_players FOR SELECT USING (true);
CREATE POLICY "Allow public insert room_players" ON room_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update room_players" ON room_players FOR UPDATE USING (true);
CREATE POLICY "Allow public delete room_players" ON room_players FOR DELETE USING (true);
