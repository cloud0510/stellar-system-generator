// ピクセル列を canvas に描く薄い層。ピクセル生成（starSprite / planetSprite）は純粋関数なのでテスト可能。
import type { StarAppearance } from '../types';
import { STAR_SPRITE_SIZE, renderStarPixels } from './starSprite';

export function drawPixels(canvas: HTMLCanvasElement, pixels: Uint8ClampedArray, size: number): void {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const image = ctx.createImageData(size, size);
  image.data.set(pixels);
  ctx.putImageData(image, 0, 0);
}

/** お気に入り保存用：恒星画像をPNGのdata URLにする（失敗したらnull） */
export function starImageDataUrl(appearance: StarAppearance): string | null {
  try {
    const canvas = document.createElement('canvas');
    drawPixels(canvas, renderStarPixels(appearance, STAR_SPRITE_SIZE), STAR_SPRITE_SIZE);
    const url = canvas.toDataURL('image/png');
    return typeof url === 'string' && url.startsWith('data:image') ? url : null;
  } catch {
    return null;
  }
}
