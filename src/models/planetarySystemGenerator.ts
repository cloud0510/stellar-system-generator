// 惑星系生成（要件12〜17）
// ① 惑星数 → ② 軌道半径 → ③ サイズ → ④ タイプ → ⑤ 見た目 の順に生成し、前段の結果を後段で使う。

import type {
  Planet,
  PlanetAppearance,
  PlanetTemperatureClass,
  PlanetType,
  Star,
  SystemZones,
} from '../types';
import {
  EQUILIBRIUM_TEMP_AT_1AU_K,
  ORBIT_MODEL,
  PLANET_COUNT_DISTRIBUTION,
  PLANET_SIZE_BINS,
  PLANET_TYPES,
  SIZE_MODIFIERS,
  TEMPERATURE_CLASSES,
  TEMPERATURE_DESCRIPTIONS,
  TYPE_ASSIGNMENT,
  ZONE_MODEL,
} from '../data/planetModel';
import { SOLAR_RADIUS_AU } from '../data/mainSequence';
import { Rng, deriveRng } from '../utils/random';
import type { WeightedItem } from '../utils/random';
import { clamp } from '../utils/interpolate';
import { jitterHex, mixHex } from '../utils/color';

const DAYS_PER_YEAR = 365.25;

// ---------------------------------------------------------------- ゾーン・物理量

export function computeZones(star: Star): SystemZones {
  const sqrtL = Math.sqrt(star.luminositySolar);
  return {
    habitableInnerAU: ZONE_MODEL.habitableInnerAU * sqrtL,
    habitableOuterAU: ZONE_MODEL.habitableOuterAU * sqrtL,
    snowLineAU: ZONE_MODEL.snowLineAU * sqrtL,
  };
}

/** ケプラーの第三法則：P[年]² = a[AU]³ / M[M☉]（惑星質量は恒星に比べ無視） */
export function orbitalPeriodDays(orbitAU: number, starMassSolar: number): number {
  return Math.sqrt((orbitAU ** 3) / starMassSolar) * DAYS_PER_YEAR;
}

export function equilibriumTemperatureK(orbitAU: number, luminositySolar: number): number {
  return (EQUILIBRIUM_TEMP_AT_1AU_K * Math.pow(luminositySolar, 0.25)) / Math.sqrt(orbitAU);
}

export function temperatureClassOf(teqK: number): PlanetTemperatureClass {
  return TEMPERATURE_CLASSES.find((c) => teqK < c.maxK)?.cls ?? 'scorching';
}

// ---------------------------------------------------------------- ① 惑星数

export function samplePlanetCount(rng: Rng): number {
  return rng.weighted(PLANET_COUNT_DISTRIBUTION.map((d) => ({ value: d.count, weight: d.probabilityPercent })));
}

// ---------------------------------------------------------------- ② 軌道半径

/** 惑星を置いてよい最も内側の軌道半径 [AU]（恒星内部・恒星直近の蒸発域を避ける） */
export function innerOrbitLimitAU(star: Star): number {
  const m = ORBIT_MODEL;
  return Math.max(
    m.absoluteMinAU,
    m.minDistanceStellarRadii * star.radiusSolar * SOLAR_RADIUS_AU,
    m.sublimationFactor * m.sublimationCoefficientAU * Math.sqrt(star.luminositySolar),
  );
}

export function outerOrbitLimitAU(star: Star, innerLimitAU: number): number {
  const m = ORBIT_MODEL;
  return Math.max(m.outerLimitCoefficientAU * Math.pow(star.massSolar, m.outerLimitMassExponent), innerLimitAU * m.outerLimitMinSpan);
}

/**
 * 内側から順に軌道半径を決める。
 * 隣どうしの公転周期比は対数正規分布で、惑星数が多いほど平均が小さい（間隔が詰まる）。
 * 下限の周期比を保証し、外側の上限を超えないよう残りの惑星分の余裕を見ながら配置する。
 */
export function generateOrbits(rng: Rng, star: Star, count: number): number[] {
  if (count === 0) return [];
  const m = ORBIT_MODEL;
  const inner = innerOrbitLimitAU(star);
  const outer = outerOrbitLimitAU(star, inner);
  const minARatio = Math.pow(m.minPeriodRatio, 2 / 3);

  const base = rng.logUniform(m.innermostBaseRangeAU[0], m.innermostBaseRangeAU[1]) * Math.pow(star.massSolar, m.innermostMassExponent);
  const first = Math.max(base, inner * rng.logUniform(1, 1.8));
  const orbits = [Math.min(first, outer / Math.pow(minARatio, count - 1))];

  const meanRatio = Math.max(m.minPeriodRatio + 0.2, m.periodRatioBase + m.periodRatioPerPlanet * count);
  for (let i = 1; i < count; i++) {
    let periodRatio = Math.max(m.minPeriodRatio, meanRatio * Math.exp(rng.normal(0, m.periodRatioLogSigma)));
    if (rng.chance(m.gapChance)) periodRatio *= rng.uniform(m.gapFactorRange[0], m.gapFactorRange[1]);
    const prev = orbits[i - 1];
    const remaining = count - 1 - i;
    const maxHere = outer / Math.pow(minARatio, remaining);
    const proposed = prev * Math.pow(periodRatio, 2 / 3);
    orbits.push(Math.max(prev * minARatio, Math.min(proposed, maxHere)));
  }
  return orbits;
}

// ---------------------------------------------------------------- ③ サイズ

export interface SizeContext {
  orbitAU: number;
  zones: SystemZones;
  star: Star;
  /** 系全体のサイズ傾向（対数）。同じ系の惑星はサイズがそろいやすい */
  systemLogScale: number;
}

export function sizeBinWeights(ctx: SizeContext): WeightedItem<(typeof PLANET_SIZE_BINS)[number]>[] {
  const s = SIZE_MODIFIERS;
  const beyondSnow = ctx.orbitAU >= ctx.zones.snowLineAU;
  const closeIn = ctx.orbitAU < s.closeInAU;
  const metallicityBoost = Math.pow(10, s.metallicityExponent * ctx.star.composition.metallicityFeH);
  const stellarMassFactor =
    ctx.star.massSolar < 0.5 ? s.lowMassStarGiantFactor : ctx.star.massSolar > 1.5 ? s.highMassStarGiantFactor : 1;

  return PLANET_SIZE_BINS.map((bin) => {
    let weight = bin.weight;
    const large = bin.id === 'neptune' || bin.id === 'giant';
    if (large && beyondSnow) weight *= s.beyondSnowLineLargeFactor;
    if (bin.id === 'giant') {
      weight *= metallicityBoost * stellarMassFactor;
      if (closeIn) weight *= s.closeInGiantFactor;
    }
    return { value: bin, weight };
  });
}

export function generatePlanetRadius(rng: Rng, ctx: SizeContext): number {
  const s = SIZE_MODIFIERS;
  const bin = rng.weighted(sizeBinWeights(ctx));
  let radius = rng.logUniform(bin.minR, bin.maxR);
  // 巨大ガス惑星は主に質量でなく圧縮で半径が決まるので、系の傾向は小〜中型惑星にだけ効かせる
  if (bin.id !== 'giant') radius *= Math.exp(ctx.systemLogScale);
  else {
    const teq = equilibriumTemperatureK(ctx.orbitAU, ctx.star.luminositySolar);
    if (teq > s.inflationTempK) radius *= rng.uniform(1, s.inflationMaxFactor);
  }
  return clamp(radius, s.minRadiusEarth, s.maxRadiusEarth);
}

// ---------------------------------------------------------------- ④ タイプ

export interface TypeContext {
  radiusEarth: number;
  equilibriumTempK: number;
  beyondSnowLine: boolean;
}

/** サイズ（主）と距離・温度（補助）から候補と重みを決める。距離による決定論的なルールにはしない */
export function planetTypeWeights(ctx: TypeContext): WeightedItem<PlanetType>[] {
  const { radiusEarth: r, equilibriumTempK: t, beyondSnowLine: far } = ctx;
  const a = TYPE_ASSIGNMENT;
  const oceanOk = t >= a.oceanTempRangeK[0] && t <= a.oceanTempRangeK[1];
  const iceOk = t <= a.iceMaxTempK;
  const items: WeightedItem<PlanetType>[] = [];
  const add = (value: PlanetType, weight: number, allowed = true) => {
    const [min, max] = PLANET_TYPES[value].radiusRangeEarth;
    if (allowed && weight > 0 && r >= min && r <= max) items.push({ value, weight });
  };

  if (r < 1.25) {
    add('rocky', far ? 0.35 : 0.85);
    add('ice', far ? 0.6 : 0.15, iceOk);
    add('ocean', far ? 0.15 : 0.15, oceanOk);
  } else if (r < 2.0) {
    add('superEarth', far ? 0.3 : 0.7);
    add('ice', far ? 0.4 : 0.1, iceOk);
    add('ocean', 0.15, oceanOk);
    add('miniNeptune', far ? 0.3 : 0.2);
  } else if (r < 4.0) {
    add('miniNeptune', 0.85);
    add('ocean', 0.15, oceanOk);
  } else if (r < 8.0) {
    add('neptuneLike', far ? 0.85 : 0.9);
    add('gasGiant', far ? 0.15 : 0.1);
  } else {
    add('gasGiant', 1);
  }

  if (items.length === 0) {
    // フォールバック：半径範囲に合うタイプのうち最初のもの
    const fallback = (Object.values(PLANET_TYPES).find((p) => r >= p.radiusRangeEarth[0] && r <= p.radiusRangeEarth[1])?.type ?? 'rocky') as PlanetType;
    items.push({ value: fallback, weight: 1 });
  }
  return items;
}

export function generatePlanetType(rng: Rng, ctx: TypeContext): PlanetType {
  return rng.weighted(planetTypeWeights(ctx));
}

// ---------------------------------------------------------------- ⑤ 見た目

const PALETTES: Record<string, string[]> = {
  rocky: ['#3a302b', '#5e4a3d', '#8a6f58', '#b59a7c', '#d8c3a5'],
  rockyRed: ['#3b1f17', '#6b3424', '#9c5232', '#c47a4f', '#e3a77a'],
  rockyGray: ['#2c2c33', '#4a4a52', '#6f6f78', '#9898a0', '#c6c6cc'],
  lava: ['#1b0f0e', '#3a1c16', '#8f2a12', '#e8601c', '#ffc04a'],
  continents: ['#1d3a5c', '#2f6a8f', '#4b7a3e', '#a3925e', '#e8e4d8'],
  ocean: ['#0b2347', '#123f7a', '#1f66b0', '#4fa3dd', '#e6f4ff'],
  ice: ['#3d5873', '#6f93b3', '#a9c8e0', '#dcecf7', '#ffffff'],
  miniNeptune: ['#21485a', '#33708a', '#58a0b5', '#8fcbd6', '#d4f0f2'],
  neptune: ['#132a6b', '#1f4aa8', '#3778d4', '#6aa6ec', '#c2e0ff'],
  jupiter: ['#4a2d1d', '#8a5a3a', '#c4925f', '#e3c497', '#f5ead6'],
  saturn: ['#5c4b2e', '#99814f', '#c9b07a', '#e6d5a6', '#f7efd6'],
  hotJupiter: ['#1a0d1f', '#4a1c32', '#8a2f3c', '#cf5b3e', '#ff9c5a'],
};

export function generatePlanetAppearance(
  rng: Rng,
  type: PlanetType,
  temperatureClass: PlanetTemperatureClass,
  radiusEarth: number,
): PlanetAppearance {
  const hot = temperatureClass === 'scorching';
  let style: PlanetAppearance['style'];
  let paletteKey: string;
  let clouds = 0;
  let craters = 0;
  let bandCount = 0;
  let storm = false;
  let ring = false;
  let polarCaps = false;
  let nightGlow = false;

  switch (type) {
    case 'rocky':
    case 'superEarth': {
      if (hot) {
        style = 'lava';
        paletteKey = 'lava';
        nightGlow = true;
      } else if (type === 'superEarth' && temperatureClass === 'temperate' && rng.chance(0.5)) {
        style = 'continents';
        paletteKey = 'continents';
        clouds = rng.uniform(0.25, 0.5);
        polarCaps = rng.chance(0.5);
      } else {
        style = 'craters';
        paletteKey = rng.weighted([
          { value: 'rocky', weight: 2 },
          { value: 'rockyRed', weight: temperatureClass === 'hot' ? 2 : 1 },
          { value: 'rockyGray', weight: 1.5 },
        ]);
        craters = rng.int(3, radiusEarth < 0.8 ? 9 : 6);
        clouds = type === 'superEarth' ? rng.uniform(0, 0.25) : 0;
        polarCaps = temperatureClass === 'cold' || temperatureClass === 'frozen';
      }
      break;
    }
    case 'ocean':
      style = 'ocean';
      paletteKey = 'ocean';
      clouds = rng.uniform(0.25, 0.55);
      polarCaps = temperatureClass !== 'hot';
      break;
    case 'ice':
      style = 'ice';
      paletteKey = 'ice';
      craters = rng.int(0, 3);
      break;
    case 'miniNeptune':
      style = 'haze';
      paletteKey = 'miniNeptune';
      bandCount = rng.int(2, 4);
      nightGlow = hot;
      break;
    case 'neptuneLike':
      style = 'bands';
      paletteKey = 'neptune';
      bandCount = rng.int(3, 6);
      storm = rng.chance(0.35);
      ring = rng.chance(0.15);
      break;
    case 'gasGiant':
    default:
      style = 'bands';
      paletteKey = hot ? 'hotJupiter' : temperatureClass === 'cold' || temperatureClass === 'frozen' ? 'saturn' : 'jupiter';
      bandCount = rng.int(5, 10);
      storm = rng.chance(0.5);
      ring = rng.chance(hot ? 0.05 : 0.3);
      nightGlow = hot;
      break;
  }

  const shift = rng.uniform(-1, 1);
  const palette = PALETTES[paletteKey].map((c) => jitterHex(c, shift * 0.6));
  // 冷たい惑星ほど白っぽく、熱い惑星ほど赤みがかるようにわずかに補正
  const tint = temperatureClass === 'frozen' ? '#dfefff' : temperatureClass === 'hot' ? '#ffb27a' : null;
  return {
    style,
    palette: tint ? palette.map((c) => mixHex(c, tint, 0.12)) : palette,
    clouds,
    craters,
    bandCount,
    storm,
    ring,
    polarCaps,
    nightGlow,
    noiseSeed: rng.int(0, 2 ** 31 - 1),
  };
}

// ---------------------------------------------------------------- 説明文

export function describePlanet(p: Omit<Planet, 'description' | 'appearance'>, starLifetimeYears: number): string {
  const typeModel = PLANET_TYPES[p.type];
  const parts = [typeModel.summary, TEMPERATURE_DESCRIPTIONS[p.temperatureClass]];
  if (p.inHabitableZone) {
    parts.push('ハビタブルゾーン（表面に液体の水が存在しうる距離の目安）の中にあります。ただし、生命がいることを意味するわけではありません。');
    if (starLifetimeYears < 1e9) parts.push('もっとも、恒星の寿命が短いため、生命が進化する時間はほとんどないと考えられます。');
  }
  if (p.periodDays < 1) parts.push('1日もかからずに恒星を一周します。');
  else if (p.periodDays < 10) parts.push(`わずか${Math.round(p.periodDays)}日ほどで恒星を一周します。`);
  return parts.join('');
}

// ---------------------------------------------------------------- まとめ

export function generatePlanetarySystem(seed: string, star: Star): { zones: SystemZones; planets: Planet[] } {
  const zones = computeZones(star);

  // ① 惑星数
  const count = samplePlanetCount(deriveRng(seed, 'planet-count'));
  // ② 軌道半径（恒星の質量・半径・光度を使う）
  const orbits = generateOrbits(deriveRng(seed, 'planet-orbits'), star, count);

  // ③ サイズ（軌道とゾーン・恒星の性質を使う）
  const sizeRng = deriveRng(seed, 'planet-sizes');
  const systemLogScale = sizeRng.normal(0, SIZE_MODIFIERS.systemSizeLogSigma);
  const radii = orbits.map((orbitAU) => generatePlanetRadius(sizeRng, { orbitAU, zones, star, systemLogScale }));

  // ④ タイプ（サイズ・温度・スノーラインを使う）
  const typeRng = deriveRng(seed, 'planet-types');
  const planets: Planet[] = orbits.map((orbitAU, i) => {
    const equilibriumTempK = equilibriumTemperatureK(orbitAU, star.luminositySolar);
    const beyondSnowLine = orbitAU >= zones.snowLineAU;
    const radiusEarth = radii[i];
    const type = generatePlanetType(typeRng, { radiusEarth, equilibriumTempK, beyondSnowLine });
    const base = {
      index: i + 1,
      orbitAU,
      periodDays: orbitalPeriodDays(orbitAU, star.massSolar),
      radiusEarth,
      type,
      equilibriumTempK,
      temperatureClass: temperatureClassOf(equilibriumTempK),
      inHabitableZone: orbitAU >= zones.habitableInnerAU && orbitAU <= zones.habitableOuterAU,
      beyondSnowLine,
    };
    // ⑤ 見た目（タイプ・温度・サイズを使う）。惑星ごとに独立した乱数列
    const appearance = generatePlanetAppearance(deriveRng(seed, `planet-look-${i + 1}`), type, base.temperatureClass, radiusEarth);
    return { ...base, appearance, description: describePlanet(base, star.mainSequenceLifetimeYears) };
  });

  return { zones, planets };
}
