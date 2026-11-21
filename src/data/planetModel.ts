// 惑星系生成モデルのパラメータ。
// 重要：惑星系については観測データが不完全なため、ここにある分布の多くは「教育用の仮定（区分C）」であり、
// 天の川銀河の実際の惑星系分布を再現したものではない（要件13・29）。

import type { PlanetTemperatureClass, PlanetType } from '../types';

/**
 * 惑星数の固定確率分布（要件13）。区分: C（教育用モデル）
 * 「系外惑星はありふれていて、平均すると恒星1個あたり1個以上」という観測的知見を踏まえた仮想分布。
 */
export const PLANET_COUNT_DISTRIBUTION: readonly { count: number; probabilityPercent: number }[] = [
  { count: 0, probabilityPercent: 10 },
  { count: 1, probabilityPercent: 20 },
  { count: 2, probabilityPercent: 25 },
  { count: 3, probabilityPercent: 20 },
  { count: 4, probabilityPercent: 12 },
  { count: 5, probabilityPercent: 7 },
  { count: 6, probabilityPercent: 4 },
  { count: 7, probabilityPercent: 1.5 },
  { count: 8, probabilityPercent: 0.5 },
];

export const MAX_PLANETS = 8;

/** 軌道配置のパラメータ */
export const ORBIT_MODEL = {
  /**
   * 最内縁惑星の軌道半径の基準範囲 [AU]（1 M☉ の場合）。恒星質量^0.5 でスケールする。
   * 系外惑星では水星より内側の惑星が多く見つかっている（ケプラー衛星の観測傾向）。区分: B/C
   */
  innermostBaseRangeAU: [0.03, 0.4] as const,
  innermostMassExponent: 0.5,
  /** 恒星表面からの最低距離（恒星半径の倍数）。惑星が恒星内部に入らないため。区分: C */
  minDistanceStellarRadii: 3,
  /** 絶対的な最小軌道半径 [AU]（TRAPPIST-1b でも約0.011 AU） */
  absoluteMinAU: 0.008,
  /**
   * ダスト昇華距離の係数：r ≈ 0.034 AU × √(L/L☉)（平衡温度 約1500 K の距離）。
   * これより内側では固体が蒸発し惑星材料になりにくい。その半分程度までは移動してきた惑星を許す。区分: B
   */
  sublimationCoefficientAU: 0.034,
  sublimationFactor: 0.5,
  /**
   * 隣り合う惑星の公転周期比。ケプラー衛星の多惑星系では 1.5〜2.5 程度が多い（Weiss et al. 2018 など）。
   * 惑星数が多いほど間隔が詰まるようにする。区分: B（観測傾向）＋C（具体的な数値）
   */
  periodRatioBase: 2.25,
  periodRatioPerPlanet: -0.07,
  periodRatioLogSigma: 0.22,
  /** 周期比の下限。これより近いと軌道が不安定になりやすい。区分: B */
  minPeriodRatio: 1.3,
  /** 間に大きな空白がある（外側に離れた惑星がある）確率と、その倍率。区分: C */
  gapChance: 0.2,
  gapFactorRange: [1.6, 4] as const,
  /** 最外縁の上限 [AU] = max(係数 × M^0.7, 最内縁 × 倍率)。区分: C */
  outerLimitCoefficientAU: 60,
  outerLimitMassExponent: 0.7,
  outerLimitMinSpan: 150,
};

/**
 * ハビタブルゾーンとスノーライン（恒星光度 L でスケール）。
 * HZ: 太陽系で 0.95〜1.67 AU 程度（Kasting et al. 1993; Kopparapu et al. 2013 を丸めた目安）
 * スノーライン: 2.7 AU × √L（Hayashi 1981）
 * 区分: B（近似モデル）
 */
export const ZONE_MODEL = {
  habitableInnerAU: 0.95,
  habitableOuterAU: 1.67,
  snowLineAU: 2.7,
};

/** 放射平衡温度：T = 278.6 K × L^(1/4) / √(a/AU)（アルベド0, 大気効果なし）。区分: B */
export const EQUILIBRIUM_TEMP_AT_1AU_K = 278.6;

/** 温度区分の境界 [K]（上限）。区分: C */
export const TEMPERATURE_CLASSES: readonly { cls: PlanetTemperatureClass; maxK: number; labelJa: string }[] = [
  { cls: 'frozen', maxK: 100, labelJa: '極寒' },
  { cls: 'cold', maxK: 200, labelJa: '寒冷' },
  { cls: 'temperate', maxK: 350, labelJa: '温暖〜温和' },
  { cls: 'hot', maxK: 1000, labelJa: '高温' },
  { cls: 'scorching', maxK: Infinity, labelJa: '灼熱' },
];

/**
 * 惑星サイズの基本分布（サイズ帯ごとの重み）[R⊕]。
 * 「小さな惑星ほど多い」「1.5〜4 R⊕ のスーパーアース〜ミニネプチューンが最も多く見つかっている」
 * 「木星型は少数派」という観測的傾向（Fressin et al. 2013; Fulton et al. 2017 など）を参考にした教育用の重み。
 * 区分: B（傾向）＋C（具体的な数値）
 */
export const PLANET_SIZE_BINS: readonly { id: string; minR: number; maxR: number; weight: number }[] = [
  { id: 'small', minR: 0.3, maxR: 0.8, weight: 0.13 },
  { id: 'earth', minR: 0.8, maxR: 1.25, weight: 0.19 },
  { id: 'superEarth', minR: 1.25, maxR: 2.0, weight: 0.27 },
  { id: 'subNeptune', minR: 2.0, maxR: 4.0, weight: 0.27 },
  { id: 'neptune', minR: 4.0, maxR: 8.0, weight: 0.07 },
  { id: 'giant', minR: 8.0, maxR: 14.0, weight: 0.07 },
];

/** サイズ分布を軌道・恒星の性質で補正する倍率。区分: B（傾向）＋C（数値） */
export const SIZE_MODIFIERS = {
  /** スノーラインより外では巨大惑星ができやすい（コア集積モデル） */
  beyondSnowLineLargeFactor: 3,
  /** 0.1 AU 以内の巨大惑星（ホットジュピター）は珍しい（太陽型星の約1%） */
  closeInGiantFactor: 0.35,
  closeInAU: 0.1,
  /** 低質量星（M型）では巨大惑星が少ない、高質量星では多い（Johnson et al. 2010） */
  lowMassStarGiantFactor: 0.3,
  highMassStarGiantFactor: 1.5,
  /** 金属量が高いほど巨大惑星が多い：確率 ∝ 10^(2[Fe/H])（Fischer & Valenti 2005） */
  metallicityExponent: 2,
  /** 同じ惑星系の惑星はサイズがそろいやすい（"peas in a pod", Weiss et al. 2018）: 系全体の対数スケール */
  systemSizeLogSigma: 0.2,
  /** 強く照らされた巨大ガス惑星は膨張していることがある */
  inflationTempK: 1200,
  inflationMaxFactor: 1.35,
  minRadiusEarth: 0.3,
  maxRadiusEarth: 20,
};

export interface PlanetTypeModel {
  type: PlanetType;
  nameJa: string;
  /** このタイプに割り当てうる半径範囲 [R⊕]（サイズとタイプの整合性。要件16） */
  radiusRangeEarth: readonly [number, number];
  summary: string;
  provenance: string;
}

export const PLANET_TYPES: Record<PlanetType, PlanetTypeModel> = {
  rocky: {
    type: 'rocky',
    nameJa: '岩石惑星',
    radiusRangeEarth: [0.3, 1.25],
    summary: '岩石と金属でできた、地球や火星のような惑星。',
    provenance: '太陽系の地球型惑星と、密度が測定された小型系外惑星の観測にもとづく分類。',
  },
  superEarth: {
    type: 'superEarth',
    nameJa: 'スーパーアース型',
    radiusRangeEarth: [1.25, 2.0],
    summary: '地球より大きいが海王星よりずっと小さい惑星。太陽系には存在しないタイプで、系外惑星では非常に多く見つかっている。',
    provenance: 'ケプラー衛星などの観測で最も多く見つかっているサイズ帯。',
  },
  ocean: {
    type: 'ocean',
    nameJa: '海洋惑星（仮説）',
    radiusRangeEarth: [0.8, 2.5],
    summary: '大量の水に覆われていると考えられる惑星。存在は理論的に予想されているが、確実に確認された例はまだない。',
    provenance: '理論的に予想されるタイプ。生成は教育用の仮定。',
  },
  ice: {
    type: 'ice',
    nameJa: '氷惑星',
    radiusRangeEarth: [0.3, 2.0],
    summary: '表面が氷に覆われた冷たい小型惑星。木星の衛星エウロパのような氷の地殻をイメージしたもの。',
    provenance: 'スノーラインより外側の固体惑星の想像図。',
  },
  miniNeptune: {
    type: 'miniNeptune',
    nameJa: 'ミニネプチューン型',
    radiusRangeEarth: [1.7, 4.0],
    summary: '岩石の核のまわりを水素・ヘリウムの厚い大気が包む惑星。系外惑星でとても多く見つかっている。',
    provenance: '半径約1.8 R⊕付近の「半径の谷」（Fulton et al. 2017）より大きい側の惑星。',
  },
  neptuneLike: {
    type: 'neptuneLike',
    nameJa: '海王星型',
    radiusRangeEarth: [4.0, 8.0],
    summary: '海王星や天王星のような、氷成分と厚い大気をもつ中型の惑星（巨大氷惑星）。',
    provenance: '太陽系の天王星・海王星と、同サイズの系外惑星の観測にもとづく分類。',
  },
  gasGiant: {
    type: 'gasGiant',
    nameJa: 'ガス惑星（木星型）',
    radiusRangeEarth: [6.0, 20],
    summary: '主に水素とヘリウムからなる巨大な惑星。帯状の雲の模様や巨大な嵐をもつ。',
    provenance: '太陽系の木星・土星と、多数の系外巨大惑星の観測にもとづく分類。',
  },
};

/** 温度区分ごとの説明文 */
export const TEMPERATURE_DESCRIPTIONS: Record<PlanetTemperatureClass, string> = {
  scorching: '恒星のすぐ近くを回り、表面は1000 Kを超える灼熱の世界と考えられます。',
  hot: '金星や水星のように強く照らされた、高温の惑星です。',
  temperate: '受け取る光の量は地球に比較的近い範囲です。',
  cold: '恒星から遠く、受け取る光は弱め。寒冷な惑星です。',
  frozen: '恒星から非常に遠い、極寒の惑星です。',
};

/** 惑星タイプの抽選規則（サイズ → 候補と重み、距離で補正）。区分: C（教育用の仮定） */
export const TYPE_ASSIGNMENT = {
  /** 海洋惑星になりうる平衡温度 [K] */
  oceanTempRangeK: [150, 450] as const,
  /** 氷惑星になりうる平衡温度の上限 [K] */
  iceMaxTempK: 200,
};
