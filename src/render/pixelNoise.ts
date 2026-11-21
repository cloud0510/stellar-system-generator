// ドット絵生成用の決定的ノイズ関数（同じseedなら同じ模様になる）

export function hash2(x: number, y: number, seed: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** 2次元バリューノイズ [0,1) */
export function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = smooth(x - xi);
  const ty = smooth(y - yi);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

/** 複数オクターブを重ねたノイズ [0,1) */
export function fbm(x: number, y: number, seed: number, octaves = 3): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + i * 101);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/** 4x4 ベイヤー行列による規則的ディザ（ドット絵らしい階調表現） */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bayer(x: number, y: number): number {
  return (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

/** 値 v (0〜1) を levels 段階にディザ付きで量子化した段階番号 */
export function ditherLevel(v: number, levels: number, x: number, y: number): number {
  const scaled = Math.min(0.9999, Math.max(0, v)) * (levels - 1);
  const base = Math.floor(scaled);
  return Math.min(levels - 1, base + (scaled - base > bayer(x, y) ? 1 : 0));
}

function hash3(x: number, y: number, z: number, seed: number): number {
  return hash2(Math.imul(x | 0, 1013904223) ^ (z | 0), y, seed);
}

/** 3次元バリューノイズ [0,1)。球面上の模様を継ぎ目なく描くために使う */
export function valueNoise3(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const tx = smooth(x - xi);
  const ty = smooth(y - yi);
  const tz = smooth(z - zi);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const layer = (zz: number) =>
    lerp(
      lerp(hash3(xi, yi, zz, seed), hash3(xi + 1, yi, zz, seed), tx),
      lerp(hash3(xi, yi + 1, zz, seed), hash3(xi + 1, yi + 1, zz, seed), tx),
      ty,
    );
  return lerp(layer(zi), layer(zi + 1), tz);
}

export function fbm3(x: number, y: number, z: number, seed: number, octaves = 2): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise3(x * freq, y * freq, z * freq, seed + i * 101);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}
