// ═══════════════════════════════════════════════════════════
// Costs Tab — Daily/monthly cost calculations + chart
// With unit toggle (g/un), raw/cooked conversion, edit toggle
// ═══════════════════════════════════════════════════════════
import { Chart, BarElement, BarController, CategoryScale, LinearScale, Tooltip as ChartTooltip } from 'chart.js';
Chart.register(BarElement, BarController, CategoryScale, LinearScale, ChartTooltip);

import { PHASE_PESO } from './config.js';
import { CACHE, gPrecos, dbSetPreco } from './db.js';
import { gF, gT, fmtR, fmtKg, escapeHtml, fmtMoneyInput } from './ui.js';
import { refeicoes, COOK, DB } from './diet-data.js';
import { savePriceInline } from './ingredients.js';
import { calcSuplDiario } from './supplements.js';

let cChart = null;

// Format a float to Brazilian money display (e.g. 136 → "136,00", 1.5 → "1,50")
function fmtInitVal(v) {
  if (!v) return '';
  const s = v.toFixed(2); // e.g. "136.00"
  const [intPart, decPart] = s.split('.');
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return formatted + ',' + decPart;
}

// Expose functions globally for inline events
window.savePriceInline   = savePriceInline;
window.fmtMoneyInput     = fmtMoneyInput;
window.savePriceWithUnit = savePriceWithUnit;
window.saveCookFactor    = saveCookFactor;
window.toggleCostEdit    = toggleCostEdit;

// ── Toggle edit section for a cost row ───────────────────
function toggleCostEdit(uid) {
  const el = document.getElementById('cedit_' + uid);
  if (!el) return;
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
  el.style.animation = isOpen ? '' : 'su .2s ease';
}

// ── Save price with unit type ────────────────────────────
function savePriceWithUnit(id, inputEl, unitSelectEl) {
  const rawVal = inputEl.value.replace(/\./g, '').replace(',', '.');
  const valor = parseFloat(rawVal) || 0;
  const unit = unitSelectEl.value;
  const pr = gPrecos()[id] || {};
  dbSetPreco(id, valor, unit, pr.cook_factor || 0);
  renderCustos();
}

// ── Save cook factor ─────────────────────────────────────
function saveCookFactor(id, inputEl) {
  const factor = parseFloat(inputEl.value.replace(',', '.')) || 0;
  const pr = gPrecos()[id] || { val: 0, unit: 'kg' };
  dbSetPreco(id, pr.val, pr.unit, factor);
  renderCustos();
}

export function renderCustos() {
  const fase = gF(), tipo = gT();
  const list = refeicoes[fase]?.[tipo] || [];
  const precos = gPrecos();
  const customs = CACHE.customIngrs;
  const cont = document.getElementById('custoList');
  if (!cont) return;
  cont.innerHTML = '';

  let grandDia = 0;
  const barL = [], barV = [], barC = [];
  const uso = {};

  // Calculate daily usage from meals
  list.forEach(meal => {
    (meal.ingrs || []).forEach(ingr => {
      const id = ingr.id;
      if (!id || id === 'custom') {
        // AI imported ingredient: use nome as key
        const key = 'ai_' + (ingr.nome || '').replace(/\s+/g, '_').toLowerCase();
        const amt = parseFloat(ingr.amount) || parseFloat(ingr.qtd) || 0;
        uso[key] = (uso[key] || 0) + amt;
        if (!uso['__meta_' + key]) uso['__meta_' + key] = { nome: ingr.nome, unit: 'g' };
        return;
      }
      uso[id] = (uso[id] || 0) + (ingr.amount || 0);
    });
  });

  // ── Known DB ingredients ───────────────────────────────
  Object.keys(uso).filter(k => !k.startsWith('__meta_') && !k.startsWith('ai_')).forEach(id => {
    const d = DB[id];
    if (!d) return;
    const dayAmt = uso[id];
    const ck     = COOK[id];
    const rawAmt = ck ? Math.round(dayAmt * ck.rawPer1g) : dayAmt;
    const pr     = precos[id] || { val: 0, unit: 'kg' };
    let custoDia = 0;
    if (pr.val > 0) {
      if (d.unit === 'un' || pr.unit === 'un') custoDia = rawAmt * pr.val;
      else custoDia = (rawAmt / 1000) * pr.val;
    }
    grandDia += custoDia;
    if (custoDia > 0) { barL.push(d.nome); barV.push(+(custoDia).toFixed(2)); barC.push('#c8ff00'); }

    const unitLabel = d.unit === 'un' ? 'R$/un' : 'R$/kg';
    const displayAmt = d.unit === 'un' ? `${Math.round(rawAmt)}un` : `${rawAmt}g`;
    const displayMonthly = d.unit === 'un' ? `${rawAmt * 30}un` : fmtKg(rawAmt * 30);
    const row = document.createElement('div');
    row.className = 'cost-row';
    row.innerHTML =
      `<div class="cost-row-head">` +
        `<span class="cost-row-name">${escapeHtml(d.nome)}</span>` +
        `<button class="cost-edit-btn" onclick="toggleCostEdit('db_${id}')" title="Editar">✏️</button>` +
      `</div>` +
      `<div class="cost-grid">` +
        `<div class="cost-cell"><div class="cc-lbl">QTD CRU / DIA</div><div class="cc-val" style="color:var(--cyan)">${displayAmt}</div></div>` +
        `<div class="cost-cell"><div class="cc-lbl">COMPRAR CRU / MÊS</div><div class="cc-val">${displayMonthly}</div></div>` +
        `<div class="cost-cell"><div class="cc-lbl" style="color:var(--lime)">Custo / dia</div><div class="cc-val" style="color:var(--lime)">${custoDia > 0 ? fmtR(custoDia) : '—'}</div></div>` +
        (ck ? `<div class="cost-cell"><div class="cc-lbl">Cozido (dieta)</div><div class="cc-val" style="font-size:10px;color:var(--m2)">${Math.round(dayAmt)}g <span style="font-size:8px">${ck.conv}</span></div></div>` : '') +
      `</div>` +
      // Collapsible edit section
      `<div id="cedit_db_${id}" style="display:none;margin-top:10px;border-top:1px solid var(--border);padding-top:10px">` +
        `<div class="cc-lbl" style="margin-bottom:5px">Preço (${unitLabel})</div>` +
        `<div style="display:flex;gap:8px;align-items:center">` +
          `<input class="price-inp" type="text" inputmode="decimal" placeholder="0,00"` +
          ` value="${fmtInitVal(pr.val)}"` +
          ` id="pi_${id}"` +
          ` onblur="savePriceInline('${id}',this.value,'${d.unit === 'un' ? 'un' : 'kg'}')"` +
          ` onfocus="this.select()" oninput="fmtMoneyInput(this)"` +
          ` onkeydown="if(event.key==='Enter')this.blur()">` +
          `<span style="font-size:11px;color:var(--m2);">${unitLabel}</span>` +
          `<span style="font-size:11px;color:var(--m2);">${custoDia > 0 ? fmtR(custoDia * 30) + '/mês' : ''}</span>` +
        `</div>` +
      `</div>`;
    cont.appendChild(row);
  });

  // ── AI imported ingredients (with unit toggle + cook factor) ──
  Object.keys(uso).filter(k => k.startsWith('ai_')).forEach(key => {
    const meta = uso['__meta_' + key] || { nome: key, unit: 'g' };
    const dayAmt = uso[key]; // amount in diet = COOKED
    const id = key;
    const pr = precos[id] || { val: 0, unit: 'kg', cook_factor: 0 };
    const currentUnit = pr.unit || 'kg';
    const cookFactor = pr.cook_factor || 0;

    // Calculate raw amount: user enters cooked, we calc raw
    // cook_factor = how much cooked you get from 1g raw (e.g. 2.5 means 1g raw → 2.5g cooked)
    const rawAmt = cookFactor > 0 ? Math.round(dayAmt / cookFactor) : dayAmt;

    let custo = 0;
    if (pr.val > 0) {
      if (currentUnit === 'un') custo = dayAmt * pr.val;
      else custo = (rawAmt / 1000) * pr.val; // price is R$/kg of RAW product
    }
    grandDia += custo;
    if (custo > 0) { barL.push(meta.nome); barV.push(+(custo).toFixed(2)); barC.push('#00e5ff'); }

    const unitLabel = currentUnit === 'un' ? 'R$/un' : 'R$/kg';
    const uid = id.replace(/[^a-zA-Z0-9_]/g, '_'); // safe ID for HTML
    const displayAmt = currentUnit === 'un' ? `${Math.round(rawAmt)}un` : `${rawAmt}g`;
    const displayMonthly = currentUnit === 'un' ? `${rawAmt * 30}un` : fmtKg(rawAmt * 30);
    const row = document.createElement('div');
    row.className = 'cost-row';
    row.style.borderColor = 'rgba(0,229,255,.2)';
    row.innerHTML =
      `<div class="cost-row-head">` +
        `<span class="cost-row-name">${escapeHtml(meta.nome)} <span style="font-size:9px;color:var(--cyan);font-weight:700">IMPORTADO</span></span>` +
        `<button class="cost-edit-btn" onclick="toggleCostEdit('${uid}')" title="Editar">✏️</button>` +
      `</div>` +
      `<div class="cost-grid">` +
        `<div class="cost-cell"><div class="cc-lbl">QTD CRU / DIA</div><div class="cc-val" style="color:var(--cyan)">${displayAmt}</div></div>` +
        `<div class="cost-cell"><div class="cc-lbl">COMPRAR CRU / MÊS</div><div class="cc-val">${displayMonthly}</div></div>` +
        `<div class="cost-cell"><div class="cc-lbl" style="color:var(--lime)">Custo / dia</div><div class="cc-val" style="color:var(--lime)">${custo > 0 ? fmtR(custo) : '—'}</div></div>` +
        (cookFactor > 0 ? `<div class="cost-cell"><div class="cc-lbl">Cozido (dieta)</div><div class="cc-val" style="font-size:10px;color:var(--m2)">${Math.round(dayAmt)}g</div></div>` : `<div class="cost-cell"><div class="cc-lbl" style="color:var(--warn)">⚠️ Sem fator cru</div><div class="cc-val" style="font-size:9px;color:var(--m2)">Edite p/ calcular</div></div>`) +
      `</div>` +
      // Collapsible edit section
      `<div id="cedit_${uid}" style="display:none;margin-top:10px;border-top:1px solid var(--border);padding-top:10px">` +
        // Unit toggle + Price input
        `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px">` +
          `<div style="flex:0 0 auto">` +
            `<div class="cc-lbl" style="margin-bottom:4px">Unidade</div>` +
            `<select id="unit_${uid}" style="background:var(--s2);border:1px solid var(--border);color:var(--txt);border-radius:6px;padding:8px 10px;font-family:Barlow,sans-serif;font-size:12px;font-weight:700;outline:none;cursor:pointer" ` +
              `onchange="savePriceWithUnit('${id}',document.getElementById('pi_${uid}'),this)">` +
              `<option value="kg" ${currentUnit === 'kg' ? 'selected' : ''}>Gramas (R$/kg)</option>` +
              `<option value="un" ${currentUnit === 'un' ? 'selected' : ''}>Unidades (R$/un)</option>` +
            `</select>` +
          `</div>` +
          `<div style="flex:1;min-width:80px">` +
            `<div class="cc-lbl" style="margin-bottom:4px">Preço (${unitLabel})</div>` +
            `<input class="price-inp" type="text" inputmode="decimal" placeholder="0,00"` +
            ` value="${fmtInitVal(pr.val)}"` +
            ` id="pi_${uid}"` +
            ` onblur="savePriceWithUnit('${id}',this,document.getElementById('unit_${uid}'))"` +
            ` onfocus="this.select()" oninput="fmtMoneyInput(this)"` +
            ` onkeydown="if(event.key==='Enter')this.blur()">` +
          `</div>` +
        `</div>` +
        // Cook factor input
        `<div>` +
          `<div class="cc-lbl" style="margin-bottom:4px;letter-spacing:0.5px">🔥 Fator cru→cozido</div>` +
          `<div style="display:flex;gap:6px;align-items:center">` +
            `<span style="font-size:11px;color:var(--m2);white-space:nowrap">1g cru →</span>` +
            `<input class="price-inp" type="text" inputmode="decimal" placeholder="ex: 2,5"` +
            ` value="${cookFactor > 0 ? cookFactor.toString().replace('.', ',') : ''}"` +
            ` style="width:70px;flex:none;text-align:center"` +
            ` onblur="saveCookFactor('${id}',this)"` +
            ` onkeydown="if(event.key==='Enter')this.blur()">` +
            `<span style="font-size:11px;color:var(--m2);white-space:nowrap">g cozido</span>` +
          `</div>` +
          (cookFactor > 0
            ? `<div style="font-size:10px;color:var(--cyan);margin-top:4px">Para ${Math.round(dayAmt)}g cozido → compre <b>${rawAmt}g cru</b></div>`
            : `<div style="font-size:10px;color:var(--muted);margin-top:4px">Ex: Arroz = 2,5 (1g cru vira 2,5g cozido)</div>`) +
        `</div>` +
      `</div>` +
      // Monthly cost
      (custo > 0 ? `<div class="cost-row-total"><span class="crt-lbl">Custo mensal</span><span class="crt-val">${fmtR(custo * 30)}</span></div>` : '');
    cont.appendChild(row);
  });

  // ── Custom ingredients ─────────────────────────────────
  customs.forEach(c => {
    const pid = 'c_' + c.id;
    const pr = precos[pid] || { val: 0, unit: 'kg' };
    const dayAmt = c.amount || 100;
    let custo = 0;
    if (pr.val) {
      if (c.unit === 'un') custo = dayAmt * pr.val;
      else custo = (dayAmt / 1000) * pr.val;
    }
    grandDia += custo;
    if (custo > 0) { barL.push(c.nome); barV.push(+(custo).toFixed(2)); barC.push('#a855f7'); }

    const cUnitLabel = c.unit === 'un' ? 'R$/un' : c.unit === 'ml' ? 'R$/L' : 'R$/kg';
    const cuid = pid.replace(/[^a-zA-Z0-9_]/g, '_');
    const row = document.createElement('div');
    row.className = 'cost-row';
    row.style.borderColor = 'rgba(168,85,247,.3)';
    row.innerHTML =
      `<div class="cost-row-head">` +
        `<span class="cost-row-name">${escapeHtml(c.nome)} <span style="font-size:9px;color:#c084fc;font-weight:700">CUSTOM</span></span>` +
        `<button class="cost-edit-btn" onclick="toggleCostEdit('${cuid}')" title="Editar">✏️</button>` +
      `</div>` +
      `<div class="cost-grid">` +
        `<div class="cost-cell"><div class="cc-lbl">QTD / DIA</div><div class="cc-val">${dayAmt}${c.unit}</div></div>` +
        `<div class="cost-cell"><div class="cc-lbl">COMPRAR / MÊS</div><div class="cc-val">${fmtKg(dayAmt * 30)}</div></div>` +
        `<div class="cost-cell"><div class="cc-lbl" style="color:var(--lime)">Custo / dia</div><div class="cc-val" style="color:var(--lime)">${custo > 0 ? fmtR(custo) : '—'}</div></div>` +
      `</div>` +
      // Collapsible edit section
      `<div id="cedit_${cuid}" style="display:none;margin-top:10px;border-top:1px solid var(--border);padding-top:10px">` +
        `<div class="cc-lbl" style="margin-bottom:5px">Preço (${cUnitLabel})</div>` +
        `<div style="display:flex;gap:8px;align-items:center">` +
          `<input class="price-inp" type="text" inputmode="decimal" placeholder="0,00"` +
          ` value="${fmtInitVal(pr.val)}"` +
          ` id="pi_${pid}"` +
          ` onblur="savePriceInline('${pid}',this.value,'${pr.unit || 'kg'}')"` +
          ` onfocus="this.select()" oninput="fmtMoneyInput(this)"` +
          ` onkeydown="if(event.key==='Enter')this.blur()">` +
          `<span style="font-size:11px;color:var(--m2);white-space:nowrap">${cUnitLabel}</span>` +
          `<span style="font-size:11px;color:var(--m2);white-space:nowrap">${custo > 0 ? fmtR(custo * 30) + '/mês' : ''}</span>` +
        `</div>` +
      `</div>`;
    cont.appendChild(row);
  });

  // ── Supplements costs ──────────────────────────────────
  const suplAll = CACHE.supls.filter(s => (s.fase === fase || s.fase === 'all') && (s.tipo === tipo || s.tipo === 'all'));
  const suplList = suplAll.filter(s => calcSuplDiario(s) > 0);
  if (suplList.length) {
    const suplTitle = document.createElement('div');
    suplTitle.className = 'ingr-group-title';
    suplTitle.style.marginTop = '16px';
    suplTitle.textContent = '💊 Suplementos';
    cont.appendChild(suplTitle);

    suplList.forEach(s => {
      const custoDia = calcSuplDiario(s);
      grandDia += custoDia;
      barL.push(s.nome); barV.push(+(custoDia).toFixed(2)); barC.push('#c084fc');

      const unidLabel = s.unidade === 'gotas' ? 'gotas' : s.unidade === 'g' ? 'g' : s.unidade === 'ml' ? 'ml' : 'un';
      const qtdInfo = s.qtd_diaria ? `${escapeHtml(s.qtd_diaria)} ${unidLabel}/dia` : '';
      const poteInfo = s.preco_total > 0 ? `Pote: ${fmtR(s.preco_total)}` + (s.qtd_total > 0 ? ` · ${s.qtd_total}${s.unidade === 'gotas' ? 'ml' : unidLabel}` : '') : '';

      const row = document.createElement('div');
      row.className = 'cost-row';
      row.style.borderColor = 'rgba(192,132,252,.3)';
      row.innerHTML =
        `<div class="cost-row-head"><span class="cost-row-name">${escapeHtml(s.nome)} <span style="font-size:9px;color:#c084fc;font-weight:700">SUPLEMENTO</span></span></div>` +
        `<div class="cost-grid">` +
          (qtdInfo ? `<div class="cost-cell"><div class="cc-lbl">Uso / dia</div><div class="cc-val">${qtdInfo}</div></div>` : '') +
          (poteInfo ? `<div class="cost-cell"><div class="cc-lbl">Embalagem</div><div class="cc-val" style="font-size:10px">${poteInfo}</div></div>` : '') +
          `<div class="cost-cell"><div class="cc-lbl" style="color:var(--lime)">Custo / dia</div><div class="cc-val" style="color:var(--lime)">${fmtR(custoDia)}</div></div>` +
          `<div class="cost-cell"><div class="cc-lbl" style="color:var(--lime)">Custo / mês</div><div class="cc-val" style="color:var(--lime)">${fmtR(custoDia * 30)}</div></div>` +
        `</div>`;
      cont.appendChild(row);
    });
  }

  if (!Object.keys(uso).filter(k => !k.startsWith('__meta_')).length && !suplList.length) {
    cont.innerHTML = '<div class="empty"><div class="ei">🛒</div>Nenhum ingrediente para esta fase/dia.</div>';
  }

  // Grand total
  const gt = document.createElement('div');
  gt.className = 'grand-total';
  const prot = Math.round(PHASE_PESO[fase] * 2);
  gt.innerHTML =
    `<div class="gt-row"><span class="gt-lbl">Meta proteína (${PHASE_PESO[fase]}kg × 2)</span><span style="font-size:13px;font-weight:700;color:var(--cyan)">${prot}g/dia</span></div>` +
    `<div class="gt-row"><span class="gt-lbl">Total ingredientes / dia</span><span class="gt-val">${grandDia > 0 ? fmtR(grandDia) : '—'}</span></div>` +
    `<div class="gt-row"><span class="gt-lbl">💰 Total / mês (30 dias)</span><span class="gt-val big">${grandDia > 0 ? fmtR(grandDia * 30) : 'Adicione preços →'}</span></div>`;
  cont.appendChild(gt);

  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  el('cDia', grandDia > 0 ? fmtR(grandDia) : 'R$ —');
  el('cMes', grandDia > 0 ? fmtR(grandDia * 30) : 'R$ —');

  renderCustoChart(barL, barV, barC);
}

function renderCustoChart(labels, vals, colors) {
  if (cChart) { cChart.destroy(); cChart = null; }
  const canvas = document.getElementById('custoChart');
  if (!canvas) return;

  if (!vals.filter(v => v > 0).length) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#444';
    ctx.font = '12px Barlow,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Adicione preços na aba Custos', canvas.width / 2, 40);
    return;
  }

  const sorted = labels.map((l, i) => ({ l, v: vals[i], c: colors[i] })).sort((a, b) => b.v - a.v);

  cChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(x => x.l),
      datasets: [{ data: sorted.map(x => x.v), backgroundColor: sorted.map(x => x.c), borderRadius: 5, borderSkipped: false }]
    },
    options: {
      indexAxis: 'y', responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#1a1a1a', titleColor: '#ccc', bodyColor: '#c8ff00', callbacks: { label: ctx => ' ' + fmtR(ctx.raw) + '/dia' } }
      },
      scales: {
        x: { ticks: { color: '#555', font: { size: 9 }, callback: v => 'R$' + v.toFixed(2) }, grid: { color: '#1a1a1a' } },
        y: { ticks: { color: '#aaa', font: { size: 10, family: 'Barlow' } }, grid: { color: '#1a1a1a' } }
      }
    }
  });
}
