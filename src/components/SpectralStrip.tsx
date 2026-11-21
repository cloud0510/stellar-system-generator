import type { SpectralClass, Star } from '../types';
import { SPECTRAL_TYPE_LIST } from '../data/stellarTypes';
import type { Tally } from '../storage/persistence';
import { formatInteger } from '../utils/format';

function percentLabel(p: number): string {
  return p < 0.01 ? `${p}%` : `${p.toFixed(2)}%`;
}

/** 型の温度範囲の中での位置（左=高温, 右=低温）を 0〜1 で */
function positionInClass(star: Star, range: readonly [number, number]): number {
  const [min, max] = range;
  return (Math.log(max) - Math.log(star.temperatureK)) / (Math.log(max) - Math.log(min));
}

interface Props {
  star: Star;
  tally: Tally;
  onResetTally: () => void;
}

export function SpectralStrip({ star, tally, onResetTally }: Props) {
  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  return (
    <section className="spectral-strip-wrap" aria-labelledby="strip-title">
      <h3 id="strip-title" className="mini-title">スペクトル型の並び（OBAFGKM）</h3>
      <div className="strip-axis" aria-hidden="true">
        <span>← 高温・大質量・青白</span>
        <span>低温・小質量・赤 →</span>
      </div>
      <ol className="spectral-strip">
        {SPECTRAL_TYPE_LIST.map((t) => {
          const active = t.cls === star.spectralClass;
          const count = tally[t.cls as SpectralClass];
          return (
            <li
              key={t.cls}
              className={active ? 'active' : undefined}
              style={{ ['--type-color' as string]: t.displayColor }}
              aria-current={active ? 'true' : undefined}
            >
              {active && (
                <span
                  className="strip-marker"
                  style={{ left: `${Math.min(92, Math.max(8, positionInClass(star, t.temperatureRangeK) * 100))}%` }}
                  aria-label={`この恒星は${t.cls}型（${star.spectralLabel}）`}
                >
                  ▼
                </span>
              )}
              <span className="strip-letter">{t.cls}</span>
              <span className="strip-pct" title="主系列星に占める割合（固定モデル）">{percentLabel(t.fixedWeightPercent)}</span>
              <span className="strip-count" title="あなたがこれまでに生成した数">{formatInteger(count)}</span>
            </li>
          );
        })}
      </ol>
      <div className="strip-legend">
        <span>上段：主系列星に占める割合（固定モデル）／下段：あなたの観測数（合計 {formatInteger(total)} 個）</span>
        <button type="button" className="link-button" onClick={onResetTally}>
          観測数をリセット
        </button>
      </div>
    </section>
  );
}
