import type { Star } from '../types';
import { SPECTRAL_TYPES } from '../data/stellarTypes';
import { SUN_TEFF_K } from '../data/mainSequence';
import { starDisplayColor } from '../models/stellarGenerator';
import { formatRatioToSun, formatSignificant } from '../utils/format';

const W = 340;
const H = 190;
const BASELINE = 160;
const MAX_DIAMETER = 130;
const TINY_PX = 12;
const SUN_COLOR = starDisplayColor(SPECTRAL_TYPES.G, SUN_TEFF_K);

/**
 * 生成した恒星と太陽を「同じ縮尺」で並べる。
 * 一方が小さすぎて見えない場合は縮尺を変えずに、その天体だけ拡大図（ルーペ）を添える。
 */
export function SizeComparison({ star }: { star: Star }) {
  const r = star.radiusSolar;
  const scale = MAX_DIAMETER / (2 * Math.max(r, 1)); // px / R☉
  const sunD = 2 * scale;
  const starD = 2 * r * scale;
  const gap = 36;
  const totalW = sunD + gap + starD;
  const left = (W - totalW) / 2;
  const sun = { cx: left + sunD / 2, d: sunD };
  const target = { cx: left + sunD + gap + starD / 2, d: starD };
  const tiny = sunD < TINY_PX ? { ...sun, name: '太陽', color: SUN_COLOR } : starD < TINY_PX ? { ...target, name: 'この恒星', color: star.appearance.baseColor } : null;
  const zoom = tiny ? 44 / tiny.d : 1;

  return (
    <figure className="size-compare">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`同じ縮尺での比較：この恒星の半径は${formatRatioToSun(r)}`}>
        <line x1={8} x2={W - 8} y1={BASELINE} y2={BASELINE} className="baseline" />
        <circle cx={sun.cx} cy={BASELINE - sun.d / 2} r={Math.max(sun.d / 2, 0.8)} fill={SUN_COLOR} />
        <circle cx={target.cx} cy={BASELINE - target.d / 2} r={Math.max(target.d / 2, 0.8)} fill={star.appearance.baseColor} />
        <text x={sun.cx} y={BASELINE + 18} textAnchor="middle" className="svg-label">太陽</text>
        <text x={target.cx} y={BASELINE + 18} textAnchor="middle" className="svg-label">この恒星</text>
        {tiny && (
          <g className="loupe">
            <circle cx={tiny.cx} cy={BASELINE - tiny.d / 2} r={9} className="loupe-ring" />
            <line x1={tiny.cx} y1={BASELINE - tiny.d / 2 - 9} x2={tiny.cx < W / 2 ? 58 : W - 58} y2={62} className="loupe-line" />
            <circle cx={tiny.cx < W / 2 ? 58 : W - 58} cy={36} r={32} className="loupe-lens" />
            <circle cx={tiny.cx < W / 2 ? 58 : W - 58} cy={36} r={22} fill={tiny.color} />
            <text x={tiny.cx < W / 2 ? 58 : W - 58} y={82} textAnchor="middle" className="svg-label small">
              {tiny.name}の拡大図（×{formatSignificant(zoom, 2)}）
            </text>
          </g>
        )}
      </svg>
      <figcaption>
        半径 <strong>{formatSignificant(r, 3)} R☉</strong>（{formatRatioToSun(r)}）。円の大きさは同じ縮尺です
        {tiny ? '。小さすぎて見えにくい天体には拡大図を添えています。' : '。'}
      </figcaption>
    </figure>
  );
}
