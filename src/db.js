// ═══════════════════════════════════════════════════════════
// Database Layer — All Supabase CRUD operations + CACHE
// ═══════════════════════════════════════════════════════════
import { sb } from './supabase.js';
import { today } from './ui.js';

// ── Global user & profile refs ───────────────────────────
export let _user = null;
export let _profile = null;
export function setUser(u) { _user = u; }
export function setProfile(p) { _profile = p; }

// ── In-memory cache ──────────────────────────────────────
export const CACHE = {
  waterLog: [], mealChecks: {}, pesos: [], supls: [],
  suplChecks: {}, precos: {}, customIngrs: []
};

// ── Helper getters ───────────────────────────────────────
export function gPesos()  { return CACHE.pesos; }
export function gPrecos() { return CACHE.precos; }
export function getMeta()  { return _profile?.meta_peso || null; }

// ── WATER ────────────────────────────────────────────────
export async function dbAddAgua(ml, tmpId) {
  if (!sb || !_user) return;
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const { data, error } = await sb.from('water_log').insert({
    user_id: _user.id, data: today(), ml, hora
  }).select('id').single();
  if (error) throw error;
  // Replace tmp ID in cache
  const idx = CACHE.waterLog.findIndex(w => w.id === tmpId);
  if (idx >= 0 && data) CACHE.waterLog[idx].id = data.id;
}

export async function dbDelAgua(id) {
  if (!sb || !_user) return;
  await sb.from('water_log').delete().eq('id', id).eq('user_id', _user.id);
}

export async function dbResetAgua() {
  if (!sb || !_user) return;
  await sb.from('water_log').delete().eq('user_id', _user.id).eq('data', today());
}

// ── MEAL CHECKS ──────────────────────────────────────────
export function dbGetMealCheck(key) {
  return !!CACHE.mealChecks[key];
}

export async function dbSetMealCheck(fase, tipo, idx, checked) {
  if (!sb || !_user) return;
  const key = `m_${fase}_${tipo}_${idx}_${today()}`;
  if (checked) {
    CACHE.mealChecks[key] = true;
    await sb.from('meal_checks').upsert({
      user_id: _user.id, data: today(), fase, tipo, meal_idx: idx
    }, { onConflict: 'user_id,data,fase,tipo,meal_idx' });
  } else {
    delete CACHE.mealChecks[key];
    await sb.from('meal_checks').delete()
      .eq('user_id', _user.id).eq('data', today())
      .eq('fase', fase).eq('tipo', tipo).eq('meal_idx', idx);
  }
}

// ── WEIGHT ───────────────────────────────────────────────
export async function dbAddPeso(peso) {
  if (!sb || !_user) return;
  const { data } = await sb.from('weight_history').insert({
    user_id: _user.id, data: today(), peso
  }).select().single();
  if (data) {
    CACHE.pesos.push({ id: data.id, d: new Date(data.data).toLocaleDateString('pt-BR'), p: parseFloat(data.peso) });
  }
  // Update profile
  await sb.from('profiles').update({ peso_atual: peso }).eq('id', _user.id);
  if (_profile) _profile.peso_atual = peso;
}

export async function dbSetMeta(meta) {
  if (!sb || !_user) return;
  await sb.from('profiles').update({ meta_peso: meta }).eq('id', _user.id);
  if (_profile) _profile.meta_peso = meta;
}

export async function dbSaveFaseTipo(fase, tipo) {
  if (!sb || !_user) return;
  await sb.from('profiles').update({ fase_atual: parseInt(fase), tipo_dia: tipo }).eq('id', _user.id);
}

// ── SUPPLEMENTS ──────────────────────────────────────────
export async function dbAddSupl(nome, fase, tipo, preco = 0, qtd_diaria = '') {
  if (!sb || !_user) return;
  const { data } = await sb.from('supplements').insert({
    user_id: _user.id, nome, fase, tipo, preco, qtd_diaria: qtd_diaria || null
  }).select().single();
  if (data) CACHE.supls.push({ id: data.id, nome: data.nome, fase: data.fase, tipo: data.tipo, preco: parseFloat(data.preco) || 0, qtd_diaria: data.qtd_diaria || '' });
}

export async function dbDelSupl(id) {
  if (!sb || !_user) return;
  await sb.from('supplements').delete().eq('id', id).eq('user_id', _user.id);
  CACHE.supls = CACHE.supls.filter(s => s.id !== id);
}

export function dbGetSuplCheck(suplId) {
  return !!CACHE.suplChecks[`sl_${suplId}_${today()}`];
}

export async function dbToggleSuplCheck(suplId, wantChecked) {
  if (!sb || !_user) return;
  if (wantChecked) {
    await sb.from('supplement_checks').upsert({
      user_id: _user.id, supl_id: suplId, data: today()
    }, { onConflict: 'user_id,supl_id,data' });
  } else {
    await sb.from('supplement_checks').delete()
      .eq('user_id', _user.id).eq('supl_id', suplId).eq('data', today());
  }
}

// ── INGREDIENT PRICES ────────────────────────────────────
export async function dbSetPreco(ingredientId, valor, unit) {
  if (!sb || !_user) return;
  CACHE.precos[ingredientId] = { val: valor, unit: unit || 'kg' };
  await sb.from('ingredient_prices').upsert({
    user_id: _user.id, ingredient_id: ingredientId, valor, unit: unit || 'kg'
  }, { onConflict: 'user_id,ingredient_id' });
}

// ── CUSTOM INGREDIENTS ───────────────────────────────────
export async function dbAddCustomIngr(obj) {
  if (!sb || !_user) return null;
  const { data } = await sb.from('custom_ingredients').insert({
    user_id: _user.id, ...obj
  }).select().single();
  if (data) {
    CACHE.customIngrs.push({
      id: data.id, nome: data.nome, kcal: data.kcal, c: data.c, p: data.p, f: data.f,
      per: data.per || 100, unit: data.unit || 'g', amount: data.amount || 100,
      precoUnit: data.preco_unit || 'kg'
    });
  }
  return data;
}

export async function dbDelCustomIngr(cid) {
  if (!sb || !_user) return;
  await sb.from('custom_ingredients').delete().eq('id', cid).eq('user_id', _user.id);
  CACHE.customIngrs = CACHE.customIngrs.filter(c => c.id !== cid);
}

// ── CUSTOM DIET ──────────────────────────────────────────
export async function dbSaveDiet(dietData) {
  if (!sb || !_user) return;
  await sb.from('custom_diet').upsert({
    user_id: _user.id, tipo: 'importada', data: dietData
  }, { onConflict: 'user_id' });
}

// Save current refeicoes state
export async function dbSaveDietFull(refeicoes) {
  if (!sb || !_user) return;
  await dbSaveDiet({ fases: refeicoes });
}

// ── PUSH SUBSCRIPTIONS ───────────────────────────────────
export async function dbSavePushSub(sub, fase, tipo) {
  if (!sb || !_user) return;
  const j = sub.toJSON();
  await sb.from('push_subscriptions').upsert({
    user_id: _user.id,
    endpoint: j.endpoint,
    p256dh: j.keys.p256dh,
    auth_key: j.keys.auth,
    user_agent: navigator.userAgent,
    fase: fase || '1',
    tipo: tipo || 'trabalho',
  }, { onConflict: 'user_id,endpoint' });
}

export async function dbDeletePushSub(endpoint) {
  if (!sb || !_user) return;
  await sb.from('push_subscriptions').delete()
    .eq('user_id', _user.id).eq('endpoint', endpoint);
}
