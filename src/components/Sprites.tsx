import { useEffect, useMemo, useRef } from 'react';
import type { PlanetAppearance, StarAppearance } from '../types';
import { drawPixels } from '../render/canvas';
import { STAR_ANIMATION_FPS, STAR_SPRITE_SIZE, renderStarPixels } from '../render/starSprite';
import { PLANET_SPRITE_SIZE, renderPlanetPixels } from '../render/planetSprite';

interface PixelSpriteProps {
  pixels: Uint8ClampedArray;
  size: number;
  displaySize: number;
  label: string;
  className?: string;
}

export function PixelSprite({ pixels, size, displaySize, label, className }: PixelSpriteProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawPixels(ref.current, pixels, size);
  }, [pixels, size]);
  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className={`pixel-sprite ${className ?? ''}`}
      style={{ width: displaySize, height: displaySize }}
    />
  );
}

export function StarSprite({ appearance, displaySize, label }: { appearance: StarAppearance; displaySize: number; label: string }) {
  const pixels = useMemo(() => renderStarPixels(appearance, STAR_SPRITE_SIZE), [appearance]);
  return <PixelSprite pixels={pixels} size={STAR_SPRITE_SIZE} displaySize={displaySize} label={label} className="star-sprite" />;
}

export function PlanetSprite({ appearance, displaySize, label }: { appearance: PlanetAppearance; displaySize: number; label: string }) {
  const pixels = useMemo(() => renderPlanetPixels(appearance, PLANET_SPRITE_SIZE), [appearance]);
  return <PixelSprite pixels={pixels} size={PLANET_SPRITE_SIZE} displaySize={displaySize} label={label} className="planet-sprite" />;
}

/**
 * 自転・フレアを低フレームレート（STAR_ANIMATION_FPS）で描き続ける恒星。
 * playing=false のときは現在のフレームで止まる。タブが非表示の間は描画しない。
 */
export function AnimatedStarSprite({
  appearance,
  displaySize,
  label,
  playing,
}: {
  appearance: StarAppearance;
  displaySize: number;
  label: string;
  playing: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    frameRef.current = 0;
  }, [appearance]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => drawPixels(canvas, renderStarPixels(appearance, STAR_SPRITE_SIZE, frameRef.current), STAR_SPRITE_SIZE);
    draw();
    if (!playing) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      frameRef.current += 1;
      draw();
    }, 1000 / STAR_ANIMATION_FPS);
    return () => window.clearInterval(id);
  }, [appearance, playing]);

  return (
    <canvas
      ref={ref}
      width={STAR_SPRITE_SIZE}
      height={STAR_SPRITE_SIZE}
      role="img"
      aria-label={label}
      data-playing={playing}
      className="pixel-sprite star-sprite"
      style={{ width: displaySize, height: displaySize }}
    />
  );
}
