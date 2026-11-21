// 惑星のドット絵（生成モデルにもとづく教育用イラスト。実際の画像ではない）
import type { PlanetAppearance } from '../types';
import { hexToRgb, mixRgb, scaleRgb } from '../utils/color';
import type { Rgb } from '../utils/color';
import { Rng } from '../utils/random';
import { ditherLevel, fbm, hash2 } from './pixelNoise';

export const PLANET_SPRITE_SIZE = 48;

/** スプライトの一辺に対する惑星円盤の半径の割合（環がある場合は環の分だけ小さく描く） */
export function planetDiskFraction(appearance: PlanetAppearance): number {
  return appearance.ring ? 0.25 : 0.42;
}

/** 光源（恒星）は左上方向にあるものとして陰影をつける */
const LIGHT = (() => {
  const v = [-0.62, -0.38, 0.68];
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / n) as [number, number, number];
})();

interface Crater {
  x: number;
  y: number;
  r: number;
}

function surfaceColor(
  a: PlanetAppearance,
  palette: Rgb[],
  nx: number,
  ny: number,
  craters: Crater[],
  storm: { x: number; y: number; rx: number; ry: number } | null,
): { color: Rgb; emissive: number } {
  const seed = a.noiseSeed;
  const n = fbm(nx * 2.2 + 10, ny * 2.2 + 10, seed, 3);
  const pick = (v: number, from: number, to: number) => palette[Math.min(to, Math.max(from, from + Math.floor(v * (to - from + 1))))];
  let color: Rgb;
  let emissive = 0;

  switch (a.style) {
    case 'craters': {
      color = pick(n, 1, 3);
      for (const c of craters) {
        const d = Math.hypot(nx - c.x, ny - c.y);
        if (d < c.r * 0.75) color = palette[1];
        else if (d < c.r) color = palette[d < c.r * 0.88 && nx > c.x ? 3 : 2];
      }
      break;
    }
    case 'lava': {
      const crack = Math.abs(fbm(nx * 3.1, ny * 3.1, seed + 7, 3) - 0.5);
      if (crack < 0.035) {
        color = palette[4];
        emissive = 1;
      } else if (crack < 0.07) {
        color = palette[3];
        emissive = 0.7;
      } else color = pick(n, 0, 1);
      break;
    }
    case 'continents': {
      color = n < 0.5 ? pick(n * 2, 0, 1) : pick((n - 0.5) * 2, 2, 3);
      break;
    }
    case 'ocean': {
      color = pick(n, 1, 3);
      if (n > 0.72) color = mixRgb(palette[3], [180, 170, 120], 0.4); // 小さな島（想像）
      break;
    }
    case 'ice': {
      const crack = Math.abs(fbm(nx * 2.6 + 3, ny * 2.6, seed + 3, 3) - 0.5);
      color = crack < 0.025 ? palette[1] : pick(n, 2, 4);
      for (const c of craters) if (Math.hypot(nx - c.x, ny - c.y) < c.r) color = palette[2];
      break;
    }
    case 'haze': {
      const band = 0.5 + 0.22 * Math.sin(ny * a.bandCount * Math.PI + n * 1.2);
      color = pick(band, 1, 3);
      break;
    }
    case 'bands':
    default: {
      const turb = fbm(nx * 4, ny * 1.2, seed + 11, 3);
      const band = 0.5 + 0.5 * Math.sin(ny * a.bandCount * Math.PI + turb * 2.2);
      color = pick(band, 1, 4);
      if (storm) {
        const d = ((nx - storm.x) / storm.rx) ** 2 + ((ny - storm.y) / storm.ry) ** 2;
        if (d < 1) color = d < 0.45 ? mixRgb(palette[0], [190, 70, 40], 0.4) : palette[2];
      }
      if (a.nightGlow) emissive = 0.25;
      break;
    }
  }

  if (a.polarCaps && Math.abs(ny) > 0.8 + (n - 0.5) * 0.15) color = palette[palette.length - 1];
  if (a.clouds > 0) {
    const cloud = fbm(nx * 3 + 40, ny * 5, seed + 29, 3);
    if (cloud > 1 - a.clouds * 0.75) color = mixRgb(color, [245, 248, 255], 0.85);
  }
  return { color, emissive };
}

/** RGBA ピクセル列を返す（size × size × 4） */
export function renderPlanetPixels(a: PlanetAppearance, size = PLANET_SPRITE_SIZE): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  const palette = a.palette.map(hexToRgb);
  const rng = new Rng(a.noiseSeed);
  const craters: Crater[] = Array.from({ length: a.craters }, () => ({
    x: rng.uniform(-0.75, 0.75),
    y: rng.uniform(-0.7, 0.7),
    r: rng.uniform(0.08, 0.22),
  }));
  const storm = a.storm ? { x: rng.uniform(-0.4, 0.3), y: rng.uniform(-0.45, 0.45), rx: rng.uniform(0.16, 0.26), ry: rng.uniform(0.08, 0.12) } : null;
  const ringTilt = rng.uniform(0.22, 0.34);

  const c = (size - 1) / 2;
  const r = size * planetDiskFraction(a);
  const ringColor = mixRgb(palette[3], palette[4], 0.4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = (x - c) / r;
      const dy = (y - c) / r;
      const d2 = dx * dx + dy * dy;
      const onDisk = d2 <= 1;

      let ringHit = false;
      let ringShade = 0;
      if (a.ring) {
        // 環は少し傾いた楕円。手前半分は惑星の前、奥半分は惑星の後ろ
        const ry = dy / ringTilt;
        const rr = Math.hypot(dx, ry);
        if (rr > 1.3 && rr < 1.95 && Math.abs(rr - 1.62) > 0.04) {
          ringHit = !onDisk || dy > 0;
          ringShade = 0.7 + 0.3 * hash2(Math.floor(rr * 12), 0, a.noiseSeed);
        }
      }

      let rgb: Rgb | null = null;
      if (ringHit) {
        rgb = scaleRgb(ringColor, ringShade * (dx < 0 ? 1 : 0.75));
      } else if (onDisk) {
        const nz = Math.sqrt(1 - d2);
        const { color, emissive } = surfaceColor(a, palette, dx, dy, craters, storm);
        const lambert = Math.max(0, dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2]);
        const level = ditherLevel(0.18 + lambert * 0.9, 5, x, y);
        const shade = [0.28, 0.48, 0.68, 0.86, 1.04][level];
        let col = scaleRgb(color, shade);
        if (emissive > 0) col = mixRgb(col, color, emissive * (1 - lambert * 0.5));
        if (a.nightGlow && lambert < 0.12) col = mixRgb(col, [200, 60, 30], 0.25);
        // 大気のふち（ガス・海王星型・雲のある惑星）
        if ((a.style === 'bands' || a.style === 'haze' || a.clouds > 0.2) && d2 > 0.86 && lambert > 0.1) {
          col = mixRgb(col, palette[4], 0.35);
        }
        rgb = col;
      }

      if (rgb) {
        data[i] = rgb[0];
        data[i + 1] = rgb[1];
        data[i + 2] = rgb[2];
        data[i + 3] = 255;
      }
    }
  }
  return data;
}
