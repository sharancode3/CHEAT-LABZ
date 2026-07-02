import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'placeholderanonkey';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Setup presence tracking helper
export function initSupabasePresence(playerId, onPresenceSync) {
  const channel = supabase.channel('online-users');
  
  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    if (typeof onPresenceSync === 'function') {
      onPresenceSync(Object.keys(state).length);
    }
  });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ user_id: playerId, online_at: new Date().toISOString() });
    }
  });

  return channel;
}
