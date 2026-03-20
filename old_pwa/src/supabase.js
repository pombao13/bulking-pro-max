// ═══════════════════════════════════════════════════════════
// Supabase Client Initialization
// ═══════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';
import { SUPA_URL, SUPA_KEY } from './config.js';

let sb = null;

try {
  sb = createClient(SUPA_URL, SUPA_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  console.log('Supabase initialized OK');
} catch (e) {
  console.error('Supabase init error:', e);
}

export { sb };
