// ══════════════════════════════════════════════
// Supabase Client (from supabase.js)
// ══════════════════════════════════════════════
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPA_URL, SUPA_KEY } from '@/utils/constants';

export const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
