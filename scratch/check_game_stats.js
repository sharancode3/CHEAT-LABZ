import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data, error } = await supabase.from('game_stats').select('*').limit(1);
  console.log("game_stats error:", error);
  console.log("game_stats data:", data);

  const { data: data2, error: error2 } = await supabase.from('players').select('coins, streak, last_seen').limit(1);
  console.log("players custom columns error:", error2);
  console.log("players custom columns data:", data2);
}

check();
