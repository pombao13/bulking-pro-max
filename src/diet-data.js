// ═══════════════════════════════════════════════════════════
// Diet Data — Nutritional DB, phases, calculations
// ═══════════════════════════════════════════════════════════

// Nutritional database (per 100g or per unit for eggs)
export const DB = {
  farinha_arroz: { nome: 'Farinha de arroz',    kcal: 360, c: 80,  p: 7,   f: 1,   per: 100, unit: 'g' },
  farinha_amend: { nome: 'Farinha de amendoim', kcal: 567, c: 20,  p: 26,  f: 50,  per: 100, unit: 'g' },
  polvilho:      { nome: 'Polvilho doce',       kcal: 353, c: 86,  p: 0.5, f: 0.3, per: 100, unit: 'g' },
  beterraba:     { nome: 'Beterraba em pó',     kcal: 43,  c: 10,  p: 2,   f: 0.2, per: 100, unit: 'g' },
  levedo:        { nome: 'Levedo de cerveja',   kcal: 290, c: 38,  p: 40,  f: 2,   per: 100, unit: 'g' },
  whey:          { nome: 'Whey protein',        kcal: 380, c: 5,   p: 74,  f: 7,   per: 100, unit: 'g' },
  banana:        { nome: 'Banana',              kcal: 89,  c: 23,  p: 1.1, f: 0.3, per: 100, unit: 'g' },
  mel:           { nome: 'Mel',                 kcal: 304, c: 82,  p: 0.3, f: 0,   per: 100, unit: 'g' },
  arroz:         { nome: 'Arroz (cozido)',      kcal: 130, c: 28,  p: 2.7, f: 0.3, per: 100, unit: 'g' },
  macarrao:      { nome: 'Macarrão (cozido)',   kcal: 158, c: 31,  p: 5.8, f: 0.9, per: 100, unit: 'g' },
  frango:        { nome: 'Frango (grelhado)',   kcal: 165, c: 0,   p: 31,  f: 3.6, per: 100, unit: 'g' },
  pure:          { nome: 'Purê de batata',      kcal: 83,  c: 17,  p: 2,   f: 0.7, per: 100, unit: 'g' },
  ovo:           { nome: 'Ovo',                 kcal: 72,  c: 0.4, p: 6,   f: 5,   per: 1,   unit: 'un' },
  azeite:        { nome: 'Azeite de oliva',     kcal: 884, c: 0,   p: 0,   f: 100, per: 100, unit: 'ml' },
};

// Display groups for the Ingredients tab
export const GROUPS = [
  { label: '🥤 Shake Base',   ids: ['farinha_arroz', 'farinha_amend', 'polvilho', 'beterraba', 'levedo', 'whey'] },
  { label: '🍚 Carboidratos', ids: ['arroz', 'macarrao', 'banana', 'mel'] },
  { label: '🍗 Proteínas',    ids: ['frango', 'ovo'] },
  { label: '🫒 Outros',       ids: ['azeite', 'pure'] },
];

// Raw → Cooked conversion factors (for known DB items)
export const COOK = {
  arroz:    { rawPer1g: 1 / 2.6,  rawLabel: 'Arroz cru',    conv: '1g cru → 2,6g cozido' },
  macarrao: { rawPer1g: 1 / 2.2,  rawLabel: 'Macarrão cru', conv: '1g cru → 2,2g cozido' },
  frango:   { rawPer1g: 1 / 0.80, rawLabel: 'Frango cru',   conv: '1g cru → 0,8g grelhado' },
  pure:     { rawPer1g: 1 / 0.85, rawLabel: 'Batata crua',  conv: '1g crua → 0,85g purê' },
};

// ── Auto cook factors for AI-imported ingredients ────────
// Format: keyword → cook_factor (1g raw → Xg cooked)
// Used to automatically detect raw→cooked conversion
const AUTO_COOK_MAP = [
  // Grãos & Cereais
  { keys: ['arroz'],                               factor: 2.6,  label: 'Arroz' },
  { keys: ['macarr', 'espaguete', 'penne', 'fusilli', 'talharim', 'massa', 'lasanha'], factor: 2.2, label: 'Massa' },
  { keys: ['feij'],                                factor: 2.5,  label: 'Feijão' },
  { keys: ['lentilha'],                            factor: 2.5,  label: 'Lentilha' },
  { keys: ['grão de bico', 'grao de bico', 'grão-de-bico'], factor: 2.0, label: 'Grão de bico' },
  { keys: ['quinoa', 'quinua'],                    factor: 2.6,  label: 'Quinoa' },
  { keys: ['aveia'],                               factor: 2.5,  label: 'Aveia' },
  { keys: ['cuscuz', 'couscous'],                  factor: 1.5,  label: 'Cuscuz' },
  { keys: ['milho'],                               factor: 1.0,  label: 'Milho' },
  // Carnes
  { keys: ['frango', 'peito de frango'],           factor: 0.75, label: 'Frango' },
  { keys: ['patinho', 'coxão', 'alcatra', 'maminha', 'contra', 'filé mignon', 'file mignon', 'carne bovina', 'bife'], factor: 0.70, label: 'Carne bovina' },
  { keys: ['carne moída', 'carne moida'],          factor: 0.70, label: 'Carne moída' },
  { keys: ['porco', 'suíno', 'suino', 'lombo', 'bisteca'], factor: 0.72, label: 'Carne suína' },
  { keys: ['peru'],                                factor: 0.78, label: 'Peru' },
  { keys: ['pato'],                                factor: 0.65, label: 'Pato' },
  // Peixes & Frutos do mar
  { keys: ['salmão', 'salmao'],                    factor: 0.80, label: 'Salmão' },
  { keys: ['tilápia', 'tilapia'],                  factor: 0.75, label: 'Tilápia' },
  { keys: ['atum'],                                factor: 0.80, label: 'Atum' },
  { keys: ['bacalhau'],                            factor: 0.75, label: 'Bacalhau' },
  { keys: ['peixe'],                               factor: 0.78, label: 'Peixe' },
  { keys: ['camarão', 'camarao'],                  factor: 0.75, label: 'Camarão' },
  // Tubérculos
  { keys: ['batata doce', 'batata-doce'],          factor: 0.85, label: 'Batata doce' },
  { keys: ['batata'],                              factor: 0.85, label: 'Batata' },
  { keys: ['mandioca', 'aipim', 'macaxeira'],      factor: 0.85, label: 'Mandioca' },
  { keys: ['inhame', 'cará', 'cara'],              factor: 0.85, label: 'Inhame' },
  // Legumes
  { keys: ['brócolis', 'brocolis'],                factor: 0.85, label: 'Brócolis' },
  { keys: ['abobrinha'],                           factor: 0.85, label: 'Abobrinha' },
  { keys: ['abóbora', 'abobora'],                  factor: 0.85, label: 'Abóbora' },
  { keys: ['cenoura'],                             factor: 0.85, label: 'Cenoura' },
  { keys: ['espinafre'],                           factor: 0.70, label: 'Espinafre' },
  { keys: ['couve'],                               factor: 0.80, label: 'Couve' },
  { keys: ['vagem'],                               factor: 0.85, label: 'Vagem' },
  { keys: ['ervilha'],                             factor: 2.0,  label: 'Ervilha' },
  { keys: ['chuchu'],                              factor: 0.85, label: 'Chuchu' },
  // Ovos (não muda peso)
  { keys: ['ovo'],                                 factor: 0.90, label: 'Ovo' },
];

// Find auto cook factor by ingredient name (fuzzy match)
export function getAutoCookFactor(nome) {
  if (!nome) return null;
  const lower = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const entry of AUTO_COOK_MAP) {
    for (const key of entry.keys) {
      const keyNorm = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (lower.includes(keyNorm)) {
        return { factor: entry.factor, label: entry.label };
      }
    }
  }
  return null;
}

// ── Calculation functions ────────────────────────────────
export function calcI(id, amount) {
  const d = DB[id];
  if (!d) return null;
  const f = amount / d.per;
  return {
    id, nome: d.nome,
    qtd: (d.unit === 'un' ? amount + 'un' : amount + d.unit),
    amount,
    kcal: Math.round(d.kcal * f),
    c: +(d.c * f).toFixed(1),
    p: +(d.p * f).toFixed(1),
    f: +(d.f * f).toFixed(1),
  };
}

export function mkMeal(nome, hora, icon, pairs) {
  const ingrs = pairs.map(([id, amt]) => calcI(id, amt)).filter(Boolean);
  const mac = ingrs.reduce((a, b) => ({ kcal: a.kcal + b.kcal, c: a.c + b.c, p: a.p + b.p, f: a.f + b.f }), { kcal: 0, c: 0, p: 0, f: 0 });
  mac.c = Math.round(mac.c); mac.p = Math.round(mac.p); mac.f = Math.round(mac.f);
  return { nome, hora, icon, ingrs, macros: mac };
}

// Shake Base and Turbo recipes
const SB = [['farinha_arroz', 20], ['farinha_amend', 20], ['polvilho', 20], ['beterraba', 15], ['levedo', 15], ['whey', 30]];
const ST = [...SB, ['banana', 200], ['mel', 20]];

// Phase builder
function buildFase(ar, fr, ma1, ma2, pu, ov, az, shTrab = 'SB', shFolga = 'SB') {
  const sht = shTrab === 'ST' ? ST : SB;
  const shf = shFolga === 'ST' ? ST : SB;
  const shtI = shTrab === 'ST' ? '💣' : '🥤';
  const shfI = shFolga === 'ST' ? '💣' : '🥤';
  const shtN = shTrab === 'ST' ? 'Shake Turbo' : 'Shake Base';
  const shfN = shFolga === 'ST' ? 'Shake Turbo' : 'Shake Base';
  return {
    trabalho: [
      mkMeal('Arroz + Frango',    '12:30', '🍚', [['arroz', ar], ['frango', fr], ['azeite', az]]),
      mkMeal(shtN,                '15:30', shtI,  sht),
      mkMeal('Macarrão',          '18:00', '🍝', [['macarrao', ma1], ['azeite', Math.round(az * 1.2)]]),
      mkMeal('Purê + Ovos',       '23:00', '🥔', [['pure', pu], ['ovo', ov]]),
      mkMeal('Arroz',             '03:00', '🍚', [['arroz', ar], ['azeite', az]]),
      mkMeal('Macarrão',          '06:30', '🍝', [['macarrao', ma2]]),
    ],
    folga: [
      mkMeal(shfN,                '08:30', shfI,  shf),
      mkMeal('Arroz + Frango',    '11:30', '🍚', [['arroz', ar + 50], ['frango', fr], ['azeite', az]]),
      mkMeal('Purê + Ovos',       '16:30', '🥔', [['pure', pu], ['ovo', ov]]),
      mkMeal('Macarrão',          '20:00', '🍝', [['macarrao', ma1], ['azeite', az]]),
      mkMeal('Arroz + Banana',    '22:30', '🍚', [['arroz', 100], ['banana', 100], ...(shTrab === 'ST' ? [['mel', 15]] : [])]),
    ]
  };
}

// All 7 phases
export let refeicoes = {
  '1': buildFase(150, 80,  150, 100, 130, 3, 10, 'SB', 'SB'),
  '2': buildFase(170, 95,  170, 120, 140, 3, 12, 'SB', 'SB'),
  '3': buildFase(200, 110, 200, 150, 150, 3, 12, 'ST', 'SB'),
  '4': buildFase(220, 120, 220, 170, 160, 3, 15, 'ST', 'ST'),
  '5': buildFase(240, 130, 240, 190, 170, 3, 15, 'ST', 'ST'),
  '6': buildFase(260, 140, 260, 210, 180, 4, 15, 'ST', 'ST'),
  '7': buildFase(280, 150, 280, 230, 190, 4, 15, 'ST', 'ST'),
};

export function setRefeicoes(r) { refeicoes = r; }

// Apply imported diet data
export function applyImportedDiet(data) {
  const fases = data.fases || data;
  Object.keys(fases).forEach(fk => {
    ['trabalho', 'folga'].forEach(tipo => {
      const meals = fases[fk]?.[tipo];
      if (!Array.isArray(meals)) return;
      refeicoes[fk] = refeicoes[fk] || {};
      refeicoes[fk][tipo] = meals.map(m => {
        // Support both formats: 'ingredientes' (from JSON import) 
        // and 'ingrs' (from saved in-memory state via dbSaveDietFull)
        const rawIngrs = m.ingredientes || m.ingrs || [];
        const ingrs = rawIngrs.map(i => ({
          id: i.id || 'custom', nome: i.nome, qtd: i.qtd || '',
          amount: parseFloat(i.amount) || parseFloat(i.qtd) || 0,
          kcal: i.kcal || 0, c: i.c || 0, p: i.p || 0, f: i.f || 0
        }));
        // Recalculate macros or use saved ones
        const mac = m.macros || ingrs.reduce((a, b) => ({ kcal: a.kcal + b.kcal, c: a.c + b.c, p: a.p + b.p, f: a.f + b.f }), { kcal: 0, c: 0, p: 0, f: 0 });
        mac.c = Math.round(mac.c); mac.p = Math.round(mac.p); mac.f = Math.round(mac.f);
        return { nome: m.nome || 'Refeição', hora: m.hora || '00:00', icon: m.icon || '🍽️', ingrs, macros: mac };
      });
    });
  });
}

// Schema prompt for AI diet generation
export const DIET_SCHEMA = `ASSISTENTE NUTRICIONAL — GERADOR DE DIETA PERSONALIZADA
=========================================================

Você é um nutricionista esportivo especializado em composição corporal.
Sua tarefa é criar um plano alimentar 100% personalizado para o usuário,
seguindo EXATAMENTE o formato JSON especificado ao final.

INSTRUÇÕES PARA O ASSISTENTE:
1. Antes de criar a dieta, FAÇA AS PERGUNTAS ABAIXO ao usuário
2. Com base nas respostas, calcule os macros ideais
3. Monte as 7 fases progressivas
4. Retorne APENAS o JSON válido

═══════════════════════════════════════════════
PERGUNTAS QUE VOCÊ DEVE FAZER AO USUÁRIO:
═══════════════════════════════════════════════

1. Qual o seu OBJETIVO principal?
   a) Ganhar massa muscular (bulking)
   b) Perder gordura (cutting)
   c) Manter o peso atual (recomposição)

2. Qual o seu PESO ATUAL (kg)?
3. Qual a sua ALTURA (cm)?
4. Qual a sua IDADE?
5. Qual o seu SEXO biológico?

6. Qual o seu NÍVEL DE ATIVIDADE?
   a) Sedentário (trabalho sentado, sem exercício)
   b) Levemente ativo (exercício 1-2x/semana)
   c) Moderadamente ativo (exercício 3-4x/semana)
   d) Muito ativo (exercício 5-6x/semana ou trabalho físico)
   e) Extremamente ativo (atleta, 2x/dia)

7. Tem alguma RESTRIÇÃO ALIMENTAR ou alergia?
8. Qual a sua ROTINA DE HORÁRIOS?
9. Quantas REFEIÇÕES por dia consegue fazer? (3 a 7)
10. Qual o seu PESO OBJETIVO (kg)?

═══════════════════════════════════════════════
ESTRUTURA OBRIGATÓRIA DO JSON DE SAÍDA:
═══════════════════════════════════════════════
{
  "fases": {
    "1": {
      "trabalho": [
        {
          "nome": "Nome da refeição",
          "hora": "HH:MM",
          "icon": "🍚",
          "ingredientes": [
            { "nome": "Nome do alimento", "qtd": "150g", "kcal": 195, "c": 42, "p": 4, "f": 1 }
          ]
        }
      ],
      "folga": [...]
    },
    "2": { "trabalho": [...], "folga": [...] },
    ...
    "7": { "trabalho": [...], "folga": [...] }
  }
}

REGRAS DO JSON:
- Use chaves "1" até "7" em "fases"
- "trabalho" = dias de trabalho | "folga" = dias de folga/descanso
- "qtd" no formato "150g", "200ml", "3un"
- Valores kcal, c, p, f referem-se à quantidade em "qtd" (não por 100g)
- Alimentos COZIDOS/PRONTOS para consumo
- RETORNE APENAS O JSON VÁLIDO, sem texto antes ou depois`;
