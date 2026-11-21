// アプリ全体で共有する型定義。科学モデル(data/, models/)とUI(components/)の境界になる。

export const SPECTRAL_CLASSES = ['O', 'B', 'A', 'F', 'G', 'K', 'M'] as const;
export type SpectralClass = (typeof SPECTRAL_CLASSES)[number];

/**
 * パラメータの出自の区分（要件29）。
 * A: 観測・文献に基づくパラメータ
 * B: 天文学的知見から導いた近似モデル
 * C: 本教育アプリ独自の仮定
 */
export type Provenance = 'A' | 'B' | 'C';

export interface ElementFraction {
  symbol: string;
  nameJa: string;
  /** 質量比 (0〜1) */
  massFraction: number;
}

export interface StellarComposition {
  /** 水素の質量比 X */
  hydrogen: number;
  /** ヘリウムの質量比 Y */
  helium: number;
  /** 重元素（その他の元素）の質量比 Z */
  metals: number;
  /** 金属量 [Fe/H]（太陽=0 の対数表示） */
  metallicityFeH: number;
  /** 重元素の内訳（主なもの） */
  metalBreakdown: ElementFraction[];
}

export interface StarSpot {
  /** 星面上の位置（円盤中心を0とした -1〜1） */
  x: number;
  y: number;
  /** 半径（円盤半径に対する比） */
  size: number;
}

export interface StarAppearance {
  /** 描画用の色 (#rrggbb)。明→暗のグラデーションの中心色 */
  baseColor: string;
  /** 粒状斑のコントラスト (0〜1) */
  granulation: number;
  /** 粒状斑の細かさ（ピクセル単位のノイズ周期） */
  granuleScale: number;
  /** 周縁減光係数 */
  limbDarkening: number;
  /** 黒点 */
  spots: StarSpot[];
  /** 外周の光の広がり (0〜1) */
  glow: number;
  /** 模様の位相（同じ型でも見た目が変わるためのノイズシード） */
  noiseSeed: number;
  /**
   * アニメーションでの自転周期 [フレーム]。実際の自転（数時間〜数十日）を大きく誇張した表現。
   * モデル v1 で保存されたデータにはないため省略可能。
   */
  rotationPeriodFrames?: number;
  /** フレアの起こりやすさ (0〜1)。低温で磁気活動の強い星ほど大きい。省略時は 0 */
  flareActivity?: number;
}

export interface Star {
  spectralClass: SpectralClass;
  /** 例: "3", "9.5" */
  subclass: string;
  /** 例: "M3V" */
  spectralLabel: string;
  massSolar: number;
  temperatureK: number;
  radiusSolar: number;
  luminositySolar: number;
  /** 主系列寿命 [年] */
  mainSequenceLifetimeYears: number;
  composition: StellarComposition;
  appearance: StarAppearance;
}

export type PlanetType =
  | 'rocky'
  | 'superEarth'
  | 'ocean'
  | 'ice'
  | 'miniNeptune'
  | 'neptuneLike'
  | 'gasGiant';

/** 平衡温度による温度区分 */
export type PlanetTemperatureClass = 'scorching' | 'hot' | 'temperate' | 'cold' | 'frozen';

export type PlanetSurfaceStyle =
  | 'craters'
  | 'lava'
  | 'continents'
  | 'ocean'
  | 'ice'
  | 'bands'
  | 'haze';

export interface PlanetAppearance {
  style: PlanetSurfaceStyle;
  /** 暗→明の順の色 (#rrggbb) */
  palette: string[];
  /** 雲量 (0〜1) */
  clouds: number;
  craters: number;
  bandCount: number;
  storm: boolean;
  ring: boolean;
  polarCaps: boolean;
  /** 夜側が赤熱して光る */
  nightGlow: boolean;
  noiseSeed: number;
}

export interface Planet {
  /** 内側から 1, 2, 3 ... */
  index: number;
  orbitAU: number;
  periodDays: number;
  radiusEarth: number;
  type: PlanetType;
  /** 放射平衡温度（アルベド0, 大気効果なしの目安）[K] */
  equilibriumTempK: number;
  temperatureClass: PlanetTemperatureClass;
  inHabitableZone: boolean;
  beyondSnowLine: boolean;
  appearance: PlanetAppearance;
  description: string;
}

export interface SystemZones {
  /** ハビタブルゾーンの内縁・外縁 [AU] */
  habitableInnerAU: number;
  habitableOuterAU: number;
  /** スノーライン [AU] */
  snowLineAU: number;
}

export interface StarSystem {
  /** 恒星ID（seedから決まる） */
  id: string;
  /** 再現用seed。"abc123" または型指定生成の "abc123@O" */
  seed: string;
  /** 生成モデルのバージョン（モデル変更時に保存データと区別するため） */
  modelVersion: number;
  /** 開発者テスト用に型を直接指定した場合のみ */
  forcedClass?: SpectralClass;
  star: Star;
  zones: SystemZones;
  planets: Planet[];
}
