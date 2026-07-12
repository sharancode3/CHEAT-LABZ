import dotenv from 'dotenv';
dotenv.config();

const rawOrigins = process.env.ALLOWED_ORIGINS || '';
const parsedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);

const baseOrigins = [
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

// Deduplicate origins
export const ALLOWED_ORIGINS = [...new Set([...parsedOrigins, ...baseOrigins])];

export const CONFIG = {
  PORT: process.env.PORT || 4000,
  ENV: process.env.NODE_ENV || 'development',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY || '',
  // Socket Config
  PING_TIMEOUT: 20000,
  PING_INTERVAL: 10000,
  // Rooms
  ROOM_INACTIVE_TIMEOUT: 60 * 60 * 1000, // 1 hour for WAITING
  ROOM_FINISHED_TIMEOUT: 30 * 60 * 1000, // 30 min for FINISHED
  ROOM_DISCONNECT_TIMEOUT: 5 * 60 * 1000, // 5 min if all disconnected
  RECONNECT_GRACE_PERIOD: 60 * 1000, // 60s for reconnecting to active game
};
