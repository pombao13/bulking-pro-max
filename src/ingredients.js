// ═══════════════════════════════════════════════════════════
// Receitas Tab — Display ingredients (no pricing here)
// ═══════════════════════════════════════════════════════════
import { DB, GROUPS, COOK } from './diet-data.js';
import { CACHE, gPrecos, dbSetPreco, dbAddCustomIngr, dbDelCustomIngr } from './db.js';
import { toast, fmtR, fmtMoneyInput, closeMod, escapeHtml } from './ui.js';
import { renderCustos } from './costs.js';

export function renderIngredientes() {
  const cont = document.getElementById('ingrList');
  if (!cont) return;
  cont.innerHTML = '';

  GROUPS.forEach(grp => {
    const title = document.createElement('div');
    title.className = 'ingr-group-title';
    title.textContent = grp.label;
    cont.appendChild(title);

    grp.ids.forEach(id => {
      const d  = DB[id];
      if (!d) return;
      const row = document.createElement('div');
      row.className = 'ingr-row';

      const ck = COOK[id];
      const convInfo = ck ? `<span style="font-size:9px;color:var(--cyan);margin-left:5px">${ck.conv}</span>` : '';

      row.innerHTML =
        `<div class="ingr-info">` +
          `<div class="ingr-name">${escapeHtml(d.nome)}${convInfo}</div>` +
          `<div class="ingr-meta">${d.kcal}kcal · C${d.c} P${d.p} G${d.f} / ${d.per}${d.unit}</div>` +
        `</div>`;
      cont.appendChild(row);
    });
  });

  // Custom ingredients
  if (CACHE.customIngrs.length) {
    const title = document.createElement('div');
    title.className = 'ingr-group-title';
    title.textContent = '🧪 Ingredientes Customizados';
    cont.appendChild(title);

    CACHE.customIngrs.forEach(c => {
      const row = document.createElement('div');
      row.className = 'ingr-row';
      row.innerHTML =
        `<div class="ingr-info">` +
          `<div class="ingr-name">${escapeHtml(c.nome)}<span class="ingr-custom-badge">CUSTOM</span></div>` +
          `<div class="ingr-meta">${c.kcal}kcal · C${c.c} P${c.p} G${c.f} / ${c.per}${c.unit}</div>` +
        `</div>` +
        `<button class="sdel" onclick="window.__delCustIngr('${c.id}')">🗑️</button>`;
      cont.appendChild(row);
    });
  }
}

// Price editing removed from this tab — prices are managed in Custos tab

export async function savePriceFromModal() {
  // kept for compatibility but no longer used from this tab
  const modal = document.getElementById('ingrPriceModal');
  if (!modal) return;
  const val = parseFloat(document.getElementById('ingrPriceVal')?.value.replace(/\./g, '').replace(',', '.') || '0');
  const id  = modal.__ingrId;
  const unit = modal.__ingrUnit || 'kg';
  try {
    await dbSetPreco(id, val, unit);
    closeMod('ingrPriceModal');
    renderIngredientes();
    toast('💰 Preço salvo!');
  } catch (e) { toast('❌ Erro: ' + e.message); }
}

// savePriceInline — used from cost tab inline inputs
export async function savePriceInline(id, rawVal, unit) {
  const val = parseFloat(rawVal.replace(/\./g, '').replace(',', '.') || '0');
  try {
    await dbSetPreco(id, val, unit);
    renderCustos();
    toast('💰 Salvo');
  } catch (e) { toast('❌ Erro: ' + e.message); }
}

export function openIngrModal() {
  document.getElementById('customIngrModal')?.classList.add('active');
}

export async function salvarIngr() {
  const nome = document.getElementById('ciNome')?.value.trim();
  const kcal = parseFloat(document.getElementById('ciKcal')?.value || '0');
  const c    = parseFloat(document.getElementById('ciC')?.value || '0');
  const p    = parseFloat(document.getElementById('ciP')?.value || '0');
  const f    = parseFloat(document.getElementById('ciF')?.value || '0');
  const per  = parseFloat(document.getElementById('ciPer')?.value || '100');
  const unit = document.getElementById('ciUnit')?.value || 'g';
  const amount = parseFloat(document.getElementById('ciAmount')?.value || '100');

  if (!nome) { toast('⚠️ Digite o nome'); return; }
  if (kcal < 0 || c < 0 || p < 0 || f < 0) { toast('⚠️ Valores inválidos'); return; }

  try {
    await dbAddCustomIngr({ nome, kcal, c, p, f, per, unit, amount });
    closeMod('customIngrModal');
    renderIngredientes();
    toast('🧪 Ingrediente adicionado!');
    ['ciNome', 'ciKcal', 'ciC', 'ciP', 'ciF'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  } catch (e) { toast('❌ Erro: ' + e.message); }
}

window.__delCustIngr = async (cid) => {
  if (!confirm('Excluir ingrediente customizado?')) return;
  try {
    await dbDelCustomIngr(cid);
    renderIngredientes();
    toast('🗑️ Removido');
  } catch (e) { toast('❌ Erro: ' + e.message); }
};
