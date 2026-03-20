// ═══════════════════════════════════════════════════════════
// UI Helpers — Toast, Screens, Tabs, Formatters, Sanitization
// ═══════════════════════════════════════════════════════════
import { TABS } from './config.js';

// ── XSS Prevention ───────────────────────────────────────
export function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, c => map[c]);
}

// ── Screens ──────────────────────────────────────────────
export function showScreen(name) {
  const loading = document.getElementById('loadingScreen');
  const auth    = document.getElementById('authScreen');
  const shell   = document.getElementById('appShell');
  const onboard = document.getElementById('onboardScreen');
  if (loading) loading.classList.toggle('hidden', name !== 'loading');
  if (auth)    auth.classList.toggle('hidden', name !== 'auth');
  if (onboard) onboard.classList.toggle('show', name === 'onboard');
  if (shell)   shell.style.visibility = (name === 'app' || name === 'onboard') ? 'visible' : 'hidden';
}

export function setLoadingTxt(t) {
  const el = document.getElementById('loadingTxt');
  if (el) el.textContent = t;
}

// ── Toast ────────────────────────────────────────────────
let _tt;
export function toast(msg) {
  clearTimeout(_tt);
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  _tt = setTimeout(() => el.classList.remove('show'), 2400);
}

// ── Tabs ─────────────────────────────────────────────────
let _onTabSwitch = null;
export function setTabSwitchCallback(fn) { _onTabSwitch = fn; }

export function switchTab(id, direction) {
  const prevTab = localStorage.getItem('activeTab') || 'ref';
  // Determine animation direction automatically if not provided
  if (!direction && prevTab !== id) {
    const prevIdx = TABS.indexOf(prevTab);
    const nextIdx = TABS.indexOf(id);
    direction = nextIdx > prevIdx ? 'left' : 'right';
  }

  TABS.forEach(t => {
    const tab = document.getElementById('tab-' + t);
    const nav = document.getElementById('nav-' + t);
    if (nav) nav.classList.toggle('active', t === id);
    if (tab) {
      // Remove any previous animation classes
      tab.classList.remove('active', 'tab-slide-in-left', 'tab-slide-in-right');
      if (t === id) {
        tab.classList.add('active');
        // Apply directional animation
        if (direction && prevTab !== id) {
          const animClass = direction === 'left' ? 'tab-slide-in-left' : 'tab-slide-in-right';
          tab.classList.add(animClass);
          // Remove animation class after it completes
          tab.addEventListener('animationend', () => {
            tab.classList.remove('tab-slide-in-left', 'tab-slide-in-right');
          }, { once: true });
        }
      }
    }
  });
  localStorage.setItem('activeTab', id);
  if (_onTabSwitch) _onTabSwitch(id);
}

// ── Modal ────────────────────────────────────────────────
export function closeMod(id, e) {
  if (e && e.target !== document.getElementById(id)) return;
  document.getElementById(id)?.classList.remove('active');
}

// ── Chip Selection ───────────────────────────────────────
export function selC(el, gid) {
  document.querySelectorAll('#' + gid + ' .chip').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
}

// ── Icon Selection ───────────────────────────────────────
export function selIcon(el) {
  document.querySelectorAll('.icon-opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
}

// ── Formatters ───────────────────────────────────────────
export function today()   { return new Date().toISOString().slice(0, 10); }
export function nowTime() { return new Date().toTimeString().slice(0, 5); }
export function gF()      { return document.getElementById('fase')?.value || '1'; }
export function gT()      { return document.getElementById('tipo')?.value || 'trabalho'; }
export function fmtR(v)   { return 'R$\u00a0' + (+v).toFixed(2).replace('.', ','); }
export function fmtKg(g)  { return g < 1000 ? Math.round(g) + 'g' : (g / 1000).toFixed(2) + 'kg'; }

export function fmtMoneyInput(el) {
  // Brazilian money mask: auto-insert comma at 2 decimal places
  // e.g. typing "1837" → "18,37", "5" → "0,05", "50" → "0,50"
  let digits = el.value.replace(/\D/g, '');
  // Remove leading zeros (but keep at least 1)
  digits = digits.replace(/^0+/, '') || '0';
  // Pad with zeros if less than 3 digits
  while (digits.length < 3) digits = '0' + digits;
  // Split into integer and decimal parts
  const intPart = digits.slice(0, -2);
  const decPart = digits.slice(-2);
  // Add thousands separator
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  el.value = formatted + ',' + decPart;
}

export function fmtHora(el) {
  let v = el.value.replace(/\D/g, '');
  if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2, 4);
  el.value = v.slice(0, 5);
}

// ── Layout Class (desktop vs mobile) ─────────────────────
export function applyLayoutClass() {
  document.documentElement.classList.toggle('is-desktop', window.innerWidth >= 700);
}

// ── User Menu ────────────────────────────────────────────
export function toggleUserMenu() {
  document.getElementById('userMenu')?.classList.toggle('open');
}

export function closeUserMenu() {
  document.getElementById('userMenu')?.classList.remove('open');
}
