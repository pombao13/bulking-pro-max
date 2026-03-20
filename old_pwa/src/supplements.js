// ═══════════════════════════════════════════════════════════
// Supplements Tab — Add, edit, toggle, delete, pricing
// ═══════════════════════════════════════════════════════════
import { CACHE, dbAddSupl, dbDelSupl, dbToggleSuplCheck, dbGetSuplCheck } from './db.js';
import { gF, gT, today, toast, closeMod, selC, escapeHtml, fmtR, fmtMoneyInput } from './ui.js';
import { sb } from './supabase.js';
import { _user } from './db.js';

// ── Calculate daily cost from supplement data ────────────
export function calcSuplDiario(s) {
  const preco_total = parseFloat(s.preco_total) || 0;
  const qtd_total = parseFloat(s.qtd_total) || 0;
  const qtd_diaria = parseFloat(s.qtd_diaria) || 0;
  const unidade = s.unidade || 'un';

  if (preco_total <= 0 || qtd_total <= 0 || qtd_diaria <= 0) return 0;

  if (unidade === 'gotas') {
    // gotas: qtd_total is in ML, ~20 drops per ML
    const totalGotas = qtd_total * 20;
    return (qtd_diaria / totalGotas) * preco_total;
  }
  // g, un, ml: straightforward ratio
  return (qtd_diaria / qtd_total) * preco_total;
}

// ── Unit label helpers ───────────────────────────────────
const UNIT_LABELS = {
  un: { total: 'QTD TOTAL (un)', diaria: 'USO DIÁRIO (un)', ph_total: 'Ex: 60', ph_diaria: 'Ex: 2' },
  g: { total: 'QTD TOTAL (g)', diaria: 'USO DIÁRIO (g)', ph_total: 'Ex: 300', ph_diaria: 'Ex: 5' },
  gotas: { total: 'VOLUME DO FRASCO (ml)', diaria: 'GOTAS POR DIA', ph_total: 'Ex: 20', ph_diaria: 'Ex: 2' },
  ml: { total: 'QTD TOTAL (ml)', diaria: 'USO DIÁRIO (ml)', ph_total: 'Ex: 500', ph_diaria: 'Ex: 10' },
};

window.__suplUnidChange = () => {
  const unid = document.querySelector('#suplUnidGrp .chip.sel')?.dataset.val || 'un';
  const labels = UNIT_LABELS[unid] || UNIT_LABELS.un;
  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  el('suplQtdTotalLbl', labels.total);
  el('suplQtdDiariaLbl', labels.diaria);
  const qtEl = document.getElementById('suplQtdTotal');
  const qdEl = document.getElementById('suplQtd');
  if (qtEl) qtEl.placeholder = labels.ph_total;
  if (qdEl) qdEl.placeholder = labels.ph_diaria;
  if (unid === 'gotas') {
    el('suplPrecoLbl', 'VALOR DO FRASCO (R$)');
  } else {
    el('suplPrecoLbl', 'VALOR DO POTE (R$)');
  }
  updateSuplCostPreview();
};

function updateSuplCostPreview() {
  const el = document.getElementById('suplCostPreview');
  if (!el) return;
  const unid = document.querySelector('#suplUnidGrp .chip.sel')?.dataset.val || 'un';
  const precoRaw = document.getElementById('suplPreco')?.value || '0';
  const preco_total = parseFloat(precoRaw.replace(/\./g, '').replace(',', '.') || '0');
  const qtd_total = parseFloat(document.getElementById('suplQtdTotal')?.value.replace(/\./g, '').replace(',', '.') || '0');
  const qtd_diaria = parseFloat(document.getElementById('suplQtd')?.value.replace(/\./g, '').replace(',', '.') || '0');

  const custo = calcSuplDiario({ unidade: unid, preco_total, qtd_total, qtd_diaria });
  if (custo > 0) {
    el.innerHTML = `<span>💰 Custo estimado: <b style="color:var(--lime)">${fmtR(custo)}/dia</b> · <b style="color:var(--lime)">${fmtR(custo * 30)}/mês</b></span>`;
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

// Attach live preview listeners
['suplPreco', 'suplQtdTotal', 'suplQtd'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', updateSuplCostPreview);
});

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

    const custoDia = calcSuplDiario(s);
    const precoInfo = custoDia > 0 ? `<span style="color:var(--lime);font-size:11px;margin-left:6px">${fmtR(custoDia)}/dia</span>` : '';
    const qtdInfo = s.qtd_diaria ? `<span style="color:var(--m2);font-size:10px;margin-left:6px">· ${escapeHtml(s.qtd_diaria)}${s.unidade === 'gotas' ? ' gotas' : s.unidade === 'g' ? 'g' : s.unidade === 'ml' ? 'ml' : ' un'}/dia</span>` : '';

    card.innerHTML =
      `<div class="srow-main" onclick="window.__togSupl('${s.id}')">` +
        `<div class="schk-box ${done ? 'checked' : ''}">${done ? '✓' : ''}</div>` +
        `<div class="sinfo">` +
          `<div class="sname">${escapeHtml(s.nome)}${precoInfo}${qtdInfo}</div>` +
          `<div class="stag">Fase: ${s.fase === 'all' ? 'Todas' : s.fase} · ${s.tipo === 'all' ? 'Todos' : s.tipo}</div>` +
        `</div>` +
        `<button class="sedit-inline" onclick="event.stopPropagation();window.__editSupl('${s.id}')" title="Editar">✏️</button>` +
      `</div>`;
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

// ── Edit supplement ──────────────────────────────────────
window.__editSupl = (id) => {
  const s = CACHE.supls.find(x => x.id === id);
  if (!s) return;
  // Populate modal fields
  const nomeEl = document.getElementById('suplNome');
  const precoEl = document.getElementById('suplPreco');
  const qtdTotalEl = document.getElementById('suplQtdTotal');
  const qtdEl = document.getElementById('suplQtd');
  if (nomeEl) nomeEl.value = s.nome;
  if (precoEl) precoEl.value = s.preco_total > 0 ? s.preco_total.toFixed(2).replace('.', ',') : '';
  if (qtdTotalEl) qtdTotalEl.value = s.qtd_total > 0 ? s.qtd_total : '';
  if (qtdEl) qtdEl.value = s.qtd_diaria || '';

  // Select unidade chip
  document.querySelectorAll('#suplUnidGrp .chip').forEach(c => {
    c.classList.toggle('sel', c.dataset.val === (s.unidade || 'un'));
  });
  window.__suplUnidChange();

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
  const unidade = document.querySelector('#suplUnidGrp .chip.sel')?.dataset.val || 'un';
  const precoRaw = document.getElementById('suplPreco')?.value || '0';
  const preco_total = parseFloat(precoRaw.replace(/\./g, '').replace(',', '.') || '0');
  const qtd_total = parseFloat(document.getElementById('suplQtdTotal')?.value.replace(/\./g, '').replace(',', '.') || '0');
  const qtd_diaria = document.getElementById('suplQtd')?.value.trim() || '';

  // Calculate daily cost for backward compat (preco field)
  const preco = calcSuplDiario({ unidade, preco_total, qtd_total, qtd_diaria: parseFloat(qtd_diaria) || 0 });

  const modal = document.getElementById('suplModal');
  const editId = modal?.__editId;

  try {
    if (editId) {
      // Update existing supplement
      if (sb && _user) {
        await sb.from('supplements').update({
          nome, fase, tipo, preco, unidade, preco_total, qtd_total,
          qtd_diaria: qtd_diaria || null
        }).eq('id', editId).eq('user_id', _user.id);
      }
      const idx = CACHE.supls.findIndex(s => s.id === editId);
      if (idx >= 0) {
        CACHE.supls[idx] = { ...CACHE.supls[idx], nome, fase, tipo, preco, unidade, preco_total, qtd_total, qtd_diaria };
      }
      toast('💊 Suplemento atualizado!');
    } else {
      // Add new supplement
      await dbAddSupl(nome, fase, tipo, preco, qtd_diaria, unidade, preco_total, qtd_total);
      toast('💊 Suplemento adicionado!');
    }

    // Reset form
    document.getElementById('suplNome').value = '';
    const precoEl = document.getElementById('suplPreco');
    const qtdTotalEl = document.getElementById('suplQtdTotal');
    const qtdEl = document.getElementById('suplQtd');
    if (precoEl) precoEl.value = '';
    if (qtdTotalEl) qtdTotalEl.value = '';
    if (qtdEl) qtdEl.value = '';
    document.querySelectorAll('#suplUnidGrp .chip').forEach(c => {
      c.classList.toggle('sel', c.dataset.val === 'un');
    });
    window.__suplUnidChange();
    if (modal) {
      modal.__editId = null;
      modal.querySelector('.mod-title').textContent = '💊 Novo Suplemento';
    }
    closeMod('suplModal');
    loadSupl();
  } catch (e) { toast('❌ Erro: ' + e.message); }
}
