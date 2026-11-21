import type { StarSystem } from '../types';
import type { HistoryEntry } from '../storage/persistence';
import { HISTORY_LIMIT } from '../storage/persistence';
import { formatInteger, formatSignificant } from '../utils/format';
import { StarSprite } from './Sprites';

export function SystemSummary({ system }: { system: StarSystem }) {
  const s = system.star;
  return (
    <span className="sys-summary">
      <b className="sys-label">{s.spectralLabel}</b>
      <span>{formatInteger(s.temperatureK)} K</span>
      <span>{formatSignificant(s.massSolar, 2)} M☉</span>
      <span>{formatSignificant(s.radiusSolar, 2)} R☉</span>
      <span>惑星 {system.planets.length}</span>
    </span>
  );
}

interface Props {
  history: HistoryEntry[];
  currentSeed: string;
  onRestore: (system: StarSystem) => void;
}

export function HistoryPanel({ history, currentSeed, onRestore }: Props) {
  return (
    <section className="panel list-panel" aria-labelledby="history-title">
      <h2 id="history-title">観測履歴 <small>（最新{HISTORY_LIMIT}件）</small></h2>
      {history.length === 0 ? (
        <p className="empty-note">まだ履歴がありません。</p>
      ) : (
        <ul className="sys-list" data-testid="history-list">
          {history.map(({ system }) => (
            <li key={system.seed}>
              <button
                type="button"
                className={`sys-item ${system.seed === currentSeed ? 'current' : ''}`}
                onClick={() => onRestore(system)}
                aria-label={`${system.star.spectralLabel}（${system.id}）を表示`}
              >
                <StarSprite appearance={system.star.appearance} displaySize={40} label="" />
                <SystemSummary system={system} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
