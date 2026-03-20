// ══════════════════════════════════════════════
// Auth Context — Authentication state management
// ══════════════════════════════════════════════
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { loadUserData } from '@/services/database';
import { getDefaultRefeicoes, applyImportedDiet } from '@/services/dietData';
import { registerForPushNotifications, scheduleMealNotifications, scheduleWaterReminders, scheduleSupplementReminder } from '@/services/notifications';
import type { Profile, Cache, Refeicoes } from '@/types';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  cache: Cache;
  refeicoes: Refeicoes;
  fase: string;
  tipo: string;
  loading: boolean;
  setFase: (f: string) => void;
  setTipo: (t: string) => void;
  setProfile: (p: Profile) => void;
  setCache: (c: Cache) => void;
  setRefeicoes: (r: Refeicoes) => void;
  refreshData: () => Promise<void>;
  signOut: () => Promise<void>;
}

const defaultCache: Cache = {
  waterLog: [], mealChecks: {}, pesos: [], supls: [],
  suplChecks: {}, precos: {}, customIngrs: [],
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  cache: defaultCache,
  refeicoes: {},
  fase: '1',
  tipo: 'trabalho',
  loading: true,
  setFase: () => {},
  setTipo: () => {},
  setProfile: () => {},
  setCache: () => {},
  setRefeicoes: () => {},
  refreshData: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cache, setCache] = useState<Cache>(defaultCache);
  const [refeicoes, setRefeicoes] = useState<Refeicoes>(getDefaultRefeicoes());
  const [fase, setFase] = useState('1');
  const [tipo, setTipo] = useState('trabalho');
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const result = await loadUserData(userId);
      setProfile(result.profile);
      setCache(result.cache);

      if (result.profile.fase_atual) setFase(String(result.profile.fase_atual));
      if (result.profile.tipo_dia) setTipo(result.profile.tipo_dia);

      // Apply imported diet or use default
      let ref = getDefaultRefeicoes();
      if (result.dietData) {
        try {
          ref = applyImportedDiet(result.dietData, ref);
        } catch (e) {
          console.warn('Failed to apply imported diet:', e);
        }
      }
      setRefeicoes(ref);

      // Register and Schedule Notifications
      registerForPushNotifications(userId, String(result.profile.fase_atual || '1'), result.profile.tipo_dia || 'trabalho');
      
      const currentMeals = ref[String(result.profile.fase_atual || '1')]?.[result.profile.tipo_dia || 'trabalho'] || [];
      if (currentMeals.length > 0) {
        scheduleMealNotifications(currentMeals);
      }
      scheduleWaterReminders();
      scheduleSupplementReminder();

    } catch (e) {
      console.error('Error loading user data:', e);
    }
  }, []);

  const refreshData = useCallback(async () => {
    if (user?.id) {
      await fetchUserData(user.id);
    }
  }, [user, fetchUserData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setCache(defaultCache);
    setRefeicoes(getDefaultRefeicoes());
    setFase('1');
    setTipo('trabalho');
  }, []);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchUserData(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchUserData(s.user.id);
        } else {
          setProfile(null);
          setCache(defaultCache);
          setRefeicoes(getDefaultRefeicoes());
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  useEffect(() => {
    if (user) {
      const currentMeals = refeicoes[fase]?.[tipo] || [];
      if (currentMeals.length > 0) {
        scheduleMealNotifications(currentMeals);
      }
    }
  }, [refeicoes, fase, tipo, user]);

  return (
    <AuthContext.Provider value={{
      user, session, profile, cache, refeicoes,
      fase, tipo, loading,
      setFase, setTipo, setProfile, setCache, setRefeicoes,
      refreshData, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
