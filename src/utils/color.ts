export type Rgb = readonly [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const v = hex.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const h = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function mixHex(a: string, b: string, t: number): string {
  return rgbToHex(mixRgb(hexToRgb(a), hexToRgb(b), t));
}

export function scaleRgb(c: Rgb, k: number): Rgb {
  return [c[0] * k, c[1] * k, c[2] * k];
}

/**
 * 黒体放射の色温度をおおまかなRGBに変換する近似式（Tanner Helland による多項式近似）。
 * 表示用の近似であり、測光的に厳密な色ではない。
 */
export function kelvinToRgb(kelvin: number): Rgb {
  const t = Math.min(40000, Math.max(1000, kelvin)) / 100;
  let r: number;
  let g: number;
  let b: number;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  }
  if (t >= 66) b = 255;
  else if (t <= 19) b = 0;
  else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = (n: number) => Math.min(255, Math.max(0, n));
  return [c(r), c(g), c(b)];
}

/** 色相を少しずらす（パレットの個体差用）。shift は -1〜1 程度 */
export function jitterHex(hex: string, shift: number): string {
  const [r, g, b] = hexToRgb(hex);
  const k = 1 + shift * 0.12;
  return rgbToHex([r * k + shift * 10, g * (1 + shift * 0.05), b * (1 - shift * 0.08)]);
}
