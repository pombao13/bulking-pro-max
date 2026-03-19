// ═══════════════════════════════════════════════════════════
// Import/Export — Diet import, download, reset, schema
// ═══════════════════════════════════════════════════════════
import { dbSaveDiet } from './db.js';
import { toast, switchTab, today, escapeHtml } from './ui.js';
import { refeicoes, setRefeicoes, applyImportedDiet, DIET_SCHEMA } from './diet-data.js';
import { loadMeals } from './meals.js';
import { renderCustos } from './costs.js';
import { renderIngredientes } from './ingredients.js';

let _impData = null;

export function impLoadFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => impParseText(e.target.result);
  reader.readAsText(file);
}

export function impParseText(text) {
  try {
    // Try to extract JSON from markdown code blocks
    let json = text;
    const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (match) json = match[1];
    _impData = JSON.parse(json);
    // Show preview
    const preview = document.getElementById('impPreview');
    if (preview) {
      const fases = Object.keys(_impData.fases || _impData);
      const count = fases.reduce((s, f) => {
        const d = (_impData.fases || _impData)[f];
        return s + (d?.trabalho?.length || 0) + (d?.folga?.length || 0);
      }, 0);
      preview.innerHTML = `<b>✅ JSON válido!</b><br>Fases: ${fases.join(', ')}<br>Total: ${count} refeições`;
      preview.classList.add('show');
    }
    const btn = document.getElementById('impApplyBtn');
    if (btn) btn.disabled = false;
    toast('✅ JSON carregado!');
  } catch (e) {
    toast('❌ JSON inválido: ' + e.message);
    _impData = null;
  }
}

export async function impApply() {
  if (!_impData) { toast('⚠️ Carregue um JSON primeiro'); return; }
  try {
    applyImportedDiet(_impData);
    await dbSaveDiet(_impData);
    toast('🎉 Dieta importada com sucesso!');
    loadMeals();
    renderCustos();
    renderIngredientes();
    const preview = document.getElementById('impPreview');
    if (preview) preview.classList.remove('show');
    _impData = null;
  } catch (e) { toast('❌ Erro: ' + e.message); }
}

export function impReset() {
  _impData = null;
  const preview = document.getElementById('impPreview');
  if (preview) preview.classList.remove('show');
  const btn = document.getElementById('impApplyBtn');
  if (btn) btn.disabled = true;
  toast('🗑️ Limpo');
}

export function confirmarResetDieta() {
  if (!confirm('⚠️ Excluir toda a dieta atual?\n\nIsso remove refeições importadas e manuais.\nPreços, peso e água são mantidos.')) return;
  resetDieta();
}

export async function resetDieta() {
  try {
    await dbSaveDiet(null);
    // Rebuild default phases
    const mod = await import('./diet-data.js');
    // The diet-data module reinitializes `refeicoes` on import
    loadMeals();
    toast('🗑️ Dieta resetada!');
  } catch (e) { toast('❌ Erro: ' + e.message); }
}

export function downloadDieta() {
  const fases = {};
  [1, 2, 3, 4, 5, 6, 7].forEach(fk => {
    const k = String(fk);
    fases[k] = {};
    ['trabalho', 'folga'].forEach(tipo => {
      const meals = refeicoes[k]?.[tipo] || [];
      fases[k][tipo] = meals.map(m => ({
        nome: m.nome, hora: m.hora, icon: m.icon,
        ingredientes: (m.ingrs || []).map(i => ({
          nome: i.nome, qtd: i.qtd || String(i.amount || 0) + 'g',
          kcal: i.kcal || 0, c: i.c || 0, p: i.p || 0, f: i.f || 0,
        }))
      }));
    });
  });
  const blob = new Blob([JSON.stringify({ fases }, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'bulking-dieta-' + today() + '.json' });
  a.click(); URL.revokeObjectURL(url);
  toast('📥 Download iniciado!');
}

export function copySchema() {
  const txt = DIET_SCHEMA;
  navigator.clipboard.writeText(txt)
    .then(() => toast('📋 Prompt copiado!'))
    .catch(() => {
      const ta = Object.assign(document.createElement('textarea'), { value: txt, style: 'position:fixed;opacity:0' });
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      toast('📋 Copiado!');
    });
}

export function toggleSchema() {
  const box = document.getElementById('schemaBox');
  if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

export function startQuiz() {
  switchTab('import');
  toast('📋 Use o prompt abaixo para criar sua dieta com IA!');
}

// Drag & drop handlers
export function impDragOver(e)  { e.preventDefault(); e.currentTarget.classList.add('drag'); }
export function impDragLeave(e) { e.currentTarget.classList.remove('drag'); }
export function impDrop(e)      { e.preventDefault(); e.currentTarget.classList.remove('drag'); const f = e.dataTransfer?.files[0]; if (f) impLoadFile(f); }
