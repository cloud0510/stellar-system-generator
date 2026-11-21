// スペクトル型ごとの科学パラメータ。UIからはこのデータを参照するだけで、数値を直書きしない（要件27）。
import type { SpectralClass } from '../types';
import { SPECTRAL_CLASSES } from '../types';

export interface SubclassAnchor {
  label: string;
  /** その細分類の代表的な有効温度 [K] */
  teffK: number;
}

export interface SpectralTypeModel {
  cls: SpectralClass;
  /**
   * 主系列星に占める割合の近似値 [%]（固定値。要件2）
   * 合計は丸めにより厳密に100%にはならないため、抽選時に正規化する。
   */
  fixedWeightPercent: number;
  /** 表面温度の範囲 [K]（min, max）。Oの上限はモデル上の上限 */
  temperatureRangeK: readonly [number, number];
  /** 質量の範囲 [M☉] */
  massRangeSolar: readonly [number, number];
  /** 半径の範囲 [R☉] */
  radiusRangeSolar: readonly [number, number];
  /** 温度の表示・保存時の丸め単位 [K]。境界に丸め込まれないよう範囲の内側に余白をとる */
  temperatureStepK: number;
  nameJa: string;
  colorJa: string;
  /** 表示色（見た目の色の傾向を、型の違いが分かるよう彩度を強めて表したもの。実際の星はもっと白っぽく見える） */
  displayColor: string;
  description: string;
  examples: string;
  /** 細分類（0〜9など）の代表温度。Pecaut & Mamajek (2013) の表を丸め、本アプリの型の温度範囲に収まるよう境界付近を一部調整した値 */
  subclasses: readonly SubclassAnchor[];
  /** 表面の対流（粒状斑）の目立ちやすさ 0〜1。高温星は外層が放射平衡で粒状斑が弱い */
  granulation: number;
  /** 黒点の出やすさ 0〜1。低温で対流層の厚い星ほど磁気活動が強い傾向 */
  spotActivity: number;
}

export const SPECTRAL_TYPES: Record<SpectralClass, SpectralTypeModel> = {
  O: {
    cls: 'O',
    fixedWeightPercent: 0.00003,
    temperatureRangeK: [30000, 50000],
    massRangeSolar: [16, 90],
    radiusRangeSolar: [6.6, 15],
    temperatureStepK: 100,
    nameJa: 'O型主系列星',
    colorJa: '青',
    displayColor: '#8fb0ff',
    description:
      '非常に高温・大質量の青い星。強い紫外線で周囲のガスを電離し、輝く星雲をつくります。燃料を猛烈な勢いで消費するため、寿命はわずか数百万年です。',
    examples: 'オリオン大星雲のトラペジウムにある θ¹ Ori C（O7V）など',
    subclasses: [
      { label: '3', teffK: 44900 },
      { label: '4', teffK: 42900 },
      { label: '5', teffK: 41400 },
      { label: '6', teffK: 38900 },
      { label: '7', teffK: 36800 },
      { label: '8', teffK: 35100 },
      { label: '9', teffK: 33300 },
      { label: '9.5', teffK: 31900 },
    ],
    granulation: 0.05,
    spotActivity: 0,
  },
  B: {
    cls: 'B',
    fixedWeightPercent: 0.13,
    temperatureRangeK: [10000, 30000],
    massRangeSolar: [2.1, 16],
    radiusRangeSolar: [1.8, 6.6],
    temperatureStepK: 100,
    nameJa: 'B型主系列星',
    colorJa: '青白',
    displayColor: '#a8c6ff',
    description:
      '青白く輝く高温の星。太陽の数百〜数万倍の明るさを持ちます。スペクトルには中性ヘリウムの吸収線が目立ちます。',
    examples: '北斗七星の柄の先のアルカイド（η UMa, B3V）など',
    subclasses: [
      { label: '0', teffK: 29800 },
      { label: '1', teffK: 26000 },
      { label: '2', teffK: 20600 },
      { label: '3', teffK: 17000 },
      { label: '4', teffK: 16400 },
      { label: '5', teffK: 15700 },
      { label: '6', teffK: 14500 },
      { label: '7', teffK: 14000 },
      { label: '8', teffK: 12300 },
      { label: '9', teffK: 10700 },
    ],
    granulation: 0.08,
    spotActivity: 0,
  },
  A: {
    cls: 'A',
    fixedWeightPercent: 0.6,
    temperatureRangeK: [7500, 10000],
    massRangeSolar: [1.4, 2.1],
    radiusRangeSolar: [1.4, 1.8],
    temperatureStepK: 10,
    nameJa: 'A型主系列星',
    colorJa: '白',
    displayColor: '#e2ebff',
    description:
      '白く輝く星。水素の吸収線（バルマー線）が最も強く見えるタイプで、夜空の明るい星にも多く含まれます。',
    examples: 'ベガ（A0V）、シリウスA（A1V）など',
    subclasses: [
      { label: '0', teffK: 9700 },
      { label: '1', teffK: 9300 },
      { label: '2', teffK: 8800 },
      { label: '3', teffK: 8600 },
      { label: '4', teffK: 8250 },
      { label: '5', teffK: 8100 },
      { label: '6', teffK: 7910 },
      { label: '7', teffK: 7760 },
      { label: '8', teffK: 7590 },
      { label: '9', teffK: 7520 },
    ],
    granulation: 0.12,
    spotActivity: 0,
  },
  F: {
    cls: 'F',
    fixedWeightPercent: 3.0,
    temperatureRangeK: [6000, 7500],
    massRangeSolar: [1.04, 1.4],
    radiusRangeSolar: [1.15, 1.4],
    temperatureStepK: 10,
    nameJa: 'F型主系列星',
    colorJa: '黄白',
    displayColor: '#fff3cf',
    description:
      '太陽よりやや高温で、黄色がかった白色の星。太陽より少し重く明るいぶん、寿命は数十億年と太陽より短めです。',
    examples: 'プロキオンA（F5 IV–V）など',
    subclasses: [
      { label: '0', teffK: 7220 },
      { label: '1', teffK: 7020 },
      { label: '2', teffK: 6820 },
      { label: '3', teffK: 6750 },
      { label: '4', teffK: 6670 },
      { label: '5', teffK: 6550 },
      { label: '6', teffK: 6350 },
      { label: '7', teffK: 6280 },
      { label: '8', teffK: 6180 },
      { label: '9', teffK: 6050 },
    ],
    granulation: 0.35,
    spotActivity: 0.1,
  },
  G: {
    cls: 'G',
    fixedWeightPercent: 7.6,
    temperatureRangeK: [5200, 6000],
    massRangeSolar: [0.8, 1.04],
    radiusRangeSolar: [0.96, 1.15],
    temperatureStepK: 10,
    nameJa: 'G型主系列星',
    colorJa: '黄',
    displayColor: '#ffe27a',
    description:
      '太陽と同じタイプの黄色い星（黄色矮星）。主系列寿命はおよそ100億年。身近な星ですが、銀河の恒星全体の中では少数派です。',
    examples: '太陽（G2V）、ケンタウルス座α星A（G2V）など',
    subclasses: [
      { label: '0', teffK: 5930 },
      { label: '1', teffK: 5860 },
      { label: '2', teffK: 5770 },
      { label: '3', teffK: 5720 },
      { label: '4', teffK: 5680 },
      { label: '5', teffK: 5660 },
      { label: '6', teffK: 5600 },
      { label: '7', teffK: 5550 },
      { label: '8', teffK: 5480 },
      { label: '9', teffK: 5380 },
    ],
    granulation: 0.55,
    spotActivity: 0.3,
  },
  K: {
    cls: 'K',
    fixedWeightPercent: 12.1,
    temperatureRangeK: [3700, 5200],
    massRangeSolar: [0.45, 0.8],
    radiusRangeSolar: [0.7, 0.96],
    temperatureStepK: 10,
    nameJa: 'K型主系列星',
    colorJa: '橙',
    displayColor: '#ffaa55',
    description:
      '太陽より少し小さく低温の、オレンジ色の星（橙色矮星）。とても長生きで安定しているため、惑星の環境を考えるうえでも注目されています。',
    examples: 'ケンタウルス座α星B（K1V）、エリダヌス座ε星（K2V）など',
    subclasses: [
      { label: '0', teffK: 5170 },
      { label: '1', teffK: 5100 },
      { label: '2', teffK: 4980 },
      { label: '3', teffK: 4830 },
      { label: '4', teffK: 4600 },
      { label: '5', teffK: 4440 },
      { label: '6', teffK: 4300 },
      { label: '7', teffK: 4100 },
      { label: '8', teffK: 3990 },
      { label: '9', teffK: 3930 },
    ],
    granulation: 0.6,
    spotActivity: 0.55,
  },
  M: {
    cls: 'M',
    fixedWeightPercent: 76.45,
    temperatureRangeK: [2400, 3700],
    massRangeSolar: [0.08, 0.45],
    radiusRangeSolar: [0.1, 0.7],
    temperatureStepK: 10,
    nameJa: 'M型主系列星',
    colorJa: '赤',
    displayColor: '#ff7448',
    description:
      '小さく低温で暗い、赤い星（赤色矮星）。肉眼で見える星はほとんどありませんが、銀河の恒星の大多数を占めます。燃料をゆっくり使うため、寿命は宇宙の年齢よりはるかに長いと考えられています。',
    examples: 'プロキシマ・ケンタウリ（M5.5V）、バーナード星（M4V）、TRAPPIST-1（M8V）など',
    subclasses: [
      { label: '0', teffK: 3690 },
      { label: '1', teffK: 3620 },
      { label: '2', teffK: 3550 },
      { label: '3', teffK: 3430 },
      { label: '4', teffK: 3210 },
      { label: '5', teffK: 3060 },
      { label: '6', teffK: 2810 },
      { label: '7', teffK: 2680 },
      { label: '8', teffK: 2570 },
      { label: '9', teffK: 2420 },
    ],
    granulation: 0.65,
    spotActivity: 0.8,
  },
};

export const SPECTRAL_TYPE_LIST: readonly SpectralTypeModel[] = SPECTRAL_CLASSES.map((cls) => SPECTRAL_TYPES[cls]);

/** 固定重みの合計（約100%。丸め誤差により厳密な100ではない） */
export const TOTAL_FIXED_WEIGHT = SPECTRAL_TYPE_LIST.reduce((sum, t) => sum + t.fixedWeightPercent, 0);

/** 正規化済みの抽選確率 probability = fixedWeight / sum(allFixedWeights) */
export function normalizedSpectralProbabilities(): Record<SpectralClass, number> {
  const result = {} as Record<SpectralClass, number>;
  for (const t of SPECTRAL_TYPE_LIST) result[t.cls] = t.fixedWeightPercent / TOTAL_FIXED_WEIGHT;
  return result;
}
