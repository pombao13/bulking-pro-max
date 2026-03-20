// ═══════════════════════════════════════════════════════════
// Water Tab — Add, remove, reset, ring progress
// ═══════════════════════════════════════════════════════════
import { WATER_GOAL, CIRC } from './config.js';
import { CACHE, dbAddAgua, dbDelAgua, dbResetAgua } from './db.js';
import { toast, escapeHtml } from './ui.js';

export function renderAgua() {
  const log  = CACHE.waterLog;
  const total = log.reduce((s, w) => s + w.ml, 0);
  const pct   = Math.min(100, Math.round((total / WATER_GOAL) * 100));
  const off   = CIRC - (CIRC * pct / 100);

  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  el('wVal', total);
  el('wPct', pct + '% da meta');
  const ring = document.getElementById('wRing');
  if (ring) ring.style.strokeDashoffset = off;

  // Log entries
  const cont = document.getElementById('waterLog');
  if (!cont) return;
  cont.innerHTML = '';
  if (!log.length) {
    cont.innerHTML = '<div class="empty"><div class="ei">💧</div>Nenhum registro hoje</div>';
    return;
  }
  [...log].reverse().forEach(w => {
    const li = document.createElement('div');
    li.className = 'wli';
    li.innerHTML =
      `<span class="wml">${w.ml}ml</span>` +
      `<span class="wtm">${escapeHtml(w.t)}</span>` +
      `<button class="wdel" onclick="window.__delAgua('${w.id}')">✕</button>`;
    cont.appendChild(li);
  });
}

export async function addAgua(ml) {
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const tmpId = 'tmp_' + Date.now();
  CACHE.waterLog.push({ id: tmpId, ml, t: hora });
  renderAgua();
  toast('💧 +' + ml + 'ml');
  try { await dbAddAgua(ml, tmpId); } catch (e) { console.error(e); }
}

export async function addAguaCustom() {
  const inp = document.getElementById('waterCustom');
  if (!inp) return;
  const v = parseInt(inp.value);
  if (!v || v < 1 || v > 5000) { toast('⚠️ Valor inválido (1-5000)'); return; }
  inp.value = '';
  await addAgua(v);
}

export async function resetAgua() {
  if (!confirm('Zerar toda a água de hoje?')) return;
  CACHE.waterLog = [];
  renderAgua();
  toast('🗑️ Água zerada');
  try { await dbResetAgua(); } catch (e) { console.error(e); }
}

window.__delAgua = async (id) => {
  CACHE.waterLog = CACHE.waterLog.filter(w => w.id !== id);
  renderAgua();
  toast('✕ Removido');
  try { await dbDelAgua(id); } catch (e) { console.error(e); }
};
