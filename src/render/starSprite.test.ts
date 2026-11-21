import { describe, expect, it } from 'vitest';
import { generateStarSystem } from '../models/systemGenerator';
import { flareAt, renderStarPixels, rotationPhase } from './starSprite';
import type { StarAppearance } from '../types';

function maxBrightness(px: Uint8ClampedArray): number {
  let max = 0;
  for (let i = 0; i < px.length; i += 4) if (px[i + 3] === 255) max = Math.max(max, px[i] + px[i + 1] + px[i + 2]);
  return max;
}

describe('恒星アニメーション（自転・フレア）', () => {
  const m = generateStarSystem('anim-1@M').star.appearance;
  const g = generateStarSystem('anim-1@G').star.appearance;
  const b = generateStarSystem('anim-1@B').star.appearance;

  it('アニメーション用パラメータが生成され、低温星ほどフレアが起きやすい', () => {
    expect(m.rotationPeriodFrames).toBeGreaterThan(0);
    expect(m.flareActivity!).toBeGreaterThan(g.flareActivity!);
    expect(b.flareActivity).toBe(0);
  });

  it('フレームが進むと自転で模様が動き、1周すると元に戻る', () => {
    const period = g.rotationPeriodFrames!;
    expect(renderStarPixels(g, 72, 10)).not.toEqual(renderStarPixels(g, 72, 0));
    expect(rotationPhase(g, period)).toBeCloseTo(rotationPhase(g, 0), 10);
  });

  it('各フレームは決定的（同じフレームなら同じ絵）', () => {
    expect(renderStarPixels(m, 72, 37)).toEqual(renderStarPixels(m, 72, 37));
  });

  it('フレアは急に明るくなってから減光し、フレア中は星面が明るくなる', () => {
    const frames = Array.from({ length: 2000 }, (_, f) => flareAt(m, f));
    const flareFrames = frames.map((s, f) => (s ? f : -1)).filter((f) => f >= 0);
    expect(flareFrames.length).toBeGreaterThan(0);
    const start = flareFrames[0];
    // 立ち上がり（2フレーム）より減光（10フレーム以上）のほうが長い
    const peak = frames[start + 1]!.intensity;
    expect(peak).toBeGreaterThan(frames[start]!.intensity);
    expect(frames[start + 6]!.intensity).toBeLessThan(peak);
    // フレームの全期間のどこかで、フレアのない状態より明るいピクセルが現れる
    const quiet = Array.from({ length: 2000 }, (_, f) => f).find((f) => !frames[f])!;
    const bright = Math.max(...Array.from({ length: 10 }, (_, k) => maxBrightness(renderStarPixels(m, 72, start + k))));
    expect(bright).toBeGreaterThan(maxBrightness(renderStarPixels(m, 72, quiet)));
  });

  it('フレア活動のない星ではフレアは起きない', () => {
    for (let f = 0; f < 500; f++) expect(flareAt(b, f)).toBeNull();
  });

  it('アニメーション用パラメータのない旧データ（モデルv1）も描画できる', () => {
    const { rotationPeriodFrames: _r, flareActivity: _f, ...legacy } = m;
    const px = renderStarPixels(legacy as StarAppearance, 72, 50);
    expect(px.length).toBe(72 * 72 * 4);
    expect(flareAt(legacy as StarAppearance, 50)).toBeNull();
  });
});
