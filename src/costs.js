// ═══════════════════════════════════════════════════════════
// Costs Tab — Daily/monthly cost calculations + chart
// ═══════════════════════════════════════════════════════════
import { Chart, BarElement, BarController, CategoryScale, LinearScale, Tooltip as ChartTooltip } from 'chart.js';
Chart.register(BarElement, BarController, CategoryScale, LinearScale, ChartTooltip);

import { PHASE_PESO } from './config.js';
import { CACHE, gPrecos } from './db.js';
import { gF, gT, fmtR, fmtKg, escapeHtml, fmtMoneyInput } from './ui.js';
import { refeicoes, COOK, DB } from './diet-data.js';
import { savePriceInline } from './ingredients.js';

let cChart = null;

// Expose savePriceInline globally for inline inputs
window.savePriceInline = savePriceInline;
window.fmtMoneyInput   = fmtMoneyInput;

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

  // Known DB ingredients
  Object.keys(uso).filter(k => !k.startsWith('__meta_') && !k.startsWith('ai_')).forEach(id => {
    const d = DB[id];
    if (!d) return;
    const dayAmt = uso[id];
    const ck     = COOK[id];
    const rawAmt = ck ? Math.round(dayAmt * ck.rawPer1g) : dayAmt;
    const prKey  = id;
    const pr     = precos[prKey] || { val: 0, unit: 'kg' };
    let custoDia = 0;
    if (pr.val > 0) {
      if (d.unit === 'un') custoDia = rawAmt * pr.val;
      else custoDia = (rawAmt / 1000) * pr.val;
    }
    grandDia += custoDia;
    if (custoDia > 0) { barL.push(d.nome); barV.push(+(custoDia).toFixed(2)); barC.push('#c8ff00'); }

    const row = document.createElement('div');
    row.className = 'cost-row';
    row.innerHTML =
      `<div class="cost-row-head"><span class="cost-row-name">${escapeHtml(d.nome)}</span>` +
        (ck ? `<span class="cost-raw-tag">${ck.conv}</span>` : '') +
      `</div>` +
      `<div class="cost-grid">` +
        `<div class="cost-cell"><div class="cc-lbl">Qtd / dia</div><div class="cc-val">${Math.round(dayAmt)}${d.unit}</div></div>` +
        (ck ? `<div class="cost-cell"><div class="cc-lbl">Cru / dia</div><div class="cc-val">${rawAmt}g</div></div>` : '') +
        `<div class="cost-cell"><div class="cc-lbl">Comprar / mês</div><div class="cc-val">${fmtKg(rawAmt * 30)}</div></div>` +
        `<div class="cost-cell"><div class="cc-lbl" style="color:var(--lime)">Custo / dia</div><div class="cc-val" style="color:var(--lime)">${custoDia > 0 ? fmtR(custoDia) : '—'}</div></div>` +
      `</div>` +
      `<div style="margin-top:8px">` +
        `<div class="cc-lbl" style="margin-bottom:5px">Preço (R$/kg)</div>` +
        `<div style="display:flex;gap:8px;align-items:center">` +
          `<input class="price-inp" type="text" inputmode="decimal" placeholder="0,00"` +
          ` value="${pr.val ? pr.val.toFixed(2).replace('.', ',') : ''}"` +
          ` id="pi_${id}"` +
          ` onblur="savePriceInline('${id}',this.value,'kg')"` +
          ` onfocus="this.select()" oninput="fmtMoneyInput(this)"` +
          ` onkeydown="if(event.key==='Enter')this.blur()">` +
          `<span style="font-size:11px;color:var(--m2);">R$/kg</span>` +
          `<span style="font-size:11px;color:var(--m2);">${custoDia > 0 ? fmtR(custoDia * 30) + '/mês' : ''}</span>` +
        `</div>` +
      `</div>`;
    cont.appendChild(row);
  });

  // AI imported ingredients
  Object.keys(uso).filter(k => k.startsWith('ai_')).forEach(key => {
    const meta = uso['__meta_' + key] || { nome: key, unit: 'g' };
    const dayAmt = uso[key];
    const id = key;
    const pr = precos[id] || { val: 0, unit: 'kg' };
    let custo = 0;
    if (pr.val) custo = (dayAmt / 1000) * pr.val;
    grandDia += custo;
    if (custo > 0) { barL.push(meta.nome); barV.push(+(custo).toFixed(2)); barC.push('#00e5ff'); }

    const row = document.createElement('div');
    row.className = 'cost-row';
    row.style.borderColor = 'rgba(0,229,255,.2)';
    row.innerHTML =
      `<div class="cost-row-head"><span class="cost-row-name">${escapeHtml(meta.nome)} <span style="font-size:9px;color:var(--cyan);font-weight:700">IMPORTADO</span></span></div>` +
      `<div class="cost-grid">` +
        `<div class="cost-cell"><div class="cc-lbl">Qtd / dia</div><div class="cc-val">${Math.round(dayAmt)}g</div></div>` +
        `<div class="cost-cell"><div class="cc-lbl">Comprar / mês</div><div class="cc-val">${fmtKg(dayAmt * 30)}</div></div>` +
        `<div class="cost-cell"><div class="cc-lbl" style="color:var(--lime)">Custo / dia</div><div class="cc-val" style="color:var(--lime)">${custo > 0 ? fmtR(custo) : '—'}</div></div>` +
      `</div>` +
      `<div style="margin-top:8px">` +
        `<div class="cc-lbl" style="margin-bottom:5px">Preço (R$/kg)</div>` +
        `<div style="display:flex;gap:8px;align-items:center">` +
          `<input class="price-inp" type="text" inputmode="decimal" placeholder="0,00"` +
          ` value="${pr.val ? pr.val.toFixed(2).replace('.', ',') : ''}"` +
          ` id="pi_${id}"` +
          ` onblur="savePriceInline('${id}',this.value,'kg')"` +
          ` onfocus="this.select()" oninput="fmtMoneyInput(this)"` +
          ` onkeydown="if(event.key==='Enter')this.blur()">` +
          `<span style="font-size:11px;color:var(--m2)">R$/kg</span>` +
          `<span style="font-size:11px;color:var(--m2)">${custo > 0 ? fmtR(custo * 30) + '/mês' : ''}</span>` +
        `</div>` +
      `</div>`;
    cont.appendChild(row);
  });

  // Custom ingredients
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
    const row = document.createElement('div');
    row.className = 'cost-row';
    row.style.borderColor = 'rgba(168,85,247,.3)';
    row.innerHTML =
      `<div class="cost-row-head"><span class="cost-row-name">${escapeHtml(c.nome)} <span style="font-size:9px;color:#c084fc;font-weight:700">CUSTOM</span></span></div>` +
      `<div class="cost-grid">` +
        `<div class="cost-cell"><div class="cc-lbl">Uso / dia</div><div class="cc-val">${dayAmt}${c.unit}</div></div>` +
        `<div class="cost-cell"><div class="cc-lbl">Comprar / mês</div><div class="cc-val">${fmtKg(dayAmt * 30)}</div></div>` +
        `<div class="cost-cell"><div class="cc-lbl" style="color:var(--lime)">Custo / dia</div><div class="cc-val" style="color:var(--lime)">${custo > 0 ? fmtR(custo) : '—'}</div></div>` +
      `</div>` +
      `<div style="margin-top:8px">` +
        `<div class="cc-lbl" style="margin-bottom:5px">Preço (${cUnitLabel})</div>` +
        `<div style="display:flex;gap:8px;align-items:center">` +
          `<input class="price-inp" type="text" inputmode="decimal" placeholder="0,00"` +
          ` value="${pr.val ? pr.val.toFixed(2).replace('.', ',') : ''}"` +
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

  if (!Object.keys(uso).filter(k => !k.startsWith('__meta_')).length) {
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
    ctx.fillText('Adicione preços na aba Ingredientes', canvas.width / 2, 40);
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
