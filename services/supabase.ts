// ══════════════════════════════════════════════
// Supabase Client (from supabase.js)
// ══════════════════════════════════════════════
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPA_URL, SUPA_KEY } from '@/utils/constants';

import { Platform } from 'react-native';

// Mock storage for SSR (Vercel Build)
const isWeb = Platform.OS === 'web';
const isSSR = isWeb && typeof window === 'undefined';

const customStorage = {
  getItem: async (key: string) => {
    if (isSSR) return null;
    return await AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (isSSR) return;
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (isSSR) return;
    await AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: {
    storage: customStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
