// ═══════════════════════════════════════════════════════════
// Authentication — Login, Register, Google OAuth, Logout
// ═══════════════════════════════════════════════════════════
import { sb } from './supabase.js';
import { CACHE, _user, _profile, setUser, setProfile, gPesos, dbSaveFaseTipo } from './db.js';
import { showScreen, setLoadingTxt, toast, switchTab, today } from './ui.js';
import { refeicoes, applyImportedDiet } from './diet-data.js';
import { loadMeals } from './meals.js';
import { renderCustos } from './costs.js';
import { updateNotifBtn, restorePushSub, checkAutoNotifPopup } from './notifications.js';

// ── Auth Tab Toggle ──────────────────────────────────────
export function showAuthTab(tab) {
  document.getElementById('formLogin').style.display    = tab === 'login' ? 'block' : 'none';
  document.getElementById('formRegister').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
}

function setAuthErr(id, msg) {
  const el = document.getElementById(id + 'Err');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('show', !!msg);
}

// ── Login ────────────────────────────────────────────────
export async function doLogin() {
  if (!sb) { setAuthErr('login', 'Sem conexão com o servidor'); return; }
  const btn   = document.getElementById('loginBtn');
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  if (!email || !pass) { setAuthErr('login', 'Preencha e-mail e senha'); return; }
  btn.disabled = true; btn.textContent = 'Entrando...'; setAuthErr('login', '');
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) {
    let msg = error.message;
    if (msg.includes('Invalid') || msg.includes('credentials')) msg = 'E-mail ou senha incorretos.';
    if (msg.includes('Email not confirmed')) msg = 'Confirme seu e-mail primeiro.';
    setAuthErr('login', msg);
  }
  btn.disabled = false; btn.textContent = 'ENTRAR';
}

// ── Register ─────────────────────────────────────────────
export async function doRegister() {
  if (!sb) { setAuthErr('register', 'Sem conexão'); return; }
  const btn   = document.getElementById('registerBtn');
  const nome  = document.getElementById('regNome').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPass').value;
  if (!nome || !email || !pass) { setAuthErr('register', 'Preencha todos os campos'); return; }
  if (pass.length < 6) { setAuthErr('register', 'Senha mínimo 6 caracteres'); return; }
  btn.disabled = true; btn.textContent = 'Criando...'; setAuthErr('register', '');
  const { data, error } = await sb.auth.signUp({ email, password: pass, options: { data: { nome } } });
  if (error) { setAuthErr('register', error.message); }
  else {
    if (data?.session) { toast('✅ Bem-vindo, ' + nome + '!'); }
    else { showAuthTab('login'); document.getElementById('loginEmail').value = email; toast('✅ Conta criada! Verifique seu e-mail.'); }
  }
  btn.disabled = false; btn.textContent = 'CRIAR CONTA';
}

// ── Google OAuth ─────────────────────────────────────────
export async function doGoogleLogin() {
  if (!sb) return;
  await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
}

// ── Logout ───────────────────────────────────────────────
export async function doLogout() {
  document.getElementById('userMenu')?.classList.remove('open');
  if (sb) await sb.auth.signOut();
}

// ── Load User Data ───────────────────────────────────────
export async function loadUserData(user) {
  if (!sb || !user) return;
  setLoadingTxt('Carregando seus dados...');
  const q = async (fn) => { try { const r = await fn(); return r.data || null; } catch (_) { return null; } };
  const [profile, pesos, water, mChecks, supls, sChecks, precos, cIngrs, diet] = await Promise.all([
    q(() => sb.from('profiles').select('*').eq('id', user.id).single()),
    q(() => sb.from('weight_history').select('*').eq('user_id', user.id).order('created_at')),
    q(() => sb.from('water_log').select('*').eq('user_id', user.id).eq('data', today())),
    q(() => sb.from('meal_checks').select('*').eq('user_id', user.id).eq('data', today())),
    q(() => sb.from('supplements').select('*').eq('user_id', user.id)),
    q(() => sb.from('supplement_checks').select('*').eq('user_id', user.id).eq('data', today())),
    q(() => sb.from('ingredient_prices').select('*').eq('user_id', user.id)),
    q(() => sb.from('custom_ingredients').select('*').eq('user_id', user.id)),
    q(() => sb.from('custom_diet').select('*').eq('user_id', user.id).single()),
  ]);

  const p = profile || {};
  setProfile(p);

  if (!profile) {
    const nome = user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuário';
    await sb.from('profiles').upsert({ id: user.id, nome }, { onConflict: 'id' }).catch(() => {});
    setProfile({ nome });
  }

  CACHE.pesos      = (pesos || []).map(h => ({ id: h.id, d: new Date(h.data).toLocaleDateString('pt-BR'), p: parseFloat(h.peso) }));
  CACHE.waterLog   = (water || []).map(w => ({ id: w.id, ml: w.ml, t: w.hora || '' }));
  CACHE.mealChecks = {};
  (mChecks || []).forEach(ch => { CACHE.mealChecks[`m_${ch.fase}_${ch.tipo}_${ch.meal_idx}_${today()}`] = true; });
  CACHE.supls      = (supls || []).map(s => ({ id: s.id, nome: s.nome, fase: s.fase, tipo: s.tipo, preco: parseFloat(s.preco) || 0, qtd_diaria: s.qtd_diaria || '', unidade: s.unidade || 'un', preco_total: parseFloat(s.preco_total) || 0, qtd_total: parseFloat(s.qtd_total) || 0 }));
  CACHE.suplChecks = {};
  (sChecks || []).forEach(ch => { CACHE.suplChecks[`sl_${ch.supl_id}_${today()}`] = true; });
  CACHE.precos     = {};
  (precos || []).forEach(p2 => { CACHE.precos[p2.ingredient_id] = { val: parseFloat(p2.valor) || 0, unit: p2.unit || 'kg', cook_factor: parseFloat(p2.cook_factor) || 0 }; });
  CACHE.customIngrs = (cIngrs || []).map(ci => ({
    id: ci.id, nome: ci.nome, kcal: ci.kcal, c: ci.c, p: ci.p, f: ci.f,
    per: ci.per || 100, unit: ci.unit || 'g', amount: ci.amount || 100, precoUnit: ci.preco_unit || 'kg'
  }));

  if (diet?.data) { try { applyImportedDiet(diet.data); } catch (e) { console.warn(e); } }

  const prof = _profile || {};
  const nome = prof.nome || user.email?.split('@')[0] || '?';
  const av = document.getElementById('userAvatar');
  const mn = document.getElementById('userMenuName');
  if (av) av.textContent = nome[0].toUpperCase();
  if (mn) mn.textContent = nome;

  if (prof.fase_atual) { const el = document.getElementById('fase'); if (el) el.value = String(prof.fase_atual); }
  if (prof.tipo_dia)   { const el = document.getElementById('tipo'); if (el) el.value = prof.tipo_dia; }
}

// ── Enter App ────────────────────────────────────────────
async function enterApp(user) {
  if (_user && _user.id === user.id) return;
  setUser(user);
  showScreen('loading');
  setLoadingTxt('Carregando...');
  try {
    await Promise.race([
      loadUserData(user),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000))
    ]);
    const isNew = !localStorage.getItem('onboardDone_' + user.id);
    // Skip onboard if user already has meals or imported diet
    const hasDiet = CACHE.supls.length > 0 || Object.keys(CACHE.mealChecks).length > 0 || 
      Object.keys(refeicoes).some(f => ['trabalho','folga'].some(t => {
        const meals = refeicoes[f]?.[t] || [];
        return meals.some(m => m.ingrs?.some(i => i.id === 'custom'));
      }));
    if (isNew && !hasDiet) {
      showScreen('onboard');
    } else {
      if (isNew) localStorage.setItem('onboardDone_' + user.id, '1');
      showScreen('app');
      switchTab(localStorage.getItem('activeTab') || 'ref');
      loadMeals();
      renderCustos();
    }
    updateNotifBtn();
    restorePushSub().catch(() => {});
    checkAutoNotifPopup();
  } catch (e) {
    console.error('enterApp error:', e);
    setUser(user);
    showScreen('app');
    switchTab(localStorage.getItem('activeTab') || 'ref');
    loadMeals();
  }
}

// ── Init Auth ────────────────────────────────────────────
export function initAuth() {
  if (!sb) {
    setLoadingTxt('Erro de conexão. Recarregue a página.');
    return;
  }
  sb.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth event:', event, session?.user?.email);
    if (session?.user) {
      await enterApp(session.user);
    } else {
      setUser(null); setProfile(null);
      Object.assign(CACHE, { waterLog: [], mealChecks: {}, pesos: [], supls: [], suplChecks: {}, precos: {}, customIngrs: [] });
      showScreen('auth');
    }
  });
}

// ── Onboarding ───────────────────────────────────────────
export function finishOnboard() {
  if (_user) localStorage.setItem('onboardDone_' + _user.id, '1');
  showScreen('app');
  switchTab('ref');
  loadMeals();
}
