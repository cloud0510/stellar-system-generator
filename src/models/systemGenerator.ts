// 恒星システム全体の生成とseed管理（要件19・22）。
// 生成順序: 1.恒星タイプ 2.恒星物理量 3.惑星数 4.惑星軌道 5.惑星サイズ 6.惑星タイプ 7.惑星グラフィック

import type { SpectralClass, StarSystem } from '../types';
import { SPECTRAL_CLASSES } from '../types';
import { generateStar, pickSpectralClass } from './stellarGenerator';
import { generatePlanetarySystem } from './planetarySystemGenerator';
import { Rng, createRandomSeed } from '../utils/random';

/** 生成モデルのバージョン。モデルの数値を変えたら上げる（保存済みデータとの区別用） */
export const MODEL_VERSION = 2; // v2: 恒星の自転周期・フレア活動度を追加

const FORCED_SEPARATOR = '@';

export interface ParsedSeed {
  base: string;
  forcedClass?: SpectralClass;
}

/** "abc123" または型指定生成の "abc123@O" を解釈する */
export function parseSeed(seed: string): ParsedSeed {
  const trimmed = seed.trim();
  const at = trimmed.lastIndexOf(FORCED_SEPARATOR);
  if (at > 0) {
    const cls = trimmed.slice(at + 1).toUpperCase();
    if ((SPECTRAL_CLASSES as readonly string[]).includes(cls)) {
      return { base: trimmed.slice(0, at), forcedClass: cls as SpectralClass };
    }
  }
  return { base: trimmed };
}

export function isValidSeed(seed: string): boolean {
  const { base } = parseSeed(seed);
  return /^[0-9a-zA-Z_-]{1,32}$/.test(base);
}

export function makeForcedSeed(cls: SpectralClass, base = createRandomSeed()): string {
  return `${base}${FORCED_SEPARATOR}${cls}`;
}

export function starIdFromSeed(seed: string): string {
  return `MWS-${seed.toUpperCase().replace(FORCED_SEPARATOR, '-')}`;
}

/** seedから恒星システムを完全に決定的に生成する */
export function generateStarSystem(seed: string): StarSystem {
  const normalized = seed.trim();
  const { forcedClass } = parseSeed(normalized);
  const star = generateStar(normalized, forcedClass);
  const { zones, planets } = generatePlanetarySystem(normalized, star);
  return {
    id: starIdFromSeed(normalized),
    seed: normalized,
    modelVersion: MODEL_VERSION,
    ...(forcedClass ? { forcedClass } : {}),
    star,
    zones,
    planets,
  };
}

/** 新しいランダムな恒星システム */
export function generateRandomStarSystem(): StarSystem {
  return generateStarSystem(createRandomSeed());
}

/** 統計用：スペクトル型だけを大量に抽選する（惑星生成を省いた高速版。抽選規則は同じ） */
export function sampleSpectralClasses(n: number, seed: string = createRandomSeed()): Record<SpectralClass, number> {
  const rng = new Rng(`${seed}::survey`);
  const counts = Object.fromEntries(SPECTRAL_CLASSES.map((c) => [c, 0])) as Record<SpectralClass, number>;
  for (let i = 0; i < n; i++) counts[pickSpectralClass(rng)]++;
  return counts;
}
