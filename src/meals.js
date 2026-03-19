// ═══════════════════════════════════════════════════════════
// Meals Tab — Load, display, check, pie chart, add/delete
// ═══════════════════════════════════════════════════════════
import { Chart, ArcElement, Tooltip, Legend, PieController } from 'chart.js';
Chart.register(ArcElement, Tooltip, Legend, PieController);

import { PHASE_LIMIT, PHASE_PESO } from './config.js';
import { CACHE, dbGetMealCheck, dbSetMealCheck, dbSaveDietFull } from './db.js';
import { gF, gT, today, toast, nowTime, escapeHtml, closeMod } from './ui.js';
import { refeicoes } from './diet-data.js';

let pieChart = null;

// ── Temp state for add-meal modal ────────────────────────
let _newMealIngrs = [];

export function loadMeals() {
  const fase = gF(), tipo = gT();
  const list = refeicoes[fase]?.[tipo] || [];
  const cont = document.getElementById('mealList');
  if (!cont) return;
  cont.innerHTML = '';

  if (!list.length) {
    cont.innerHTML = '<div class="empty"><div class="ei">🍽️</div>Nenhuma refeição cadastrada para esta fase.</div>';
    renderPie([]); return;
  }

  const now = nowTime();
  list.forEach((m, i) => {
    const key  = `m_${fase}_${tipo}_${i}_${today()}`;
    const done = CACHE.mealChecks[key] || false;
    const up   = !done && m.hora === now;
    const card = document.createElement('div');
    card.className = `mc${done ? ' done' : ''}${up ? ' upcoming' : ''}`;
    card.onclick = () => openMeal(fase, tipo, i);
    card.innerHTML =
      `<div class="micon">${escapeHtml(m.icon)}</div>` +
      `<div class="mbody">` +
        `<div class="mname">${escapeHtml(m.nome)}</div>` +
        `<div class="mtime">⏰ ${escapeHtml(m.hora)}</div>` +
        `<div class="mmacro">${m.macros.kcal}kcal · C${m.macros.c} P${m.macros.p} G${m.macros.f}</div>` +
      `</div>` +
      `<div class="mchk">${done ? '✓' : ''}</div>`;
    cont.appendChild(card);
  });

  updateDayStats(list, fase, tipo);
  renderPie(list);
  checkBanner();
}

function updateDayStats(list, fase, tipo) {
  const done = list.filter((_, i) => CACHE.mealChecks[`m_${fase}_${tipo}_${i}_${today()}`]);
  const total = list.reduce((a, m) => ({ kcal: a.kcal + m.macros.kcal, c: a.c + m.macros.c, p: a.p + m.macros.p, f: a.f + m.macros.f }), { kcal: 0, c: 0, p: 0, f: 0 });

  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  el('dKcal', total.kcal);
  el('dCarb', total.c + 'g');
  el('dProt', total.p + 'g');
  el('dGord', total.f + 'g');

  const prog = document.getElementById('dayProg');
  const pct  = list.length ? Math.round((done.length / list.length) * 100) : 0;
  if (prog) {
    prog.querySelector('.pfil').style.width = pct + '%';
    prog.querySelector('.pval').textContent = pct + '%';
    prog.querySelector('.plbl').textContent = done.length + '/' + list.length + ' REFEIÇÕES';
  }
}

function renderPie(list) {
  const canvas = document.getElementById('pieChart');
  if (!canvas) return;
  if (pieChart) { pieChart.destroy(); pieChart = null; }

  const total = list.reduce((a, m) => ({ c: a.c + m.macros.c, p: a.p + m.macros.p, f: a.f + m.macros.f, kcal: a.kcal + m.macros.kcal }), { c: 0, p: 0, f: 0, kcal: 0 });

  const labels = ['Carboidratos', 'Proteínas', 'Gorduras'];
  const data   = [total.c, total.p, total.f];
  const colors = ['#ffaa00', '#00e676', '#ff6b9d'];

  if (!data.some(v => v > 0)) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  pieChart = new Chart(canvas, {
    type: 'pie',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#1a1a1a', titleColor: '#ccc', bodyColor: '#fff' }
      }
    }
  });

  // Legend
  const leg = document.getElementById('pieLeg');
  if (leg) {
    leg.innerHTML = labels.map((l, i) => `<div class="pli"><div class="pldot" style="background:${colors[i]}"></div><span class="pll">${l}</span><span class="plv">${data[i]}g</span></div>`).join('');
  }
  const kel = document.getElementById('pieKcal');
  if (kel) kel.innerHTML = `${total.kcal}<span>kcal/dia</span>`;
}

// ── Open Meal Detail ─────────────────────────────────────
export function openMeal(fase, tipo, idx) {
  const meal = refeicoes[fase]?.[tipo]?.[idx];
  if (!meal) return;

  const ov = document.getElementById('mealOverlay');
  if (!ov) return;

  const key  = `m_${fase}_${tipo}_${idx}_${today()}`;
  const done = !!CACHE.mealChecks[key];

  let ingrHTML = '';
  if (meal.ingrs?.length) {
    ingrHTML = '<table class="itable"><thead><tr><th>Ingrediente</th><th>Qtd</th><th>kcal</th><th>C</th><th>P</th><th>G</th></tr></thead><tbody>';
    meal.ingrs.forEach(i => {
      ingrHTML += `<tr><td>${escapeHtml(i.nome)}</td><td>${escapeHtml(i.qtd)}</td><td>${i.kcal}</td><td>${i.c}</td><td>${i.p}</td><td>${i.f}</td></tr>`;
    });
    ingrHTML += '</tbody></table>';
  }

  const body = ov.querySelector('.pop-body');
  if (body) {
    body.innerHTML =
      `<div class="ptitle">${escapeHtml(meal.icon)} ${escapeHtml(meal.nome)} — ${escapeHtml(meal.hora)}</div>` +
      ingrHTML +
      `<div class="mtot">` +
        `<div class="mttitle">TOTAIS DA REFEIÇÃO</div>` +
        `<div class="mkcal">${meal.macros.kcal}<span>kcal</span></div>` +
        `<div class="mrow"><span class="mlbl" style="color:var(--warn)">Carbs</span><div class="mtrk"><div class="mfil" style="width:${Math.min(100, meal.macros.c)}%;background:var(--warn)"></div></div><span class="mnum">${meal.macros.c}g</span></div>` +
        `<div class="mrow"><span class="mlbl" style="color:var(--ok)">Proteína</span><div class="mtrk"><div class="mfil" style="width:${Math.min(100, meal.macros.p)}%;background:var(--ok)"></div></div><span class="mnum">${meal.macros.p}g</span></div>` +
        `<div class="mrow"><span class="mlbl" style="color:var(--pink)">Gordura</span><div class="mtrk"><div class="mfil" style="width:${Math.min(100, meal.macros.f)}%;background:var(--pink)"></div></div><span class="mnum">${meal.macros.f}g</span></div>` +
      `</div>`;
  }

  const footer = ov.querySelector('.pop-footer');
  if (footer) {
    footer.innerHTML =
      `<div class="popbtns popbtns-3">` +
        `<button class="btn b-ghost" onclick="window.__closeMealOv()">Fechar</button>` +
        `<button class="btn b-danger-solid" id="mealDelBtn">🗑️ Excluir</button>` +
        `<button class="btn ${done ? 'b-danger' : 'b-ok'}" id="mealDoneBtn">${done ? '↩ Desmarcar' : '✓ Concluir'}</button>` +
      `</div>`;
    document.getElementById('mealDoneBtn').onclick = () => toggleMealDone(fase, tipo, idx);
    document.getElementById('mealDelBtn').onclick = () => deleteMeal(fase, tipo, idx);
  }

  ov.classList.add('active');
}

window.__closeMealOv = () => { document.getElementById('mealOverlay')?.classList.remove('active'); };

async function toggleMealDone(fase, tipo, idx) {
  const key   = `m_${fase}_${tipo}_${idx}_${today()}`;
  const isDone = !!CACHE.mealChecks[key];
  try {
    await dbSetMealCheck(fase, tipo, idx, !isDone);
    toast(isDone ? '↩ Desmarcada' : '✅ Refeição concluída!');
    document.getElementById('mealOverlay')?.classList.remove('active');
    loadMeals();
  } catch (e) {
    toast('❌ Erro: ' + e.message);
  }
}

// ── Delete Meal ──────────────────────────────────────────
async function deleteMeal(fase, tipo, idx) {
  if (!confirm('Excluir esta refeição?')) return;
  try {
    const list = refeicoes[fase]?.[tipo];
    if (!list) return;
    list.splice(idx, 1);
    await dbSaveDietFull(refeicoes);
    document.getElementById('mealOverlay')?.classList.remove('active');
    loadMeals();
    toast('🗑️ Refeição excluída');
  } catch (e) {
    toast('❌ Erro: ' + e.message);
  }
}

// ── Add Meal Modal ───────────────────────────────────────
export function openAddMealModal() {
  _newMealIngrs = [];
  const modal = document.getElementById('addMealModal');
  if (!modal) return;
  // Reset form fields
  const nome = document.getElementById('amNome'); if (nome) nome.value = '';
  const hora = document.getElementById('amHora'); if (hora) hora.value = '';
  // Reset icon selection
  document.querySelectorAll('#amIconPicker .icon-opt').forEach(o => o.classList.remove('sel'));
  const first = document.querySelector('#amIconPicker .icon-opt');
  if (first) first.classList.add('sel');
  renderNewMealIngrs();
  updateNewMealMacros();
  modal.classList.add('active');
}

function renderNewMealIngrs() {
  const cont = document.getElementById('amIngrList');
  if (!cont) return;
  if (!_newMealIngrs.length) {
    cont.innerHTML = '<div class="empty" style="padding:12px;font-size:11px">Nenhum ingrediente adicionado</div>';
    return;
  }
  cont.innerHTML = _newMealIngrs.map((ing, i) =>
    `<div class="add-ingr-row">` +
      `<div class="add-ingr-row-info">` +
        `<div class="add-ingr-row-name">${escapeHtml(ing.nome)}</div>` +
        `<div class="add-ingr-row-mac">${ing.qtd} · ${ing.kcal}kcal · C${ing.c} P${ing.p} G${ing.f}</div>` +
      `</div>` +
      `<button class="add-ingr-del" onclick="window.__delNewIngr(${i})">✕</button>` +
    `</div>`
  ).join('');
}

function updateNewMealMacros() {
  const t = _newMealIngrs.reduce((a, b) => ({ kcal: a.kcal + b.kcal, c: a.c + b.c, p: a.p + b.p, f: a.f + b.f }), { kcal: 0, c: 0, p: 0, f: 0 });
  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  el('amKcal', t.kcal);
  el('amC', t.c + 'g');
  el('amP', t.p + 'g');
  el('amF', t.f + 'g');
}

export function addNewMealIngr() {
  const nome = document.getElementById('amiNome')?.value.trim();
  const qtd  = document.getElementById('amiQtd')?.value.trim();
  const kcal = parseFloat(document.getElementById('amiKcal')?.value || '0');
  const c    = parseFloat(document.getElementById('amiC')?.value || '0');
  const p    = parseFloat(document.getElementById('amiP')?.value || '0');
  const f    = parseFloat(document.getElementById('amiF')?.value || '0');
  if (!nome) { toast('⚠️ Digite o nome do ingrediente'); return; }
  if (!qtd)  { toast('⚠️ Digite a quantidade'); return; }
  _newMealIngrs.push({ nome, qtd, amount: parseFloat(qtd) || 0, kcal: Math.round(kcal), c: Math.round(c), p: Math.round(p), f: Math.round(f), id: 'custom' });
  // Clear fields
  ['amiNome', 'amiQtd', 'amiKcal', 'amiC', 'amiP', 'amiF'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  renderNewMealIngrs();
  updateNewMealMacros();
}

window.__delNewIngr = (i) => {
  _newMealIngrs.splice(i, 1);
  renderNewMealIngrs();
  updateNewMealMacros();
};

export async function salvarNewMeal() {
  const nome = document.getElementById('amNome')?.value.trim();
  const hora = document.getElementById('amHora')?.value.trim();
  const iconEl = document.querySelector('#amIconPicker .icon-opt.sel');
  const icon = iconEl?.textContent || '🍽️';

  if (!nome) { toast('⚠️ Digite o nome da refeição'); return; }
  if (!hora || !/^\d{2}:\d{2}$/.test(hora)) { toast('⚠️ Hora inválida (use HH:MM)'); return; }

  const fase = gF(), tipo = gT();

  // Build macros from ingredients
  const macros = _newMealIngrs.reduce((a, b) => ({
    kcal: a.kcal + b.kcal, c: a.c + b.c, p: a.p + b.p, f: a.f + b.f
  }), { kcal: 0, c: 0, p: 0, f: 0 });

  const meal = { nome, hora, icon, ingrs: [..._newMealIngrs], macros };

  refeicoes[fase] = refeicoes[fase] || {};
  refeicoes[fase][tipo] = refeicoes[fase][tipo] || [];
  refeicoes[fase][tipo].push(meal);

  // Sort by time
  refeicoes[fase][tipo].sort((a, b) => a.hora.localeCompare(b.hora));

  try {
    await dbSaveDietFull(refeicoes);
    closeMod('addMealModal');
    loadMeals();
    toast('✅ Refeição adicionada!');
  } catch (e) {
    toast('❌ Erro: ' + e.message);
  }
}

// ── Phase Banner ─────────────────────────────────────────
export function checkBanner() {
  const fase = gF();
  const peso = CACHE.pesos.length ? CACHE.pesos[CACHE.pesos.length - 1].p : 0;
  const lim  = PHASE_LIMIT[fase] || 999;
  const el   = document.getElementById('phaseBanner');
  if (el) el.classList.toggle('show', peso >= lim && parseInt(fase) < 7);
}

export function avancarFase() {
  const sel = document.getElementById('fase');
  if (!sel) return;
  const cur = parseInt(sel.value);
  if (cur < 7) {
    sel.value = String(cur + 1);
    sel.dispatchEvent(new Event('change'));
    toast('🚀 Avançou para Fase ' + (cur + 1) + '!');
  }
}
