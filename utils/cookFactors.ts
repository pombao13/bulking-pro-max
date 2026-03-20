// ══════════════════════════════════════════════
// Cook Factors (from diet-data.js)
// ══════════════════════════════════════════════
import type { CookInfo, AutoCookEntry } from '@/types';

export const COOK: Record<string, CookInfo> = {
  arroz:    { rawPer1g: 1 / 2.6,  rawLabel: 'Arroz cru',    conv: '1g cru → 2,6g cozido' },
  macarrao: { rawPer1g: 1 / 2.2,  rawLabel: 'Macarrão cru', conv: '1g cru → 2,2g cozido' },
  frango:   { rawPer1g: 1 / 0.80, rawLabel: 'Frango cru',   conv: '1g cru → 0,8g grelhado' },
  pure:     { rawPer1g: 1 / 0.85, rawLabel: 'Batata crua',  conv: '1g crua → 0,85g purê' },
};

const AUTO_COOK_MAP: AutoCookEntry[] = [
  { keys: ['arroz'],                               factor: 2.6,  label: 'Arroz' },
  { keys: ['macarr', 'espaguete', 'penne', 'fusilli', 'talharim', 'massa', 'lasanha'], factor: 2.2, label: 'Massa' },
  { keys: ['feij'],                                factor: 2.5,  label: 'Feijão' },
  { keys: ['lentilha'],                            factor: 2.5,  label: 'Lentilha' },
  { keys: ['grão de bico', 'grao de bico', 'grão-de-bico'], factor: 2.0, label: 'Grão de bico' },
  { keys: ['quinoa', 'quinua'],                    factor: 2.6,  label: 'Quinoa' },
  { keys: ['aveia'],                               factor: 2.5,  label: 'Aveia' },
  { keys: ['cuscuz', 'couscous'],                  factor: 1.5,  label: 'Cuscuz' },
  { keys: ['milho'],                               factor: 1.0,  label: 'Milho' },
  { keys: ['frango', 'peito de frango'],           factor: 0.75, label: 'Frango' },
  { keys: ['patinho', 'coxão', 'alcatra', 'maminha', 'contra', 'filé mignon', 'file mignon', 'carne bovina', 'bife'], factor: 0.70, label: 'Carne bovina' },
  { keys: ['carne moída', 'carne moida'],          factor: 0.70, label: 'Carne moída' },
  { keys: ['porco', 'suíno', 'suino', 'lombo', 'bisteca'], factor: 0.72, label: 'Carne suína' },
  { keys: ['peru'],                                factor: 0.78, label: 'Peru' },
  { keys: ['pato'],                                factor: 0.65, label: 'Pato' },
  { keys: ['salmão', 'salmao'],                    factor: 0.80, label: 'Salmão' },
  { keys: ['tilápia', 'tilapia'],                  factor: 0.75, label: 'Tilápia' },
  { keys: ['atum'],                                factor: 0.80, label: 'Atum' },
  { keys: ['bacalhau'],                            factor: 0.75, label: 'Bacalhau' },
  { keys: ['peixe'],                               factor: 0.78, label: 'Peixe' },
  { keys: ['camarão', 'camarao'],                  factor: 0.75, label: 'Camarão' },
  { keys: ['batata doce', 'batata-doce'],          factor: 0.85, label: 'Batata doce' },
  { keys: ['batata'],                              factor: 0.85, label: 'Batata' },
  { keys: ['mandioca', 'aipim', 'macaxeira'],      factor: 0.85, label: 'Mandioca' },
  { keys: ['inhame', 'cará', 'cara'],              factor: 0.85, label: 'Inhame' },
  { keys: ['brócolis', 'brocolis'],                factor: 0.85, label: 'Brócolis' },
  { keys: ['abobrinha'],                           factor: 0.85, label: 'Abobrinha' },
  { keys: ['abóbora', 'abobora'],                  factor: 0.85, label: 'Abóbora' },
  { keys: ['cenoura'],                             factor: 0.85, label: 'Cenoura' },
  { keys: ['espinafre'],                           factor: 0.70, label: 'Espinafre' },
  { keys: ['couve'],                               factor: 0.80, label: 'Couve' },
  { keys: ['vagem'],                               factor: 0.85, label: 'Vagem' },
  { keys: ['ervilha'],                             factor: 2.0,  label: 'Ervilha' },
  { keys: ['chuchu'],                              factor: 0.85, label: 'Chuchu' },
  { keys: ['ovo'],                                 factor: 0.90, label: 'Ovo' },
];

export function getAutoCookFactor(nome: string): { factor: number; label: string } | null {
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
