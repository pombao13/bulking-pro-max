// ══════════════════════════════════════════════
// Formatters & Utility functions (from ui.js)
// ══════════════════════════════════════════════

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

export function fmtR(v: number): string {
  return 'R$\u00a0' + v.toFixed(2).replace('.', ',');
}

export function fmtKg(g: number): string {
  return g < 1000 ? Math.round(g) + 'g' : (g / 1000).toFixed(2) + 'kg';
}

export function fmtMoney(value: string): string {
  let digits = value.replace(/\D/g, '');
  digits = digits.replace(/^0+/, '') || '0';
  while (digits.length < 3) digits = '0' + digits;
  const intPart = digits.slice(0, -2);
  const decPart = digits.slice(-2);
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return formatted + ',' + decPart;
}

export function parseMoney(formatted: string): number {
  return parseFloat(formatted.replace(/\./g, '').replace(',', '.') || '0');
}

export function fmtInitVal(v: number): string {
  if (!v) return '';
  const s = v.toFixed(2);
  const [intPart, decPart] = s.split('.');
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return formatted + ',' + decPart;
}

export function fmtHora(text: string): string {
  let v = text.replace(/\D/g, '');
  if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2, 4);
  return v.slice(0, 5);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).toUpperCase();
}
