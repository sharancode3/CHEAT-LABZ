-- Create game_rooms table
CREATE TABLE IF NOT EXISTS game_rooms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  game_id text NOT NULL,
  host_id text NOT NULL,
  players jsonb DEFAULT '[]'::jsonb,
  state text DEFAULT 'waiting',
  game_state jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone
);

-- Enable RLS but allow open access for games
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON game_rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON game_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON game_rooms FOR UPDATE USING (true);

-- Create leaderboards table
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

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  uid text PRIMARY KEY,
  display_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public upsert players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update players" ON players FOR UPDATE USING (true);
