// ══════════════════════════════════════════════
// TypeScript Types for Bulking PRO MAX
// ══════════════════════════════════════════════

export interface Profile {
  id: string;
  nome: string;
  peso_atual?: number;
  fase_atual?: number;
  tipo_dia?: string;
  meta_peso?: number;
  updated_at?: string;
}

export interface WeightEntry {
  id: string;
  d: string; // formatted date "dd/mm/yyyy"
  p: number; // peso
}

export interface WaterEntry {
  id: string;
  ml: number;
  t: string; // hora "HH:MM"
}

export interface Supplement {
  id: string;
  nome: string;
  fase: string;
  tipo: string;
  preco: number;
  qtd_diaria: string;
  unidade: string;
  preco_total: number;
  qtd_total: number;
}

export interface Ingredient {
  id: string;
  nome: string;
  qtd: string;
  amount: number;
  kcal: number;
  c: number;
  p: number;
  f: number;
}

export interface Macros {
  kcal: number;
  c: number;
  p: number;
  f: number;
}

export interface Meal {
  nome: string;
  hora: string;
  icon: string;
  ingrs: Ingredient[];
  macros: Macros;
}

export interface CustomIngredient {
  id: string;
  nome: string;
  kcal: number;
  c: number;
  p: number;
  f: number;
  per: number;
  unit: string;
  amount: number;
  precoUnit: string;
}

export interface PriceInfo {
  val: number;
  unit: string;
  cook_factor: number;
}

export interface NutritionalData {
  nome: string;
  kcal: number;
  c: number;
  p: number;
  f: number;
  per: number;
  unit: string;
}

export interface CookInfo {
  rawPer1g: number;
  rawLabel: string;
  conv: string;
}

export interface AutoCookEntry {
  keys: string[];
  factor: number;
  label: string;
}

export interface Cache {
  waterLog: WaterEntry[];
  mealChecks: Record<string, boolean>;
  pesos: WeightEntry[];
  supls: Supplement[];
  suplChecks: Record<string, boolean>;
  precos: Record<string, PriceInfo>;
  customIngrs: CustomIngredient[];
}

export type Fase = '1' | '2' | '3' | '4' | '5' | '6' | '7';
export type TipoDia = 'trabalho' | 'folga';
export type Refeicoes = Record<string, Record<string, Meal[]>>;

export interface IngredientGroup {
  label: string;
  ids: string[];
}
