// 恒星生成アルゴリズム（要件4）
// Step 1: 固定確率分布からスペクトル型を抽選
// Step 2: 型の質量範囲内で質量を決め、質量から温度・半径・光度・寿命を相関させて決める

import type { SpectralClass, Star, StarAppearance, StellarComposition } from '../types';
import { SPECTRAL_TYPE_LIST, SPECTRAL_TYPES, normalizedSpectralProbabilities } from '../data/stellarTypes';
import type { SpectralTypeModel } from '../data/stellarTypes';
import {
  HIGH_MASS_LIFETIME_TABLE,
  IMF_SEGMENTS,
  MASS_TEFF_RADIUS_TABLE,
  SCATTER,
  SUN_MAIN_SEQUENCE_LIFETIME_YEARS,
  SUN_TEFF_K,
} from '../data/mainSequence';
import {
  HELIUM_ENRICHMENT_RATIO,
  METALLICITY_DISTRIBUTION,
  PRIMORDIAL_COMPOSITION,
  SOLAR_METAL_BREAKDOWN,
  SOLAR_SURFACE_COMPOSITION,
} from '../data/composition';
import { Rng, deriveRng } from '../utils/random';
import { clamp, logLogInterpolate, roundTo } from '../utils/interpolate';
import { hexToRgb, kelvinToRgb, mixRgb, rgbToHex } from '../utils/color';

const TEFF_POINTS = MASS_TEFF_RADIUS_TABLE.map((p) => [p.mass, p.teffK] as const);
const RADIUS_POINTS = MASS_TEFF_RADIUS_TABLE.map((p) => [p.mass, p.radius] as const);

/** Step 1: 固定重みを正規化した確率でスペクトル型を抽選する */
export function pickSpectralClass(rng: Rng): SpectralClass {
  const probabilities = normalizedSpectralProbabilities();
  return rng.weighted(SPECTRAL_TYPE_LIST.map((t) => ({ value: t.cls, weight: probabilities[t.cls] })));
}

/** IMF（初期質量関数）の dN/dlogM（Kroupa 2001 の折れ線べき乗。折れ目で連続になるよう係数をつなぐ） */
export function imfPerLogMass(mass: number): number {
  let k = 1;
  let prev: { maxMass: number; alpha: number } | null = null;
  for (const seg of IMF_SEGMENTS) {
    if (prev) k *= Math.pow(prev.maxMass, seg.alpha - prev.alpha);
    if (mass <= seg.maxMass) return k * Math.pow(mass, 1 - seg.alpha);
    prev = seg;
  }
  return 0;
}

/** 型の質量範囲内で、IMFの形に従って質量を抽選する（軽い星ほど多い） */
export function sampleMass(rng: Rng, [min, max]: readonly [number, number]): number {
  const peak = imfPerLogMass(min); // dN/dlogM は質量とともに単調減少
  for (let i = 0; i < 1000; i++) {
    const m = rng.logUniform(min, max);
    if (rng.next() * peak <= imfPerLogMass(m)) return m;
  }
  return min;
}

/** 質量だけから決まる（ばらつきなしの）主系列の標準値 */
export function mainSequenceReference(mass: number) {
  const teffK = logLogInterpolate(TEFF_POINTS, mass);
  const radiusSolar = logLogInterpolate(RADIUS_POINTS, mass);
  return { teffK, radiusSolar, luminositySolar: luminosityFrom(radiusSolar, teffK) };
}

/** シュテファン＝ボルツマンの法則：L/L☉ = (R/R☉)² (T/T☉)⁴ */
export function luminosityFrom(radiusSolar: number, teffK: number): number {
  return radiusSolar * radiusSolar * Math.pow(teffK / SUN_TEFF_K, 4);
}

/** 主系列寿命 [年]。質量に対して強い非線形（重い星ほど急激に短い） */
export function mainSequenceLifetimeYears(mass: number): number {
  if (mass <= 1) {
    return (SUN_MAIN_SEQUENCE_LIFETIME_YEARS * mass) / mainSequenceReference(mass).luminositySolar;
  }
  return logLogInterpolate(HIGH_MASS_LIFETIME_TABLE, mass);
}

/** 温度に最も近い細分類を選ぶ（例 M3） */
export function subclassFor(model: SpectralTypeModel, teffK: number): string {
  let best = model.subclasses[0];
  for (const s of model.subclasses) {
    if (Math.abs(Math.log(s.teffK / teffK)) < Math.abs(Math.log(best.teffK / teffK))) best = s;
  }
  return best.label;
}

/** 型の範囲から一歩内側に入れた温度範囲（丸めても隣の型の境界値にならないようにする） */
export function allowedTemperatureRange(model: SpectralTypeModel): [number, number] {
  const [min, max] = model.temperatureRangeK;
  return [min + model.temperatureStepK, max - model.temperatureStepK];
}

export function generateComposition(rng: Rng): StellarComposition {
  const d = METALLICITY_DISTRIBUTION;
  const feH = rng.truncatedNormal(d.meanDex, d.sigmaDex, d.minDex, d.maxDex);
  const scale = Math.pow(10, feH);
  const metals = SOLAR_SURFACE_COMPOSITION.metals * scale;
  // ヘリウムは宇宙初期（ビッグバン元素合成）の値より少なくはならない
  const helium = Math.max(
    PRIMORDIAL_COMPOSITION.helium,
    SOLAR_SURFACE_COMPOSITION.helium + HELIUM_ENRICHMENT_RATIO * (metals - SOLAR_SURFACE_COMPOSITION.metals),
  );
  const hydrogen = 1 - helium - metals;
  return {
    hydrogen,
    helium,
    metals,
    metallicityFeH: feH,
    metalBreakdown: SOLAR_METAL_BREAKDOWN.map((e) => ({ ...e, massFraction: e.massFraction * scale })),
  };
}

/** 見た目の色：黒体近似色と、型の慣習的な表示色を混ぜる（ドット絵として型の違いが分かりやすいように） */
export function starDisplayColor(model: SpectralTypeModel, teffK: number): string {
  const blackbody = kelvinToRgb(teffK);
  return rgbToHex(mixRgb(blackbody, hexToRgb(model.displayColor), 0.6));
}

export function generateStarAppearance(rng: Rng, model: SpectralTypeModel, teffK: number): StarAppearance {
  const maxSpots = Math.round(model.spotActivity * 7);
  const spotCount = maxSpots === 0 ? 0 : rng.int(Math.round(maxSpots * 0.3), maxSpots);
  const spots = Array.from({ length: spotCount }, () => {
    const lat = rng.uniform(-0.55, 0.55);
    const lon = rng.uniform(-0.8, 0.8) * Math.sqrt(1 - lat * lat);
    return { x: lon, y: lat, size: rng.uniform(0.04, 0.07 + 0.12 * model.spotActivity) };
  });
  const hotness = clamp(Math.log10(teffK / 2400) / Math.log10(48000 / 2400), 0, 1);
  return {
    baseColor: starDisplayColor(model, teffK),
    granulation: clamp(model.granulation * rng.uniform(0.75, 1.25), 0, 1),
    granuleScale: rng.uniform(2.2, 4.2),
    limbDarkening: clamp(0.7 - 0.35 * hotness + rng.uniform(-0.05, 0.05), 0.2, 0.85),
    spots,
    glow: clamp(0.25 + 0.6 * hotness + rng.uniform(-0.05, 0.05), 0, 1),
    noiseSeed: rng.int(0, 2 ** 31 - 1),
    // 以下はアニメーション用（既存の値の乱数列を変えないよう末尾で抽選する）
    // 高温星ほど速く自転する傾向（A・B型は赤道で 100 km/s を超えることが多い）を、誇張した速さで表現
    rotationPeriodFrames: Math.round((280 - 160 * hotness) * rng.uniform(0.8, 1.25)),
    // フレアは磁気活動の強い低温星（特にM型の赤色矮星）で頻繁に起こる
    flareActivity: model.spotActivity === 0 ? 0 : clamp(model.spotActivity * rng.uniform(0.6, 1.2), 0, 1),
  };
}

/** 恒星を1つ生成する。forcedClass を指定するとStep 1を飛ばしてその型で生成する（開発者テスト用） */
export function generateStar(seed: string, forcedClass?: SpectralClass): Star {
  const rng = deriveRng(seed, 'star');
  const cls = forcedClass ?? pickSpectralClass(rng);
  const model = SPECTRAL_TYPES[cls];

  const mass = sampleMass(rng, model.massRangeSolar);
  const ref = mainSequenceReference(mass);

  const [tMin, tMax] = allowedTemperatureRange(model);
  const temperatureK = roundTo(
    clamp(ref.teffK * Math.exp(rng.normal(0, SCATTER.teffLogSigma)), tMin, tMax),
    model.temperatureStepK,
  );
  const [rMin, rMax] = model.radiusRangeSolar;
  const radiusSolar = clamp(ref.radiusSolar * Math.exp(rng.normal(0, SCATTER.radiusLogSigma)), rMin, rMax);
  const subclass = subclassFor(model, temperatureK);

  return {
    spectralClass: cls,
    subclass,
    spectralLabel: `${cls}${subclass}V`,
    massSolar: mass,
    temperatureK,
    radiusSolar,
    luminositySolar: luminosityFrom(radiusSolar, temperatureK),
    mainSequenceLifetimeYears: mainSequenceLifetimeYears(mass),
    composition: generateComposition(deriveRng(seed, 'composition')),
    appearance: generateStarAppearance(deriveRng(seed, 'star-appearance'), model, temperatureK),
  };
}
