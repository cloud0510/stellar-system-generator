import type { StarSystem } from '../types';
import type { Tally } from '../storage/persistence';
import { SPECTRAL_TYPES } from '../data/stellarTypes';
import { useMotionPreference } from '../hooks/useMotionPreference';
import { AnimatedStarSprite } from './Sprites';
import { SizeComparison } from './SizeComparison';
import { SpectralStrip } from './SpectralStrip';

/** この値以上ならフレアが目立つ星として説明文を添える */
const FLARE_NOTE_THRESHOLD = 0.4;

interface Props {
  system: StarSystem;
  tally: Tally;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onResetTally: () => void;
}

export function StarPanel({ system, tally, isFavorite, onToggleFavorite, onResetTally }: Props) {
  const { star } = system;
  const model = SPECTRAL_TYPES[star.spectralClass];
  const [playing, togglePlaying] = useMotionPreference();
  const flareActive = (star.appearance.flareActivity ?? 0) >= FLARE_NOTE_THRESHOLD;

  return (
    <section className="panel star-panel" aria-labelledby="star-title">
      <div className="star-heading">
        <div>
          <p className="eyebrow">恒星ID {system.id}</p>
          <h2 id="star-title" className="star-title">
            <span className="type-badge" style={{ ['--type-color' as string]: model.displayColor }}>{star.spectralLabel}</span>
            <span>{model.nameJa}</span>
          </h2>
        </div>
        <button
          type="button"
          className={`fav-button ${isFavorite ? 'on' : ''}`}
          onClick={onToggleFavorite}
          aria-pressed={isFavorite}
        >
          {isFavorite ? '★ お気に入り済み' : '☆ お気に入りに保存'}
        </button>
      </div>

      <div className="star-stage">
        <AnimatedStarSprite
          appearance={star.appearance}
          displaySize={216}
          label={`${star.spectralLabel}型の恒星のドット絵（自転${flareActive ? '・フレア' : ''}のアニメーション）`}
          playing={playing}
        />
        {system.forcedClass && <span className="forced-flag">型指定モード（確率どおりではありません）</span>}
        <button type="button" className="anim-toggle" onClick={togglePlaying} aria-pressed={!playing}>
          {playing ? '❚❚ アニメーション停止' : '▶ アニメーション再生'}
        </button>
      </div>
      <p className="illustration-note">
        ※ 生成モデルにもとづくイラストです。実際の恒星の写真ではありません。自転やフレアの速さは大きく誇張しています（実際の自転周期は数時間〜数十日）。
        {flareActive && '低温で磁気活動の強い星（特に赤色矮星）では、表面で突発的に明るく輝くフレアが頻繁に起こることが知られています。'}
      </p>

      <p className="type-desc">
        <strong className="color-word" style={{ color: model.displayColor }}>{model.colorJa}</strong>　{model.description}
      </p>
      <p className="type-examples">実在の例：{model.examples}</p>

      <h3 className="mini-title">太陽とのサイズ比較</h3>
      <SizeComparison star={star} />

      <SpectralStrip star={star} tally={tally} onResetTally={onResetTally} />
    </section>
  );
}
