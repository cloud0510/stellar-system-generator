import type { StarSystem } from '../types';
import type { FavoriteRecord } from '../storage/persistence';
import { StarSprite } from './Sprites';
import { SystemSummary } from './HistoryPanel';

interface Props {
  favorites: FavoriteRecord[];
  currentId: string;
  onRestore: (system: StarSystem) => void;
  onRemove: (id: string) => void;
}

export function FavoritesPanel({ favorites, currentId, onRestore, onRemove }: Props) {
  return (
    <section className="panel list-panel" aria-labelledby="fav-title">
      <h2 id="fav-title">お気に入り <small>（このブラウザに保存）</small></h2>
      {favorites.length === 0 ? (
        <p className="empty-note">「☆ お気に入りに保存」を押すと、ここに残ります。ページを再読み込みしても消えません。</p>
      ) : (
        <ul className="sys-list" data-testid="favorites-list">
          {favorites.map((f) => (
            <li key={f.id} className="fav-row">
              <button
                type="button"
                className={`sys-item ${f.id === currentId ? 'current' : ''}`}
                onClick={() => onRestore(f.system)}
                aria-label={`お気に入りの${f.system.star.spectralLabel}（${f.id}）を表示`}
              >
                {f.imageDataUrl ? (
                  <img src={f.imageDataUrl} width={40} height={40} alt="" className="pixel-sprite" />
                ) : (
                  <StarSprite appearance={f.system.star.appearance} displaySize={40} label="" />
                )}
                <SystemSummary system={f.system} />
              </button>
              <button type="button" className="icon-button" onClick={() => onRemove(f.id)} aria-label={`${f.id}をお気に入りから外す`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
