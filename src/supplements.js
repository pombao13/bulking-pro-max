// ═══════════════════════════════════════════════════════════
// Supplements Tab — Add, toggle, delete, pricing
// ═══════════════════════════════════════════════════════════
import { CACHE, dbAddSupl, dbDelSupl, dbToggleSuplCheck, dbGetSuplCheck } from './db.js';
import { gF, gT, today, toast, closeMod, selC, escapeHtml, fmtR, fmtMoneyInput } from './ui.js';

export function loadSupl() {
  const fase = gF(), tipo = gT();
  const list = CACHE.supls.filter(s => (s.fase === fase || s.fase === 'all') && (s.tipo === tipo || s.tipo === 'all'));
  const cont = document.getElementById('suplList');
  if (!cont) return;
  cont.innerHTML = '';

  if (!list.length) {
    cont.innerHTML = '<div class="empty"><div class="ei">💊</div>Nenhum suplemento cadastrado.</div>';
    return;
  }

  list.forEach(s => {
    const done = dbGetSuplCheck(s.id);
    const card = document.createElement('div');
    card.className = `scrd${done ? ' done' : ''}`;

    const precoInfo = s.preco > 0 ? `<div class="stag" style="color:var(--lime)">💰 ${fmtR(s.preco)}${s.qtd_diaria ? ' · ' + escapeHtml(s.qtd_diaria) + '/dia' : ''}</div>` : '';
    const qtdInfo = (!s.preco || s.preco <= 0) && s.qtd_diaria ? `<div class="stag">📏 ${escapeHtml(s.qtd_diaria)}/dia</div>` : '';

    card.innerHTML =
      `<div class="sinfo">` +
        `<div class="sname">${escapeHtml(s.nome)}</div>` +
        `<div class="stag">Fase: ${s.fase === 'all' ? 'Todas' : s.fase} · ${s.tipo === 'all' ? 'Todos' : s.tipo}</div>` +
        precoInfo + qtdInfo +
      `</div>` +
      `<button class="schk" onclick="window.__togSupl('${s.id}')">${done ? '✓' : ''}</button>` +
      `<button class="sdel" onclick="window.__delSupl('${s.id}')">🗑️</button>`;
    cont.appendChild(card);
  });
}

window.__togSupl = async (id) => {
  const key = `sl_${id}_${today()}`;
  const was = !!CACHE.suplChecks[key];
  if (was) { delete CACHE.suplChecks[key]; } else { CACHE.suplChecks[key] = true; }
  loadSupl();
  toast(was ? '↩ Desmarcado' : '✅ Suplemento tomado!');
  try { await dbToggleSuplCheck(id, !was); } catch (e) { console.error(e); }
};

window.__delSupl = async (id) => {
  if (!confirm('Excluir este suplemento?')) return;
  try {
    await dbDelSupl(id);
    loadSupl();
    toast('🗑️ Removido');
  } catch (e) { toast('❌ Erro: ' + e.message); }
};

export function openSuplModal() {
  document.getElementById('suplModal')?.classList.add('active');
}

export async function salvarSupl() {
  const nome = document.getElementById('suplNome')?.value.trim();
  if (!nome) { toast('⚠️ Digite o nome'); return; }
  const fase = document.querySelector('#suplFaseGrp .chip.sel')?.dataset.val || 'all';
  const tipo = document.querySelector('#suplTipoGrp .chip.sel')?.dataset.val || 'all';
  const precoRaw = document.getElementById('suplPreco')?.value || '0';
  const preco = parseFloat(precoRaw.replace(',', '.') || '0');
  const qtd_diaria = document.getElementById('suplQtd')?.value.trim() || '';
  try {
    await dbAddSupl(nome, fase, tipo, preco, qtd_diaria);
    document.getElementById('suplNome').value = '';
    const precoEl = document.getElementById('suplPreco');
    const qtdEl = document.getElementById('suplQtd');
    if (precoEl) precoEl.value = '';
    if (qtdEl) qtdEl.value = '';
    closeMod('suplModal');
    loadSupl();
    toast('💊 Suplemento adicionado!');
  } catch (e) { toast('❌ Erro: ' + e.message); }
}
