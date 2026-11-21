import { describe, expect, it } from 'vitest';
import { SPECTRAL_CLASSES } from '../types';
import type { StarSystem } from '../types';
import { ORBIT_MODEL, PLANET_COUNT_DISTRIBUTION, PLANET_TYPES, SIZE_MODIFIERS } from '../data/planetModel';
import { SOLAR_RADIUS_AU } from '../data/mainSequence';
import { generatePlanetType, orbitalPeriodDays, planetTypeWeights, samplePlanetCount } from './planetarySystemGenerator';
import { generateStarSystem, makeForcedSeed } from './systemGenerator';
import { Rng } from '../utils/random';
import { renderPlanetPixels } from '../render/planetSprite';
import { renderStarPixels } from '../render/starSprite';

const systems: StarSystem[] = [
  ...Array.from({ length: 1500 }, (_, i) => generateStarSystem(`sys-${i}`)),
  ...SPECTRAL_CLASSES.flatMap((c) => Array.from({ length: 80 }, (_, i) => generateStarSystem(makeForcedSeed(c, `p${i}`)))),
];
const planets = systems.flatMap((s) => s.planets.map((p) => ({ p, s })));

describe('惑星数', () => {
  it('固定分布の合計は100%', () => {
    expect(PLANET_COUNT_DISTRIBUTION.reduce((s, d) => s + d.probabilityPercent, 0)).toBeCloseTo(100, 10);
  });

  it('0〜8個の範囲で、分布に従って生成される', () => {
    const rng = new Rng('count');
    const n = 50000;
    const counts = new Array(9).fill(0);
    for (let i = 0; i < n; i++) {
      const k = samplePlanetCount(rng);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThanOrEqual(8);
      counts[k]++;
    }
    for (const d of PLANET_COUNT_DISTRIBUTION) {
      const p = d.probabilityPercent / 100;
      expect(Math.abs(counts[d.count] - p * n)).toBeLessThanOrEqual(5 * Math.sqrt(n * p * (1 - p)) + 2);
    }
    const mean = counts.reduce((s, c, k) => s + c * k, 0) / n;
    expect(mean).toBeGreaterThan(1); // 平均は1を超える
  });

  it('生成された恒星系の惑星数は planets 配列の長さと一致し、番号は1から順', () => {
    for (const s of systems) {
      expect(s.planets.length).toBeLessThanOrEqual(8);
      s.planets.forEach((p, i) => expect(p.index).toBe(i + 1));
    }
  });
});

describe('惑星軌道', () => {
  it('内側から外側へ順に並び、十分に離れている', () => {
    const minPeriodRatio = ORBIT_MODEL.minPeriodRatio;
    for (const s of systems) {
      for (let i = 1; i < s.planets.length; i++) {
        const inner = s.planets[i - 1];
        const outer = s.planets[i];
        expect(outer.orbitAU).toBeGreaterThan(inner.orbitAU);
        expect(outer.periodDays / inner.periodDays).toBeGreaterThanOrEqual(minPeriodRatio - 1e-9);
      }
    }
  });

  it('惑星が恒星の内部や表面直近に入らない', () => {
    for (const { p, s } of planets) {
      expect(p.orbitAU).toBeGreaterThan(s.star.radiusSolar * SOLAR_RADIUS_AU * ORBIT_MODEL.minDistanceStellarRadii * 0.999);
      expect(p.orbitAU).toBeGreaterThanOrEqual(ORBIT_MODEL.absoluteMinAU);
      expect(p.orbitAU).toBeLessThan(5000);
    }
  });

  it('公転周期はケプラーの第三法則 P² = a³/M に従う', () => {
    for (const { p, s } of planets) {
      const years = p.periodDays / 365.25;
      expect((years ** 2 * s.star.massSolar) / p.orbitAU ** 3).toBeCloseTo(1, 8);
    }
    expect(orbitalPeriodDays(1, 1)).toBeCloseTo(365.25, 6); // 地球
  });

  it('惑星数が多いほど隣り合う軌道の間隔（周期比）の中央値が小さい', () => {
    const ratiosFor = (n: number) =>
      systems
        .filter((s) => s.planets.length === n)
        .flatMap((s) => s.planets.slice(1).map((p, i) => p.periodDays / s.planets[i].periodDays))
        .sort((a, b) => a - b);
    const median = (v: number[]) => v[Math.floor(v.length / 2)];
    expect(median(ratiosFor(2))).toBeGreaterThan(median(ratiosFor(5)));
  });
});

describe('惑星サイズとタイプ', () => {
  it('サイズは設定範囲内で、小型惑星が大型惑星より多い', () => {
    const radii = planets.map(({ p }) => p.radiusEarth);
    for (const r of radii) {
      expect(r).toBeGreaterThanOrEqual(SIZE_MODIFIERS.minRadiusEarth);
      expect(r).toBeLessThanOrEqual(SIZE_MODIFIERS.maxRadiusEarth);
    }
    const small = radii.filter((r) => r < 4).length;
    const large = radii.filter((r) => r >= 4).length;
    expect(small).toBeGreaterThan(large * 3);
  });

  it('惑星タイプとサイズが整合する', () => {
    for (const { p } of planets) {
      const [min, max] = PLANET_TYPES[p.type].radiusRangeEarth;
      expect(p.radiusEarth).toBeGreaterThanOrEqual(min);
      expect(p.radiusEarth).toBeLessThanOrEqual(max);
    }
    expect(planets.some(({ p }) => p.type === 'gasGiant')).toBe(true);
    expect(planets.some(({ p }) => p.type === 'rocky')).toBe(true);
    expect(planets.some(({ p }) => p.type === 'superEarth')).toBe(true);
    expect(planets.some(({ p }) => p.type === 'neptuneLike')).toBe(true);
  });

  it('距離（スノーライン）は補助パラメータで、決定論的なルールではない', () => {
    // 同じサイズ・同じ遠方でも複数のタイプがありうる
    const far = planetTypeWeights({ radiusEarth: 1.0, equilibriumTempK: 120, beyondSnowLine: true });
    expect(far.length).toBeGreaterThan(1);
    expect(far.map((w) => w.value)).toContain('rocky');
    const near = planetTypeWeights({ radiusEarth: 6.5, equilibriumTempK: 900, beyondSnowLine: false });
    expect(near.map((w) => w.value)).toContain('gasGiant');
    // 大型は常にガス惑星
    const rng = new Rng('t');
    for (let i = 0; i < 50; i++) expect(generatePlanetType(rng, { radiusEarth: 11, equilibriumTempK: 300, beyondSnowLine: false })).toBe('gasGiant');
  });

  it('スノーラインの外側では巨大惑星の割合が高い', () => {
    const giants = (list: typeof planets) => list.filter(({ p }) => p.radiusEarth >= 6).length / Math.max(1, list.length);
    const beyond = planets.filter(({ p }) => p.beyondSnowLine);
    const inside = planets.filter(({ p }) => !p.beyondSnowLine);
    expect(giants(beyond)).toBeGreaterThan(giants(inside));
  });

  it('タイプ・温度に応じた見た目が生成され、ドット絵が描ける', () => {
    for (const { p } of planets.slice(0, 200)) {
      expect(p.appearance.palette.length).toBeGreaterThanOrEqual(5);
      if (p.type === 'gasGiant' || p.type === 'neptuneLike') expect(p.appearance.style).toBe('bands');
      if (p.type === 'ocean') expect(p.appearance.style).toBe('ocean');
      if (p.type === 'ice') expect(p.appearance.style).toBe('ice');
      const px = renderPlanetPixels(p.appearance, 32);
      expect(px.length).toBe(32 * 32 * 4);
      expect(px.some((v, i) => i % 4 === 3 && v === 255)).toBe(true);
    }
  });
});

describe('seedによる再現性', () => {
  it('同じseedからは恒星・惑星・外観まで完全に同じ恒星系が再生成される', () => {
    for (const seed of ['abc', 'k3j9xz2a', 'zzzz9999', 'q1@M', 'q1@O']) {
      const a = generateStarSystem(seed);
      const b = generateStarSystem(seed);
      expect(b).toEqual(a);
      expect(JSON.parse(JSON.stringify(a))).toEqual(a); // 保存・復元しても欠けない
      expect(renderStarPixels(b.star.appearance)).toEqual(renderStarPixels(a.star.appearance));
      a.planets.forEach((p, i) => expect(renderPlanetPixels(b.planets[i].appearance)).toEqual(renderPlanetPixels(p.appearance)));
    }
  });

  it('異なるseedでは異なる恒星系になる', () => {
    const a = generateStarSystem('seed-a');
    const b = generateStarSystem('seed-b');
    expect(a.star.massSolar).not.toBe(b.star.massSolar);
  });

  it('同じ型でも恒星ごとに表面模様が変わる', () => {
    const a = generateStarSystem('look-1@M').star.appearance;
    const b = generateStarSystem('look-2@M').star.appearance;
    expect(renderStarPixels(a)).not.toEqual(renderStarPixels(b));
  });
});
