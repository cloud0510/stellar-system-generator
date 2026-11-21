// 恒星のドット絵（教育用イラスト。実際の恒星表面の画像ではない）
// 表面模様（粒状斑・黒点）は球面上に貼り付けて描き、フレーム番号に応じて自転させる。
// フレアは黒点（活動領域）付近で、seed と時刻から決まるタイミングで発生する。
import type { StarAppearance } from '../types';
import { hexToRgb, mixRgb, scaleRgb } from '../utils/color';
import type { Rgb } from '../utils/color';
import { bayer, ditherLevel, fbm3, hash2 } from './pixelNoise';

export const STAR_SPRITE_SIZE = 72;
/** スプライトの一辺に対する恒星円盤の半径の割合（外側に光のにじみを描く余白を残す） */
export const STAR_DISK_FRACTION = 0.36;
/** アニメーションのフレームレート（ドット絵らしい低フレームレート） */
export const STAR_ANIMATION_FPS = 8;
/** 自転周期の既定値 [フレーム]（保存データにない場合） */
const DEFAULT_ROTATION_FRAMES = 240;
/** フレアの抽選単位 [フレーム] */
const FLARE_SLOT_FRAMES = 32;

const WHITE: Rgb = [255, 255, 255];
const FLARE_COLOR: Rgb = [235, 245, 255];

function starShades(base: Rgb): Rgb[] {
  return [
    scaleRgb(base, 0.42),
    scaleRgb(base, 0.6),
    scaleRgb(base, 0.78),
    scaleRgb(base, 0.92),
    base,
    mixRgb(base, WHITE, 0.45),
    mixRgb(base, WHITE, 0.8),
  ];
}

interface SpherePoint {
  lon: number;
  lat: number;
}

/** 黒点の保存形式（円盤上の x, y）を、星に固定された経度・緯度に変換する */
function spotToSphere(x: number, y: number): SpherePoint {
  const lat = Math.asin(Math.max(-1, Math.min(1, y)));
  const cosLat = Math.max(1e-6, Math.cos(lat));
  return { lon: Math.asin(Math.max(-1, Math.min(1, x / cosLat))), lat };
}

/** 球面上の2点の角距離 [rad] */
function angularDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const cosD = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2);
  return Math.acos(Math.max(-1, Math.min(1, cosD)));
}

export function rotationPhase(appearance: StarAppearance, frame: number): number {
  const period = appearance.rotationPeriodFrames ?? DEFAULT_ROTATION_FRAMES;
  return ((frame % period) / period) * Math.PI * 2;
}

export interface FlareState {
  /** 星に固定された位置 */
  lon: number;
  lat: number;
  /** 明るさ 0〜1（急に明るくなり、ゆっくり暗くなる） */
  intensity: number;
}

/** そのフレームで起きているフレア（なければ null）。seed とフレーム番号だけで決まる */
export function flareAt(appearance: StarAppearance, frame: number): FlareState | null {
  const activity = appearance.flareActivity ?? 0;
  if (activity <= 0) return null;
  const seed = appearance.noiseSeed;
  const slot = Math.floor(frame / FLARE_SLOT_FRAMES);
  for (const s of [slot, slot - 1]) {
    if (s < 0 || hash2(s, 1, seed) >= activity * 0.55) continue;
    const start = s * FLARE_SLOT_FRAMES + Math.floor(hash2(s, 2, seed) * FLARE_SLOT_FRAMES * 0.5);
    const rise = 2;
    const decay = 10 + Math.floor(hash2(s, 3, seed) * 12);
    const t = frame - start;
    if (t < 0 || t >= rise + decay) continue;
    const intensity = (t < rise ? (t + 1) / rise : 1 - (t - rise) / decay) * (0.65 + 0.35 * hash2(s, 6, seed));
    // フレアは活動領域（黒点群）の近くで起きる
    const spots = appearance.spots;
    if (spots.length > 0) {
      const sp = spots[Math.floor(hash2(s, 4, seed) * spots.length)];
      const p = spotToSphere(sp.x, sp.y);
      return { lon: p.lon + (hash2(s, 5, seed) - 0.5) * 0.3, lat: p.lat + (hash2(s, 7, seed) - 0.5) * 0.2, intensity };
    }
    return { lon: hash2(s, 4, seed) * Math.PI * 2, lat: (hash2(s, 5, seed) - 0.5) * 1.2, intensity };
  }
  return null;
}

function put(data: Uint8ClampedArray, i: number, col: Rgb, alpha: number): void {
  data[i] = col[0];
  data[i + 1] = col[1];
  data[i + 2] = col[2];
  data[i + 3] = alpha;
}

/** RGBA ピクセル列を返す（size × size × 4）。frame を進めると自転・フレアが動く */
export function renderStarPixels(appearance: StarAppearance, size = STAR_SPRITE_SIZE, frame = 0): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  const shades = starShades(hexToRgb(appearance.baseColor));
  const c = (size - 1) / 2;
  const radius = size * STAR_DISK_FRACTION;
  const seed = appearance.noiseSeed;
  const cells = radius / appearance.granuleScale;
  const phase = rotationPhase(appearance, frame);
  const spots = appearance.spots.map((s) => ({ ...spotToSphere(s.x, s.y), size: s.size }));

  // フレアの見かけの位置（自転を反映）
  const flare = flareAt(appearance, frame);
  let flareView: { x: number; y: number; z: number } | null = null;
  if (flare) {
    const lonView = flare.lon + phase;
    flareView = { x: Math.cos(flare.lat) * Math.sin(lonView), y: Math.sin(flare.lat), z: Math.cos(flare.lat) * Math.cos(lonView) };
  }
  const flareVisible = flare && flareView && flareView.z > -0.25 ? flare.intensity : 0;
  const glowBoost = 1 + 0.7 * flareVisible;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = (x - c) / radius;
      const dy = (y - c) / radius;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d <= 1) {
        const nz = Math.sqrt(1 - d * d);
        const lat = Math.asin(dy);
        const lon = Math.atan2(dx, nz) - phase; // 星に固定された経度
        let intensity = 1 - appearance.limbDarkening * (1 - nz);

        // 粒状斑：球面上の3次元ノイズなので、自転しても継ぎ目が出ない
        const cosLat = Math.cos(lat);
        const g = fbm3(cosLat * Math.sin(lon) * cells, Math.sin(lat) * cells, cosLat * Math.cos(lon) * cells, seed, 2);
        intensity += (g - 0.5) * appearance.granulation * 0.7;

        // 黒点：暗部（本影）と半暗部。縁に近いほど自然に縮んで見える
        for (const s of spots) {
          const ad = angularDistance(lat, lon, s.lat, s.lon);
          if (ad < s.size) intensity *= 0.35;
          else if (ad < s.size * 1.7) intensity *= 0.72;
        }

        // フレア中は星全体も一時的に明るくなる（赤色矮星のフレアでは全体の明るさが目に見えて変わる）
        intensity *= 1 + 0.22 * flareVisible;

        // 左上からのハイライト（立体感を出すための表現上の誇張）
        intensity += Math.max(0, 1 - Math.hypot(dx + 0.35, dy + 0.4) * 1.6) * 0.25;

        let col = shades[ditherLevel(intensity * 0.82, shades.length, x, y)];
        if (flare) {
          const fd = angularDistance(lat, lon, flare.lat, flare.lon);
          const fr = 0.14 + 0.22 * flare.intensity;
          if (fd < fr) {
            const k = (1 - fd / fr) * flare.intensity;
            col = k > bayer(x, y) * 0.6 ? mixRgb(shades[6], FLARE_COLOR, Math.min(1, k * 1.4)) : shades[5];
          }
        }
        put(data, i, col, 255);
      } else {
        // フレアが縁の近くにあると、縁の外にループ状の噴出が見える
        if (flareView && flare && Math.abs(flareView.z) < 0.45) {
          const len = Math.hypot(flareView.x, flareView.y) || 1;
          const px = flareView.x / len;
          const py = flareView.y / len;
          const loop = Math.hypot(dx - px, dy - py);
          const h = 0.16 + 0.26 * flare.intensity;
          if (d < 1 + h && Math.abs(loop - h) < 0.09 && flare.intensity > 0.15) {
            put(data, i, mixRgb(shades[6], FLARE_COLOR, 0.6), Math.round(255 * Math.min(1, 0.5 + flare.intensity)));
            continue;
          }
        }
        // 外側の光のにじみ（ディザで段階的に）。フレア中は少し明るくなる
        const falloff = Math.exp(-(d - 1) * (6.5 - appearance.glow * 3.5)) * appearance.glow * glowBoost;
        const rays = 0.85 + 0.15 * Math.cos(Math.atan2(dy, dx) * 4);
        const strength = falloff * rays;
        if (strength > 0.04) {
          const alphaLevel = strength > 0.55 ? 0.75 : strength > 0.3 ? 0.5 : strength > 0.14 ? 0.32 : 0.18;
          if (strength > 0.3 || bayer(x, y) < strength * 2.2) put(data, i, shades[5], Math.round(alphaLevel * 255));
        }
      }
    }
  }
  return data;
}
