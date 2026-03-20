// ══════════════════════════════════════════════
// App Constants (from config.js)
// ══════════════════════════════════════════════

export const SUPA_URL = 'https://ugifonixdqtvclrfucvf.supabase.co';
export const SUPA_KEY = 'sb_publishable_hDtN3D5IWkdt1Rin3a-9ZQ_vk4fzLab';

export const WATER_GOAL = 3000;

export const TABS = ['ref', 'agua', 'supl', 'ingr', 'custos', 'prog', 'import'] as const;

export const PHASE_LIMIT: Record<string, number> = {
  '1': 57, '2': 62, '3': 67, '4': 72, '5': 77, '6': 80, '7': 999,
};

export const PHASE_PESO: Record<string, number> = {
  '1': 52, '2': 57, '3': 62, '4': 67, '5': 72, '6': 77, '7': 80,
};

export const COLORS = {
  bg: '#0a0a0a',
  surface: '#111111',
  surface2: '#1a1a1a',
  border: '#222222',
  txt: '#e0e0e0',
  muted: '#666666',
  muted2: '#888888',
  lime: '#c8ff00',
  cyan: '#00e5ff',
  warn: '#ffaa00',
  ok: '#00e676',
  danger: '#ff5252',
  pink: '#ff6b9d',
  purple: '#c084fc',
};
