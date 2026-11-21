// 日本語の数値表示ユーティリティ

/** 有効数字 digits 桁で丸めた数値 */
export function toSignificant(value: number, digits = 2): number {
  if (value === 0 || !Number.isFinite(value)) return value;
  const p = Math.pow(10, digits - Math.ceil(Math.log10(Math.abs(value))));
  return Math.round(value * p) / p;
}

export function formatSignificant(value: number, digits = 2): string {
  const v = toSignificant(value, digits);
  return v.toLocaleString('ja-JP', { maximumFractionDigits: 6 });
}

export function formatInteger(value: number): string {
  return Math.round(value).toLocaleString('ja-JP');
}

/** 年数を「約320万年」「約3.5億年」「約2.7兆年」のように表す */
export function formatYearsJa(years: number): string {
  const units: [number, string][] = [
    [1e12, '兆年'],
    [1e8, '億年'],
    [1e4, '万年'],
  ];
  for (const [unit, label] of units) {
    if (years >= unit) return `${formatSignificant(years / unit, 2)}${label}`;
  }
  return `${formatSignificant(years, 2)}年`;
}

/** 太陽との比較：「太陽の約70%」「太陽の約6.6倍」 */
export function formatRatioToSun(ratio: number): string {
  if (ratio < 1) {
    const pct = toSignificant(ratio * 100, 2);
    return `太陽の約${pct}%`;
  }
  if (Math.abs(ratio - 1) < 0.005) return '太陽とほぼ同じ';
  return `太陽の約${formatSignificant(ratio, 2)}倍`;
}

/** 公転周期：日 or 年 */
export function formatPeriod(days: number): string {
  if (days < 1) return `約${formatSignificant(days * 24, 2)}時間`;
  if (days < 365.25 * 2) return `約${formatSignificant(days, days < 100 ? 2 : 3)}日`;
  return `約${formatSignificant(days / 365.25, 2)}年`;
}

export function formatPercent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function formatLuminosity(l: number): string {
  if (l >= 10000) return `${formatSignificant(l / 10000, 2)}万`;
  return formatSignificant(l, 2);
}
