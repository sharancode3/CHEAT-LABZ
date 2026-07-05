import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
  console.log("Checking players table...");
  const p = await supabase.from('players').select('*').limit(5);
  console.log("players error:", p.error);
  console.log("players data:", p.data);

  console.log("Checking leaderboards table...");
  const l = await supabase.from('leaderboards').select('*').limit(5);
  console.log("leaderboards error:", l.error);
  console.log("leaderboards data:", l.data);

  console.log("Checking game_rooms table...");
  const r = await supabase.from('game_rooms').select('*').limit(5);
  console.log("game_rooms error:", r.error);
  console.log("game_rooms data:", r.data);
}

test();
