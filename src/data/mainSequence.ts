// 主系列星の「質量 → 温度・半径・寿命」の関係（教育用の近似モデル）。
// 質量を主パラメータとし、他の物理量は質量から相関して決まる（要件4）。

/** 太陽の有効温度 [K]（IAU 2015 Resolution B3 の公称値） */
export const SUN_TEFF_K = 5772;

/** 太陽半径 [AU] */
export const SOLAR_RADIUS_AU = 0.00465047;

/** 宇宙年齢 [年]（Planck 2018: 約138億年） */
export const UNIVERSE_AGE_YEARS = 1.38e10;

/**
 * 質量 [M☉] と表面温度 [K]・半径 [R☉] の対応点。
 * スペクトル型の境界（要件5・6の表）を通り、太陽 (1 M☉, 5772 K, 1 R☉) を通るように作った補間表。
 * 区分ごとの形は Pecaut & Mamajek (2013) の主系列標準値の傾向を参考にしている。
 * 区分: B（近似モデル）
 */
export const MASS_TEFF_RADIUS_TABLE: readonly { mass: number; teffK: number; radius: number }[] = [
  { mass: 0.08, teffK: 2400, radius: 0.1 },
  { mass: 0.15, teffK: 2900, radius: 0.18 },
  { mass: 0.25, teffK: 3200, radius: 0.3 },
  { mass: 0.35, teffK: 3450, radius: 0.45 },
  { mass: 0.45, teffK: 3700, radius: 0.7 }, // M / K 境界
  { mass: 0.6, teffK: 4400, radius: 0.8 },
  { mass: 0.8, teffK: 5200, radius: 0.96 }, // K / G 境界
  { mass: 1.0, teffK: SUN_TEFF_K, radius: 1.0 }, // 太陽
  { mass: 1.04, teffK: 6000, radius: 1.15 }, // G / F 境界
  { mass: 1.2, teffK: 6700, radius: 1.27 },
  { mass: 1.4, teffK: 7500, radius: 1.4 }, // F / A 境界
  { mass: 1.7, teffK: 8600, radius: 1.6 },
  { mass: 2.1, teffK: 10000, radius: 1.8 }, // A / B 境界
  { mass: 3, teffK: 12000, radius: 2.3 },
  { mass: 5, teffK: 15500, radius: 3.0 },
  { mass: 8, teffK: 20000, radius: 4.0 },
  { mass: 12, teffK: 25500, radius: 5.3 },
  { mass: 16, teffK: 30000, radius: 6.6 }, // B / O 境界
  { mass: 20, teffK: 33000, radius: 7.4 },
  { mass: 30, teffK: 37000, radius: 9.0 },
  { mass: 40, teffK: 40000, radius: 10.5 },
  { mass: 60, teffK: 44000, radius: 12.5 },
  { mass: 90, teffK: 48000, radius: 15 },
];

/**
 * 1 M☉ より重い星の主系列寿命 [年] の補間表。
 * 恒星進化モデル（Ekström et al. 2012 など）の水素燃焼期間の値を丸めたもの。
 * 大質量星では L ∝ M^3.5 程度より緩やかになり、寿命は数百万年で頭打ちになる。
 * 区分: B（近似モデル）
 *
 * 1 M☉ 以下では t ≈ 100億年 × (M/M☉) / (L/L☉) を用いる（低質量星は燃料をゆっくり使う）。
 * 0.35 M☉ 程度以下の完全対流星は水素のほぼ全部を燃やせるため、数千億〜兆年の寿命になる
 * （Laughlin, Bodenheimer & Adams 1997）。
 */
export const HIGH_MASS_LIFETIME_TABLE: readonly (readonly [number, number])[] = [
  [1.0, 1.0e10],
  [1.04, 9.0e9],
  [1.2, 5.0e9],
  [1.4, 3.0e9],
  [1.7, 1.8e9],
  [2.1, 1.0e9],
  [3, 3.5e8],
  [5, 1.0e8],
  [8, 3.5e7],
  [12, 1.7e7],
  [16, 1.1e7],
  [20, 8.5e6],
  [30, 6.0e6],
  [40, 4.7e6],
  [60, 3.7e6],
  [90, 3.2e6],
];

/** 太陽の主系列寿命 [年]（近似） */
export const SUN_MAIN_SEQUENCE_LIFETIME_YEARS = 1.0e10;

/**
 * 同じ質量でも、組成・自転・年齢の違いにより温度や半径はわずかにばらつく。
 * そのばらつきの大きさ（対数正規分布の標準偏差）。
 * 区分: C（教育用の仮定。相関を壊さない小さな値にしている）
 */
export const SCATTER = {
  teffLogSigma: 0.012,
  radiusLogSigma: 0.03,
} as const;

/**
 * 型の中での質量分布：初期質量関数 (IMF) の形を使う。
 * Kroupa (2001): dN/dM ∝ M^-α, α=1.3 (0.08–0.5 M☉), α=2.3 (>0.5 M☉)
 * 区分: A（文献）。ただし型の比率そのものは固定重み（要件2）で決める。
 */
export const IMF_SEGMENTS: readonly { maxMass: number; alpha: number }[] = [
  { maxMass: 0.5, alpha: 1.3 },
  { maxMass: Infinity, alpha: 2.3 },
];
