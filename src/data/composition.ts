// 恒星の「現在の表面（大気）組成」のモデル（要件8）。
// ※ 宇宙初期の元素組成や、恒星中心部で核融合により変化した組成とは別物である。

import type { ElementFraction } from '../types';

/**
 * 太陽の現在の表面組成（質量比）。Asplund et al. (2009) ARA&A 47, 481。
 * 区分: A（文献値）
 */
export const SOLAR_SURFACE_COMPOSITION = {
  hydrogen: 0.7381,
  helium: 0.2485,
  metals: 0.0134,
} as const;

/**
 * 重元素（Z）の内訳：太陽の表面組成に占める主な元素の質量比（Asplund et al. 2009 を丸めた値）。
 * 合計がZに満たない分は「そのほか」として扱う。区分: A（文献値・丸め）
 */
export const SOLAR_METAL_BREAKDOWN: readonly ElementFraction[] = [
  { symbol: 'O', nameJa: '酸素', massFraction: 0.0057 },
  { symbol: 'C', nameJa: '炭素', massFraction: 0.0024 },
  { symbol: 'Ne', nameJa: 'ネオン', massFraction: 0.0013 },
  { symbol: 'Fe', nameJa: '鉄', massFraction: 0.0013 },
  { symbol: 'N', nameJa: '窒素', massFraction: 0.0007 },
  { symbol: 'Si', nameJa: 'ケイ素', massFraction: 0.0007 },
  { symbol: 'Mg', nameJa: 'マグネシウム', massFraction: 0.0007 },
];

/**
 * 太陽近傍の星の金属量 [Fe/H] の分布（薄い円盤の星の典型的な広がり）。
 * 平均 −0.05, 標準偏差 0.2 dex 程度（例: Casagrande et al. 2011 の太陽近傍サーベイの傾向）。
 * 区分: B（観測傾向から導いた近似）
 */
export const METALLICITY_DISTRIBUTION = {
  meanDex: -0.05,
  sigmaDex: 0.2,
  minDex: -0.6,
  maxDex: 0.4,
} as const;

/**
 * 重元素が増えるとヘリウムも増える傾向 ΔY/ΔZ。銀河の化学進化の観測から 1〜3 程度とされる。
 * 区分: B（近似）
 */
export const HELIUM_ENRICHMENT_RATIO = 1.5;

/**
 * 参考：ビッグバン元素合成による宇宙初期の組成（質量比）。
 * 水素 約75%、ヘリウム 約25%、重元素はほぼゼロ（Planck 2018 の Y_p ≈ 0.245）。
 * UIで「表面組成」との違いを説明するほか、低金属量の星のヘリウム量の下限として使う。
 */
export const PRIMORDIAL_COMPOSITION = {
  hydrogen: 0.755,
  helium: 0.245,
  metals: 0,
} as const;
