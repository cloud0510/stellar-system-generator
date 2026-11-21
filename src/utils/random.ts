// seed付き擬似乱数。同じseedからは常に同じ数列が得られる（要件22）。

/** 文字列を32bit整数にハッシュする (cyrb53 を32bitに畳み込んだもの) */
export function hashString(input: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ (h2 >>> 1)) >>> 0;
}

/** mulberry32: 高速で十分な品質の32bit PRNG */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface WeightedItem<T> {
  value: T;
  weight: number;
}

export class Rng {
  private readonly source: () => number;
  private spareNormal: number | null = null;

  constructor(seed: string | number) {
    this.source = mulberry32(typeof seed === 'number' ? seed : hashString(seed));
  }

  /** [0, 1) の一様乱数 */
  next(): number {
    return this.source();
  }

  uniform(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** 対数一様分布（桁をまたぐ量に使う） */
  logUniform(min: number, max: number): number {
    return Math.exp(this.uniform(Math.log(min), Math.log(max)));
  }

  /** 正規分布 (Box–Muller) */
  normal(mean = 0, sd = 1): number {
    if (this.spareNormal !== null) {
      const z = this.spareNormal;
      this.spareNormal = null;
      return mean + sd * z;
    }
    let u = 0;
    while (u === 0) u = this.next();
    const v = this.next();
    const r = Math.sqrt(-2 * Math.log(u));
    this.spareNormal = r * Math.sin(2 * Math.PI * v);
    return mean + sd * r * Math.cos(2 * Math.PI * v);
  }

  /** 範囲を切り詰めた正規分布 */
  truncatedNormal(mean: number, sd: number, min: number, max: number): number {
    for (let i = 0; i < 32; i++) {
      const x = this.normal(mean, sd);
      if (x >= min && x <= max) return x;
    }
    return Math.min(max, Math.max(min, mean));
  }

  /** 三角分布 */
  triangular(min: number, mode: number, max: number): number {
    const u = this.next();
    const c = (mode - min) / (max - min);
    return u < c
      ? min + Math.sqrt(u * (max - min) * (mode - min))
      : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }

  /** 両端を含む整数 */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /** 重み付き抽選。重みは正規化されていなくてよい（内部で合計により正規化） */
  weighted<T>(items: readonly WeightedItem<T>[]): T {
    const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
    if (total <= 0) throw new Error('weighted(): 重みの合計が0です');
    let r = this.next() * total;
    for (const item of items) {
      r -= Math.max(0, item.weight);
      if (r < 0) return item.value;
    }
    return items[items.length - 1].value;
  }
}

/** seedと用途ラベルから独立した乱数列を作る。段階ごとに分けることで、ある段階のモデル変更が他段階の結果をずらさない */
export function deriveRng(seed: string, label: string): Rng {
  return new Rng(`${seed}::${label}`);
}

const SEED_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/** 新しいランダムseed（8文字の英数字） */
export function createRandomSeed(length = 8): string {
  const bytes = new Uint32Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 2 ** 32);
  }
  return Array.from(bytes, (b) => SEED_ALPHABET[b % SEED_ALPHABET.length]).join('');
}
