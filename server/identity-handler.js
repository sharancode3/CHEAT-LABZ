import { registerPlayer, fetchPlayer } from './supabase-service.js';

// Simple memory-based rate limiter
const rateLimits = new Map(); // ip -> { count, windowStart }

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutes
  const maxRequests = 5;

  let limit = rateLimits.get(ip);
  if (!limit || (now - limit.windowStart > windowMs)) {
    limit = { count: 1, windowStart: now };
    rateLimits.set(ip, limit);
    return true;
  }

  if (limit.count >= maxRequests) {
    return false;
  }

  limit.count++;
  return true;
}

export function registerIdentityRoutes(app) {
  app.post('/api/identity/register', async (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const { uid, displayName } = req.body || {};

    // Validate UID (UUID v4 style: 36 chars, alphanumeric and hyphens)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    // Also allow a fallback 32-char hex string just in case fallback was used
    const fallbackRegex = /^[0-9a-f]{32}$/i;

    if (!uid || (!uuidRegex.test(uid) && !fallbackRegex.test(uid))) {
      return res.status(400).json({ error: 'Invalid UID format.' });
    }

    // Validate Display Name
    if (!displayName || typeof displayName !== 'string') {
      return res.status(400).json({ error: 'Display name is required.' });
    }

    const cleaned = displayName.trim().replace(/[^a-zA-Z0-9_\-\s]/g, '');
    if (cleaned.length < 3 || cleaned.length > 16) {
      return res.status(400).json({ error: 'Display name must be between 3 and 16 characters.' });
    }

    try {
      await registerPlayer(uid, cleaned);
      res.json({ success: true, displayName: cleaned });
    } catch (e) {
      console.error('[API] Register player exception:', e);
      res.status(500).json({ error: 'Database error registering player.' });
    }
  });

  app.get('/api/identity/validate', async (req, res) => {
    const { uid } = req.query || {};
    if (!uid) {
      return res.status(400).json({ error: 'UID is required.' });
    }

    try {
      const player = await fetchPlayer(uid);
      if (player) {
        res.json({ exists: true, displayName: player.display_name });
      } else {
        res.json({ exists: false });
      }
    } catch (e) {
      console.error('[API] Validate player exception:', e);
      res.status(500).json({ error: 'Database error validating player.' });
    }
  });
}
