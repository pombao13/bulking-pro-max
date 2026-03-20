// ═══════════════════════════════════════════════════════════
// Notifications — Push, water reminders, supplement reminders
// ═══════════════════════════════════════════════════════════
import { VAPID_PUB } from './config.js';
import { CACHE, _user, dbSavePushSub, dbDeletePushSub, dbGetSuplCheck } from './db.js';
import { gF, gT, nowTime, toast } from './ui.js';
import { refeicoes } from './diet-data.js';

let _pushSub  = null;
let _lNotif   = '';

// ── VAPID Key Conversion ─────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// ── Foreground meal notification ─────────────────────────
export function checkNotif() {
  try {
    if (Notification.permission !== 'granted') return;
    if (localStorage.getItem('notifEnabled') === '0') return;
    const h = nowTime();
    if (h === _lNotif) return;
    const list = refeicoes[gF()]?.[gT()];
    if (!list?.length) return;
    const meal = list.find(x => x.hora === h);
    if (!meal) return;
    _lNotif = h;
    navigator.serviceWorker.ready.then(reg => reg.showNotification('🍽️ Hora de comer!', {
      body: h + ' — ' + meal.nome + ' · ' + meal.macros.kcal + 'kcal',
      icon: '/icon-192.png', badge: '/icon-notif.png',
      tag: 'meal-fg', renotify: true, vibrate: [200, 100, 200],
    }));
  } catch (_) {}
}

// ── Toggle notification ──────────────────────────────────
export async function toggleNotif() {
  if (Notification.permission === 'granted' && localStorage.getItem('notifEnabled') !== '0') {
    localStorage.setItem('notifEnabled', '0');
    if (_pushSub && _user) {
      const j = _pushSub.toJSON();
      await dbDeletePushSub(j.endpoint);
      await _pushSub.unsubscribe();
      _pushSub = null;
    }
    updateNotifBtn(); toast('🔕 Notificações desativadas'); return;
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { toast('⚠️ Permissão negada.'); closeNotifPopup(); return; }
  try {
    if (!VAPID_PUB) { toast('⚠️ VAPID key não configurada.'); localStorage.setItem('notifEnabled', '1'); updateNotifBtn(); return; }
    const reg = await navigator.serviceWorker.ready;
    _pushSub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUB),
    });
    await dbSavePushSub(_pushSub, gF(), gT());
    localStorage.setItem('notifEnabled', '1');
    updateNotifBtn();
    closeNotifPopup();
    reg.showNotification('🚀 Bulking PRO MAX', {
      body: 'Notificações ativadas!', icon: '/icon-192.png', badge: '/icon-notif.png',
      tag: 'activate', vibrate: [200, 100, 200],
    });
    toast('🔔 Notificações ativadas!');
  } catch (e) { toast('❌ Erro: ' + e.message); console.error(e); }
}

export function updateNotifBtn() {
  const on = (typeof Notification !== 'undefined') && Notification.permission === 'granted' && localStorage.getItem('notifEnabled') !== '0';
  const b  = document.getElementById('notifBtn');
  if (b) { b.classList.toggle('on', on); b.textContent = on ? '🔔 ON' : '🔔 Notif'; }
}

// ── Water reminder ───────────────────────────────────────
export function checkWaterNotif() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (localStorage.getItem('notifEnabled') === '0') return;
  const total = CACHE.waterLog.reduce((s, x) => s + x.ml, 0);
  if (total >= 3000) return;
  const h = new Date().getHours();
  if (h < 8) return;
  if (CACHE.waterLog.length === 0) {
    const last = parseInt(localStorage.getItem('lastWaterNotif') || '0');
    if (Date.now() - last < 3600000) return;
    localStorage.setItem('lastWaterNotif', Date.now());
    showNotifTagged('💧 Beba água!', 'Você ainda não registrou água hoje.', 'water');
    return;
  }
  const lastEntry = CACHE.waterLog[CACHE.waterLog.length - 1];
  if (lastEntry?.t) {
    const [h2, m2] = lastEntry.t.split(':').map(Number);
    const lastMs = new Date(); lastMs.setHours(h2, m2, 0, 0);
    if ((Date.now() - lastMs.getTime()) / 60000 < 60) return;
  }
  const last = parseInt(localStorage.getItem('lastWaterNotif') || '0');
  if (Date.now() - last < 3600000) return;
  localStorage.setItem('lastWaterNotif', Date.now());
  const remaining = 3000 - total;
  showNotifTagged('💧 Hora de beber água!', `Faltam ${remaining}ml para sua meta. 🚰`, 'water');
}

// ── Supplement reminder ──────────────────────────────────
export function checkSuplNotif() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (localStorage.getItem('notifEnabled') === '0') return;
  const fase = gF(), tipo = gT();
  const all = CACHE.supls.filter(s => (s.fase === fase || s.fase === 'all') && (s.tipo === tipo || s.tipo === 'all'));
  if (!all.length) return;
  const pendentes = all.filter(s => !dbGetSuplCheck(s.id));
  if (!pendentes.length) return;
  const h = new Date().getHours();
  if (h < 8 || h > 22) return;
  const last = parseInt(localStorage.getItem('lastSuplNotif') || '0');
  if (Date.now() - last < 7200000) return;
  localStorage.setItem('lastSuplNotif', Date.now());
  const nomes = pendentes.slice(0, 3).map(s => s.nome).join(', ');
  showNotifTagged('💊 Suplementos pendentes!', `Falta tomar: ${nomes}${pendentes.length > 3 ? ' e mais...' : ''}`, 'supl');
}

// ── Show tagged notification ─────────────────────────────
async function showNotifTagged(title, body, tag) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification(title, {
      body, icon: '/icon-192.png', badge: '/icon-notif.png',
      tag: tag || 'bulking', renotify: true, vibrate: [200, 100, 200],
    });
  } catch (_) {}
}

// ── Restore push subscription ────────────────────────────
export async function restorePushSub() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (localStorage.getItem('notifEnabled') === '0') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    _pushSub  = await reg.pushManager.getSubscription();
    if (_pushSub) await dbSavePushSub(_pushSub, gF(), gT());
  } catch (e) { console.warn('restorePushSub:', e); }
}

// ── Update push sub with fase/tipo ───────────────────────
export async function updatePushSubFaseTipo() {
  if (!_pushSub || !_user) return;
  try { await dbSavePushSub(_pushSub, gF(), gT()); } catch (_) {}
}

// ── Auto notification popup ──────────────────────────────
export function checkAutoNotifPopup() {
  if (typeof Notification === 'undefined') return;

  const perm = Notification.permission;
  const enabled = localStorage.getItem('notifEnabled');

  // Case 1: Permission granted AND notifications enabled → nothing to do
  if (perm === 'granted' && enabled !== '0') return;
  // Case 2: Permission denied → can't do anything
  if (perm === 'denied') return;

  // Re-show popup after 3 days if previously dismissed
  const lastAsked = parseInt(localStorage.getItem('notifAskedAt') || '0');
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  if (lastAsked && (Date.now() - lastAsked < THREE_DAYS)) return;

  setTimeout(() => {
    const el = document.getElementById('notifPopup');
    if (!el) return;
    // If notifs disabled in-app but permission granted, update text
    if (perm === 'granted' && enabled === '0') {
      const title = el.querySelector('.notif-popup-title');
      const desc = el.querySelector('.notif-popup-desc');
      if (title) title.textContent = 'NOTIFICAÇÕES DESATIVADAS';
      if (desc) desc.innerHTML = 'Suas notificações estão <b>desligadas</b>. Ative para não perder suas <b>refeições</b>, <b>água</b> e <b>suplementos</b>.';
    }
    el.classList.add('show');
  }, 3000);
}

export function openNotifPopup()  { document.getElementById('notifPopup')?.classList.add('show'); }
export function closeNotifPopup() { document.getElementById('notifPopup')?.classList.remove('show'); localStorage.setItem('notifAskedAt', String(Date.now())); }
export async function allowNotifFromPopup() { await toggleNotif(); closeNotifPopup(); }
