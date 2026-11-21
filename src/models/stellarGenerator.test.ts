import { describe, expect, it } from 'vitest';
import { SPECTRAL_CLASSES } from '../types';
import type { SpectralClass, Star } from '../types';
import { SPECTRAL_TYPES, TOTAL_FIXED_WEIGHT, normalizedSpectralProbabilities } from '../data/stellarTypes';
import { UNIVERSE_AGE_YEARS } from '../data/mainSequence';
import {
  generateStar,
  luminosityFrom,
  mainSequenceLifetimeYears,
  mainSequenceReference,
  pickSpectralClass,
} from './stellarGenerator';
import { generateStarSystem, makeForcedSeed, sampleSpectralClasses } from './systemGenerator';
import { Rng } from '../utils/random';

function forcedStars(cls: SpectralClass, n: number): Star[] {
  return Array.from({ length: n }, (_, i) => generateStar(`test-${cls}-${i}`, cls));
}

/** スピアマンの順位相関係数 */
function spearman(xs: number[], ys: number[]): number {
  const rank = (v: number[]) => {
    const order = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
    const r = new Array<number>(v.length);
    order.forEach(([, i], k) => (r[i] = k));
    return r;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const n = xs.length;
  const d2 = rx.reduce((s, r, i) => s + (r - ry[i]) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}

describe('固定確率分布', () => {
  it('固定重みがコードに明示され、正規化すると合計1になる', () => {
    expect(SPECTRAL_TYPES.O.fixedWeightPercent).toBe(0.00003);
    expect(SPECTRAL_TYPES.B.fixedWeightPercent).toBe(0.13);
    expect(SPECTRAL_TYPES.A.fixedWeightPercent).toBe(0.6);
    expect(SPECTRAL_TYPES.F.fixedWeightPercent).toBe(3.0);
    expect(SPECTRAL_TYPES.G.fixedWeightPercent).toBe(7.6);
    expect(SPECTRAL_TYPES.K.fixedWeightPercent).toBe(12.1);
    expect(SPECTRAL_TYPES.M.fixedWeightPercent).toBe(76.45);
    expect(TOTAL_FIXED_WEIGHT).not.toBe(100); // 丸め誤差で厳密に100にならない
    const p = normalizedSpectralProbabilities();
    const sum = SPECTRAL_CLASSES.reduce((s, c) => s + p[c], 0);
    expect(sum).toBeCloseTo(1, 12);
    expect(p.M).toBeCloseTo(76.45 / TOTAL_FIXED_WEIGHT, 12);
  });

  it('10000回以上の恒星生成でスペクトル型の比率が設定値に近づく', () => {
    const n = 20000;
    const counts = Object.fromEntries(SPECTRAL_CLASSES.map((c) => [c, 0])) as Record<SpectralClass, number>;
    for (let i = 0; i < n; i++) counts[generateStar(`ratio-${i}`).spectralClass]++;
    const p = normalizedSpectralProbabilities();
    for (const c of SPECTRAL_CLASSES) {
      const expected = p[c] * n;
      const sigma = Math.sqrt(n * p[c] * (1 - p[c]));
      // 二項分布の5σ以内（＋小さい期待値のための余裕）
      expect(Math.abs(counts[c] - expected)).toBeLessThanOrEqual(5 * sigma + 2);
    }
    expect(counts.M).toBeGreaterThan(counts.K);
    expect(counts.K).toBeGreaterThan(counts.G);
    expect(counts.G).toBeGreaterThan(counts.F);
    expect(counts.O).toBeLessThanOrEqual(2);
  });

  it('大量抽選（100万回）でも割合が設定値に一致する', () => {
    const n = 1_000_000;
    const counts = sampleSpectralClasses(n, 'big-survey');
    const p = normalizedSpectralProbabilities();
    for (const c of SPECTRAL_CLASSES) {
      const sigma = Math.sqrt(n * p[c] * (1 - p[c]));
      expect(Math.abs(counts[c] - p[c] * n)).toBeLessThanOrEqual(5 * sigma + 2);
    }
  });

  it('pickSpectralClass は乱数列に対して決定的', () => {
    const a = new Rng('x');
    const b = new Rng('x');
    for (let i = 0; i < 100; i++) expect(pickSpectralClass(a)).toBe(pickSpectralClass(b));
  });
});

describe('スペクトル型を直接指定した生成', () => {
  it.each(SPECTRAL_CLASSES)('%s型を直接指定して生成できる', (cls) => {
    const system = generateStarSystem(makeForcedSeed(cls, 'abc'));
    expect(system.star.spectralClass).toBe(cls);
    expect(system.forcedClass).toBe(cls);
    expect(system.seed).toBe(`abc@${cls}`);
    expect(system.star.spectralLabel).toMatch(new RegExp(`^${cls}\\d(\\.5)?V$`));
  });
});

describe('各スペクトル型の物理量の範囲', () => {
  const lifetimeBounds: Record<SpectralClass, [number, number]> = {
    O: [2e6, 1.2e7], // 数百万年
    B: [1e7, 1.1e9], // 数千万〜数億年
    A: [9e8, 3.1e9], // 数億〜十数億年（〜30億年）
    F: [2.9e9, 9.5e9], // 数十億年
    G: [8e9, 1.4e10], // 約100億年前後
    K: [1.2e10, 6e10], // 数百億年程度まで
    M: [5e10, 5e12], // 数百億〜1000億年以上
  };

  it.each(SPECTRAL_CLASSES)('%s型の質量・温度・半径・寿命が妥当な範囲に収まる', (cls) => {
    const model = SPECTRAL_TYPES[cls];
    for (const s of forcedStars(cls, 400)) {
      expect(s.massSolar).toBeGreaterThanOrEqual(model.massRangeSolar[0]);
      expect(s.massSolar).toBeLessThanOrEqual(model.massRangeSolar[1]);
      // 境界値そのものにはならない（隣の型の範囲に入り込まない）
      expect(s.temperatureK).toBeGreaterThan(model.temperatureRangeK[0]);
      expect(s.temperatureK).toBeLessThan(model.temperatureRangeK[1]);
      expect(s.radiusSolar).toBeGreaterThanOrEqual(model.radiusRangeSolar[0]);
      expect(s.radiusSolar).toBeLessThanOrEqual(model.radiusRangeSolar[1]);
      expect(s.mainSequenceLifetimeYears).toBeGreaterThanOrEqual(lifetimeBounds[cls][0]);
      expect(s.mainSequenceLifetimeYears).toBeLessThanOrEqual(lifetimeBounds[cls][1]);
      expect(s.luminositySolar).toBeCloseTo(luminosityFrom(s.radiusSolar, s.temperatureK), 10);
      expect(model.subclasses.map((x) => x.label)).toContain(s.subclass);
    }
  });

  it('O型の温度は30,000 K以上', () => {
    for (const s of forcedStars('O', 200)) expect(s.temperatureK).toBeGreaterThanOrEqual(30000);
  });

  it('M型の中には宇宙年齢より長い寿命の星が含まれ、1000億年を超えるものもある', () => {
    const stars = forcedStars('M', 300);
    expect(stars.every((s) => s.mainSequenceLifetimeYears > UNIVERSE_AGE_YEARS)).toBe(true);
    expect(stars.some((s) => s.mainSequenceLifetimeYears > 1e11)).toBe(true);
  });

  it('型の中では軽い星ほど多い（IMFの形）', () => {
    const stars = forcedStars('M', 2000);
    const mid = (0.08 + 0.45) / 2;
    const light = stars.filter((s) => s.massSolar < mid).length;
    expect(light).toBeGreaterThan(stars.length / 2);
  });

  it('太陽質量の基準値は太陽の値を再現する', () => {
    const ref = mainSequenceReference(1);
    expect(ref.teffK).toBeCloseTo(5772, 6);
    expect(ref.radiusSolar).toBeCloseTo(1, 6);
    expect(ref.luminositySolar).toBeCloseTo(1, 6);
    expect(mainSequenceLifetimeYears(1)).toBeCloseTo(1e10, -6);
  });
});

describe('質量・温度・半径・寿命の相関', () => {
  const all = SPECTRAL_CLASSES.flatMap((c) => forcedStars(c, 150));
  const mass = all.map((s) => s.massSolar);

  it('質量が大きいほど高温・大きい・明るい・短寿命', () => {
    expect(spearman(mass, all.map((s) => s.temperatureK))).toBeGreaterThan(0.97);
    expect(spearman(mass, all.map((s) => s.radiusSolar))).toBeGreaterThan(0.97);
    expect(spearman(mass, all.map((s) => s.luminositySolar))).toBeGreaterThan(0.98);
    expect(spearman(mass, all.map((s) => s.mainSequenceLifetimeYears))).toBeLessThan(-0.999);
  });

  it('基準関係（ばらつきなし）は質量に対して単調で、寿命は非線形に減少する', () => {
    let prev = mainSequenceReference(0.08);
    let prevLife = mainSequenceLifetimeYears(0.08);
    for (let m = 0.09; m <= 90; m *= 1.03) {
      const ref = mainSequenceReference(m);
      const life = mainSequenceLifetimeYears(m);
      expect(ref.teffK).toBeGreaterThan(prev.teffK);
      expect(ref.radiusSolar).toBeGreaterThan(prev.radiusSolar);
      expect(ref.luminositySolar).toBeGreaterThan(prev.luminositySolar);
      expect(life).toBeLessThan(prevLife);
      prev = ref;
      prevLife = life;
    }
    // 線形ではない：質量が10倍で寿命は10分の1よりずっと短くなる
    expect(mainSequenceLifetimeYears(10) / mainSequenceLifetimeYears(1)).toBeLessThan(0.01);
  });

  it('型の順序（O→M）で温度の中央値が下がり、寿命の中央値が延びる', () => {
    const median = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
    const temps = SPECTRAL_CLASSES.map((c) => median(forcedStars(c, 100).map((s) => s.temperatureK)));
    const lives = SPECTRAL_CLASSES.map((c) => median(forcedStars(c, 100).map((s) => s.mainSequenceLifetimeYears)));
    for (let i = 1; i < temps.length; i++) {
      expect(temps[i]).toBeLessThan(temps[i - 1]);
      expect(lives[i]).toBeGreaterThan(lives[i - 1]);
    }
  });
});

describe('構成元素', () => {
  it('水素・ヘリウム・その他の合計が1で、太陽に近い組成', () => {
    for (let i = 0; i < 300; i++) {
      const c = generateStar(`comp-${i}`).composition;
      expect(c.hydrogen + c.helium + c.metals).toBeCloseTo(1, 10);
      expect(c.hydrogen).toBeGreaterThan(0.68); // 金属量の多い星（[Fe/H]=+0.4）でも約0.69
      expect(c.hydrogen).toBeLessThan(0.76);
      expect(c.helium).toBeGreaterThanOrEqual(0.245); // 宇宙初期の値を下回らない
      expect(c.helium).toBeLessThan(0.29);
      expect(c.metals).toBeGreaterThan(0.003);
      expect(c.metals).toBeLessThan(0.04);
      const breakdown = c.metalBreakdown.reduce((s, e) => s + e.massFraction, 0);
      expect(breakdown).toBeLessThanOrEqual(c.metals);
    }
  });
});
