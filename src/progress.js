// ═══════════════════════════════════════════════════════════
// Progress Tab — Weight tracking + chart
// ═══════════════════════════════════════════════════════════
import { Chart, LineElement, LineController, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend } from 'chart.js';
Chart.register(LineElement, LineController, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend);

import { CACHE, gPesos, getMeta, dbAddPeso, dbSetMeta } from './db.js';
import { toast } from './ui.js';
import { checkBanner } from './meals.js';

let gChart = null;

export function salvarPeso() {
  const inp = document.getElementById('pesoInp');
  const v = parseFloat(inp?.value);
  if (!v || v < 30 || v > 300) { toast('⚠️ Peso inválido'); return; }
  dbAddPeso(v).then(() => {
    if (inp) inp.value = '';
    const h = gPesos();
    renderPesoStats(h); renderGrafico(); renderPesoHist();
    checkBanner(); toast('⚖️ Peso salvo!');
  }).catch(e => toast('❌ Erro: ' + e.message));
}

export function salvarMeta() {
  const v = parseFloat(document.getElementById('metaInp')?.value);
  if (!v || v < 30 || v > 300) { toast('⚠️ Inválido'); return; }
  dbSetMeta(v).then(() => {
    document.getElementById('metaInp').value = '';
    renderGrafico(); toast('🎯 Meta definida!');
  }).catch(e => toast('❌ Erro: ' + e.message));
}

export function renderPesoStats(hist) {
  const c = document.getElementById('pesoStats');
  if (!c) return;
  if (!hist?.length) { c.innerHTML = ''; return; }
  const at = hist[hist.length - 1].p, ini = hist[0].p;
  const d = (at - ini).toFixed(1), si = d >= 0 ? '+' : '';
  const co = d >= 0 ? 'var(--ok)' : 'var(--danger)';
  c.innerHTML =
    `<div class="pst"><div class="psv">${at}kg</div><div class="psl">Atual</div></div>` +
    `<div class="pst"><div class="psv">${ini}kg</div><div class="psl">Inicial</div></div>` +
    `<div class="pst"><div class="psv" style="color:${co}">${si}${d}kg</div><div class="psl">Ganho</div></div>`;
}

export function renderGrafico() {
  const hist = gPesos();
  const meta = parseFloat(getMeta() || '0');
  if (gChart) { gChart.destroy(); gChart = null; }
  const canvas = document.getElementById('grafico');
  if (!canvas) return;
  const labels = hist.map(h => h.d), vals = hist.map(h => parseFloat(h.p));
  const ds = [{
    label: 'Peso (kg)', data: vals, borderColor: '#c8ff00',
    backgroundColor: 'rgba(200,255,0,.07)', borderWidth: 2,
    pointBackgroundColor: '#c8ff00', pointRadius: 4, tension: .35, fill: true
  }];
  if (meta && hist.length) {
    ds.push({ label: 'Meta', data: hist.map(() => meta), borderColor: '#00e5ff', borderWidth: 1.5, borderDash: [5, 4], pointRadius: 0 });
  }
  gChart = new Chart(canvas, {
    type: 'line', data: { labels, datasets: ds },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#777', font: { family: 'Barlow', size: 10 } } },
        tooltip: { backgroundColor: '#1a1a1a', titleColor: '#c8ff00', bodyColor: '#ccc' }
      },
      scales: {
        x: { ticks: { color: '#444', font: { size: 9 } }, grid: { color: '#181818' } },
        y: { ticks: { color: '#444', font: { size: 10 } }, grid: { color: '#181818' } }
      }
    }
  });
  renderPesoStats(hist);
}

export function renderPesoHist() {
  const hist = gPesos();
  const c = document.getElementById('pesoHist');
  if (!c) return;
  c.innerHTML = '';
  if (!hist.length) {
    c.innerHTML = '<div class="empty"><div class="ei">📊</div>Nenhum registro ainda</div>';
    return;
  }
  [...hist].reverse().slice(0, 10).forEach((h, ri) => {
    const idx = hist.length - 1 - ri, prev = idx > 0 ? hist[idx - 1].p : null;
    const diff = prev != null ? (h.p - prev).toFixed(1) : null;
    const co = diff === null ? 'var(--m2)' : diff >= 0 ? 'var(--ok)' : 'var(--danger)';
    const si = diff !== null && diff >= 0 ? '+' : '';
    const d = document.createElement('div');
    d.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:var(--s);border:1px solid var(--border);border-radius:8px;padding:9px 12px;font-size:11px;margin-bottom:5px;';
    d.innerHTML = `<span style="color:var(--m2)">${h.d}</span><span style="font-weight:700">${h.p} kg</span>${diff !== null ? `<span style="color:${co};font-size:10px">${si}${diff}kg</span>` : '<span></span>'}`;
    c.appendChild(d);
  });
}
