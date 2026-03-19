// ═══════════════════════════════════════════════════════════
// Ingredients Tab — Display, pricing, custom ingredients
// ═══════════════════════════════════════════════════════════
import { DB, GROUPS, COOK } from './diet-data.js';
import { CACHE, gPrecos, dbSetPreco, dbAddCustomIngr, dbDelCustomIngr } from './db.js';
import { toast, fmtR, fmtMoneyInput, closeMod, escapeHtml } from './ui.js';
import { renderCustos } from './costs.js';

export function renderIngredientes() {
  const cont = document.getElementById('ingrList');
  if (!cont) return;
  cont.innerHTML = '';
  const precos = gPrecos();

  GROUPS.forEach(grp => {
    const title = document.createElement('div');
    title.className = 'ingr-group-title';
    title.textContent = grp.label;
    cont.appendChild(title);

    grp.ids.forEach(id => {
      const d  = DB[id];
      if (!d) return;
      const pr = precos[id]?.val || 0;
      const row = document.createElement('div');
      row.className = 'ingr-row' + (pr > 0 ? ' has-price' : '');

      const ck = COOK[id];
      const convInfo = ck ? `<span style="font-size:9px;color:var(--cyan);margin-left:5px">${ck.conv}</span>` : '';

      row.innerHTML =
        `<div class="ingr-info">` +
          `<div class="ingr-name">${escapeHtml(d.nome)}${convInfo}</div>` +
          `<div class="ingr-meta">${d.kcal}kcal · C${d.c} P${d.p} G${d.f} / ${d.per}${d.unit}</div>` +
        `</div>` +
        (pr > 0 ? `<span class="ingr-price-badge">${fmtR(pr)}</span>` : '') +
        `<button class="ingr-edit-btn" onclick="window.__editIngr('${id}')">💰</button>`;
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
      const pid = 'c_' + c.id;
      const pr  = precos[pid]?.val || 0;
      const row = document.createElement('div');
      row.className = 'ingr-row' + (pr > 0 ? ' has-price' : '');
      row.innerHTML =
        `<div class="ingr-info">` +
          `<div class="ingr-name">${escapeHtml(c.nome)}<span class="ingr-custom-badge">CUSTOM</span></div>` +
          `<div class="ingr-meta">${c.kcal}kcal · C${c.c} P${c.p} G${c.f} / ${c.per}${c.unit}</div>` +
        `</div>` +
        (pr > 0 ? `<span class="ingr-price-badge">${fmtR(pr)}</span>` : '') +
        `<button class="ingr-edit-btn" onclick="window.__editIngr('${pid}')">💰</button>` +
        `<button class="sdel" onclick="window.__delCustIngr('${c.id}')">🗑️</button>`;
      cont.appendChild(row);
    });
  }
}

window.__editIngr = (id) => {
  const precos = gPrecos();
  const pr = precos[id]?.val || 0;
  const unit = precos[id]?.unit || 'kg';

  const d = DB[id];
  const name = d ? d.nome : CACHE.customIngrs.find(c => 'c_' + c.id === id)?.nome || id;
  const unitLabel = unit === 'un' ? 'R$/un' : unit === 'ml' ? 'R$/L' : 'R$/kg';

  const modal = document.getElementById('ingrPriceModal');
  if (!modal) return;

  modal.querySelector('.mod-title').textContent = '💰 ' + name;
  modal.querySelector('.mod-body-content').innerHTML =
    `<div class="fg">` +
      `<label class="flbl">Preço (${unitLabel})</label>` +
      `<input type="text" inputmode="decimal" id="ingrPriceVal" class="price-inp" ` +
        `value="${pr ? pr.toFixed(2).replace('.', ',') : ''}" ` +
        `placeholder="0,00" oninput="window.__fmtMoney(this)" onfocus="this.select()">` +
    `</div>`;

  modal.classList.add('active');
  modal.__ingrId   = id;
  modal.__ingrUnit = unit;
};

window.__fmtMoney = fmtMoneyInput;

export async function savePriceFromModal() {
  const modal = document.getElementById('ingrPriceModal');
  if (!modal) return;
  const val = parseFloat(document.getElementById('ingrPriceVal')?.value.replace(',', '.') || '0');
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
  const val = parseFloat(rawVal.replace(',', '.') || '0');
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
    // Clear form
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
