// ═══════════════════════════════════════════════════════════
// Supplements Tab — Add, edit, toggle, delete, pricing
// ═══════════════════════════════════════════════════════════
import { CACHE, dbAddSupl, dbDelSupl, dbToggleSuplCheck, dbGetSuplCheck } from './db.js';
import { gF, gT, today, toast, closeMod, selC, escapeHtml, fmtR, fmtMoneyInput } from './ui.js';
import { sb } from './supabase.js';
import { _user } from './db.js';

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

    const precoInfo = s.preco > 0 ? `<span style="color:var(--lime);font-size:11px;margin-left:6px">${fmtR(s.preco)}/dia</span>` : '';
    const qtdInfo = s.qtd_diaria ? `<span style="color:var(--m2);font-size:10px;margin-left:6px">· ${escapeHtml(s.qtd_diaria)}</span>` : '';

    card.innerHTML =
      `<div class="srow-main">` +
        `<div class="schk-box ${done ? 'checked' : ''}" onclick="event.stopPropagation();window.__togSupl('${s.id}')">${done ? '✓' : ''}</div>` +
        `<div class="sinfo" onclick="event.stopPropagation();window.__toggleSuplActions('${s.id}')">` +
          `<div class="sname">${escapeHtml(s.nome)}${precoInfo}${qtdInfo}</div>` +
          `<div class="stag">Fase: ${s.fase === 'all' ? 'Todas' : s.fase} · ${s.tipo === 'all' ? 'Todos' : s.tipo}</div>` +
        `</div>` +
      `</div>` +
      `<div class="srow-actions" id="suplActions_${s.id}">` +
        `<button class="sedit" onclick="event.stopPropagation();window.__editSupl('${s.id}')" title="Editar">✏️ Editar</button>` +
        `<button class="sdel" onclick="event.stopPropagation();window.__delSupl('${s.id}')" title="Excluir">🗑️ Excluir</button>` +
      `</div>`;
    cont.appendChild(card);
  });
}

// Toggle supplement action buttons visibility
window.__toggleSuplActions = (id) => {
  // Close all other open actions
  document.querySelectorAll('.srow-actions.open').forEach(el => {
    if (el.id !== 'suplActions_' + id) el.classList.remove('open');
  });
  const el = document.getElementById('suplActions_' + id);
  if (el) el.classList.toggle('open');
};

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

// ── Edit supplement ──────────────────────────────────────
window.__editSupl = (id) => {
  const s = CACHE.supls.find(x => x.id === id);
  if (!s) return;
  // Populate modal fields
  const nomeEl = document.getElementById('suplNome');
  const precoEl = document.getElementById('suplPreco');
  const qtdEl = document.getElementById('suplQtd');
  if (nomeEl) nomeEl.value = s.nome;
  if (precoEl) precoEl.value = s.preco > 0 ? s.preco.toFixed(2).replace('.', ',') : '';
  if (qtdEl) qtdEl.value = s.qtd_diaria || '';

  // Select fase chip
  document.querySelectorAll('#suplFaseGrp .chip').forEach(c => {
    c.classList.toggle('sel', c.dataset.val === s.fase);
  });
  // Select tipo chip
  document.querySelectorAll('#suplTipoGrp .chip').forEach(c => {
    c.classList.toggle('sel', c.dataset.val === s.tipo);
  });

  // Set edit mode
  const modal = document.getElementById('suplModal');
  if (modal) {
    modal.__editId = id;
    modal.querySelector('.mod-title').textContent = '💊 Editar Suplemento';
  }
  openSuplModal();
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
  const preco = parseFloat(precoRaw.replace(/\./g, '').replace(',', '.') || '0');
  const qtd_diaria = document.getElementById('suplQtd')?.value.trim() || '';

  const modal = document.getElementById('suplModal');
  const editId = modal?.__editId;

  try {
    if (editId) {
      // Update existing supplement
      if (sb && _user) {
        await sb.from('supplements').update({ nome, fase, tipo, preco, qtd_diaria: qtd_diaria || null })
          .eq('id', editId).eq('user_id', _user.id);
      }
      const idx = CACHE.supls.findIndex(s => s.id === editId);
      if (idx >= 0) {
        CACHE.supls[idx] = { ...CACHE.supls[idx], nome, fase, tipo, preco, qtd_diaria };
      }
      toast('💊 Suplemento atualizado!');
    } else {
      // Add new supplement
      await dbAddSupl(nome, fase, tipo, preco, qtd_diaria);
      toast('💊 Suplemento adicionado!');
    }

    // Reset form
    document.getElementById('suplNome').value = '';
    const precoEl = document.getElementById('suplPreco');
    const qtdEl = document.getElementById('suplQtd');
    if (precoEl) precoEl.value = '';
    if (qtdEl) qtdEl.value = '';
    if (modal) {
      modal.__editId = null;
      modal.querySelector('.mod-title').textContent = '💊 Novo Suplemento';
    }
    closeMod('suplModal');
    loadSupl();
  } catch (e) { toast('❌ Erro: ' + e.message); }
}
