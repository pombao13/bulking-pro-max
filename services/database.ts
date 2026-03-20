// ══════════════════════════════════════════════
// Database Layer — All Supabase CRUD operations
// (migrated from db.js)
// ══════════════════════════════════════════════
import { supabase } from './supabase';
import { today } from '@/utils/formatters';
import type { Cache, WeightEntry, WaterEntry, Supplement, CustomIngredient, PriceInfo, Profile } from '@/types';

// ── Helpers ──────────────────────────────────
const q = async <T>(fn: () => Promise<{ data: T | null; error: any }>): Promise<T | null> => {
  try {
    const r = await fn();
    return r.data || null;
  } catch (_) {
    return null;
  }
};

// ── WATER ────────────────────────────────────
export async function dbAddAgua(userId: string, ml: number, tmpId: string, cache: Cache) {
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const { data, error } = await supabase.from('water_log').insert({
    user_id: userId, data: today(), ml, hora,
  }).select('id').single();
  if (error) throw error;
  const idx = cache.waterLog.findIndex(w => w.id === tmpId);
  if (idx >= 0 && data) cache.waterLog[idx].id = data.id;
}

export async function dbDelAgua(userId: string, id: string) {
  await supabase.from('water_log').delete().eq('id', id).eq('user_id', userId);
}

export async function dbResetAgua(userId: string) {
  await supabase.from('water_log').delete().eq('user_id', userId).eq('data', today());
}

// ── MEAL CHECKS ──────────────────────────────
export async function dbSetMealCheck(
  userId: string, fase: string, tipo: string, idx: number,
  checked: boolean, cache: Cache
) {
  const key = `m_${fase}_${tipo}_${idx}_${today()}`;
  if (checked) {
    cache.mealChecks[key] = true;
    await supabase.from('meal_checks').upsert({
      user_id: userId, data: today(), fase, tipo, meal_idx: idx,
    }, { onConflict: 'user_id,data,fase,tipo,meal_idx' });
  } else {
    delete cache.mealChecks[key];
    await supabase.from('meal_checks').delete()
      .eq('user_id', userId).eq('data', today())
      .eq('fase', fase).eq('tipo', tipo).eq('meal_idx', idx);
  }
}

// ── WEIGHT ───────────────────────────────────
export async function dbAddPeso(userId: string, peso: number, cache: Cache): Promise<void> {
  const { data } = await supabase.from('weight_history').insert({
    user_id: userId, data: today(), peso,
  }).select().single();
  if (data) {
    cache.pesos.push({
      id: data.id,
      d: new Date(data.data).toLocaleDateString('pt-BR'),
      p: parseFloat(data.peso),
    });
  }
  await supabase.from('profiles').update({ peso_atual: peso }).eq('id', userId);
}

export async function dbSetMeta(userId: string, meta: number) {
  await supabase.from('profiles').update({ meta_peso: meta }).eq('id', userId);
}

export async function dbSaveFaseTipo(userId: string, fase: string, tipo: string) {
  await supabase.from('profiles').update({
    fase_atual: parseInt(fase), tipo_dia: tipo,
  }).eq('id', userId);
}

// ── SUPPLEMENTS ──────────────────────────────
export async function dbAddSupl(
  userId: string, nome: string, fase: string, tipo: string,
  preco: number, qtd_diaria: string, unidade: string,
  preco_total: number, qtd_total: number, cache: Cache
) {
  const { data } = await supabase.from('supplements').insert({
    user_id: userId, nome, fase, tipo, preco,
    qtd_diaria: qtd_diaria || null, unidade, preco_total, qtd_total,
  }).select().single();
  if (data) {
    cache.supls.push({
      id: data.id, nome: data.nome, fase: data.fase, tipo: data.tipo,
      preco: parseFloat(data.preco) || 0, qtd_diaria: data.qtd_diaria || '',
      unidade: data.unidade || 'un', preco_total: parseFloat(data.preco_total) || 0,
      qtd_total: parseFloat(data.qtd_total) || 0,
    });
  }
}

export async function dbDelSupl(userId: string, id: string, cache: Cache) {
  await supabase.from('supplements').delete().eq('id', id).eq('user_id', userId);
  cache.supls = cache.supls.filter(s => s.id !== id);
}

export async function dbToggleSuplCheck(userId: string, suplId: string, wantChecked: boolean) {
  if (wantChecked) {
    await supabase.from('supplement_checks').upsert({
      user_id: userId, supl_id: suplId, data: today(),
    }, { onConflict: 'user_id,supl_id,data' });
  } else {
    await supabase.from('supplement_checks').delete()
      .eq('user_id', userId).eq('supl_id', suplId).eq('data', today());
  }
}

export async function dbUpdateSupl(
  userId: string, id: string,
  data: { nome: string; fase: string; tipo: string; preco: number; unidade: string; preco_total: number; qtd_total: number; qtd_diaria: string | null },
  cache: Cache
) {
  await supabase.from('supplements').update(data).eq('id', id).eq('user_id', userId);
  const idx = cache.supls.findIndex(s => s.id === id);
  if (idx >= 0) {
    cache.supls[idx] = { ...cache.supls[idx], ...data, qtd_diaria: data.qtd_diaria || '' };
  }
}

// ── INGREDIENT PRICES ────────────────────────
export async function dbSetPreco(userId: string, ingredientId: string, valor: number, unit: string, cookFactor: number, cache: Cache) {
  cache.precos[ingredientId] = { val: valor, unit: unit || 'kg', cook_factor: cookFactor || 0 };
  await supabase.from('ingredient_prices').upsert({
    user_id: userId, ingredient_id: ingredientId, valor, unit: unit || 'kg',
    cook_factor: cookFactor || 0,
  }, { onConflict: 'user_id,ingredient_id' });
}

// ── CUSTOM INGREDIENTS ───────────────────────
export async function dbAddCustomIngr(userId: string, obj: any, cache: Cache) {
  const { data } = await supabase.from('custom_ingredients').insert({
    user_id: userId, ...obj,
  }).select().single();
  if (data) {
    cache.customIngrs.push({
      id: data.id, nome: data.nome, kcal: data.kcal, c: data.c, p: data.p, f: data.f,
      per: data.per || 100, unit: data.unit || 'g', amount: data.amount || 100,
      precoUnit: data.preco_unit || 'kg',
    });
  }
  return data;
}

export async function dbDelCustomIngr(userId: string, cid: string, cache: Cache) {
  await supabase.from('custom_ingredients').delete().eq('id', cid).eq('user_id', userId);
  cache.customIngrs = cache.customIngrs.filter(c => c.id !== cid);
}

// ── CUSTOM DIET ──────────────────────────────
export async function dbSaveDiet(userId: string, dietData: any) {
  await supabase.from('custom_diet').upsert({
    user_id: userId, tipo: 'importada', data: dietData,
  }, { onConflict: 'user_id' });
}

// ── PUSH SUBSCRIPTIONS ───────────────────────
export async function dbSaveExpoPushToken(userId: string, token: string, fase: string, tipo: string) {
  await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: `expo:${token}`,
    p256dh: 'expo',
    auth_key: token,
    user_agent: 'expo-app',
    fase: fase || '1',
    tipo: tipo || 'trabalho',
  }, { onConflict: 'user_id,endpoint' });
}

export async function dbDeleteExpoPushToken(userId: string, token: string) {
  await supabase.from('push_subscriptions').delete()
    .eq('user_id', userId).eq('endpoint', `expo:${token}`);
}

// ── LOAD USER DATA ───────────────────────────
export async function loadUserData(userId: string): Promise<{
  profile: Profile;
  cache: Cache;
  dietData: any;
}> {
  const [profile, pesos, water, mChecks, supls, sChecks, precos, cIngrs, diet] = await Promise.all([
    q(() => supabase.from('profiles').select('*').eq('id', userId).single()),
    q(() => supabase.from('weight_history').select('*').eq('user_id', userId).order('created_at')),
    q(() => supabase.from('water_log').select('*').eq('user_id', userId).eq('data', today())),
    q(() => supabase.from('meal_checks').select('*').eq('user_id', userId).eq('data', today())),
    q(() => supabase.from('supplements').select('*').eq('user_id', userId)),
    q(() => supabase.from('supplement_checks').select('*').eq('user_id', userId).eq('data', today())),
    q(() => supabase.from('ingredient_prices').select('*').eq('user_id', userId)),
    q(() => supabase.from('custom_ingredients').select('*').eq('user_id', userId)),
    q(() => supabase.from('custom_diet').select('*').eq('user_id', userId).single()),
  ]);

  const p: Profile = (profile as any) || { id: userId, nome: '' };

  const cache: Cache = {
    pesos: ((pesos as any[]) || []).map((h: any) => ({
      id: h.id, d: new Date(h.data).toLocaleDateString('pt-BR'), p: parseFloat(h.peso),
    })),
    waterLog: ((water as any[]) || []).map((w: any) => ({
      id: w.id, ml: w.ml, t: w.hora || '',
    })),
    mealChecks: {},
    supls: ((supls as any[]) || []).map((s: any) => ({
      id: s.id, nome: s.nome, fase: s.fase, tipo: s.tipo,
      preco: parseFloat(s.preco) || 0, qtd_diaria: s.qtd_diaria || '',
      unidade: s.unidade || 'un', preco_total: parseFloat(s.preco_total) || 0,
      qtd_total: parseFloat(s.qtd_total) || 0,
    })),
    suplChecks: {},
    precos: {},
    customIngrs: ((cIngrs as any[]) || []).map((ci: any) => ({
      id: ci.id, nome: ci.nome, kcal: ci.kcal, c: ci.c, p: ci.p, f: ci.f,
      per: ci.per || 100, unit: ci.unit || 'g', amount: ci.amount || 100,
      precoUnit: ci.preco_unit || 'kg',
    })),
  };

  ((mChecks as any[]) || []).forEach((ch: any) => {
    cache.mealChecks[`m_${ch.fase}_${ch.tipo}_${ch.meal_idx}_${today()}`] = true;
  });

  ((sChecks as any[]) || []).forEach((ch: any) => {
    cache.suplChecks[`sl_${ch.supl_id}_${today()}`] = true;
  });

  ((precos as any[]) || []).forEach((p2: any) => {
    cache.precos[p2.ingredient_id] = {
      val: parseFloat(p2.valor) || 0, unit: p2.unit || 'kg',
      cook_factor: parseFloat(p2.cook_factor) || 0,
    };
  });

  return {
    profile: p,
    cache,
    dietData: (diet as any)?.data || null,
  };
}
