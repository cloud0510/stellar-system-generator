import { useObservatory } from './hooks/useObservatory';
import { normalizedSpectralProbabilities } from './data/stellarTypes';
import { StarPanel } from './components/StarPanel';
import { StarInfoCards } from './components/StarInfoCards';
import { PlanetSection } from './components/PlanetSection';
import { HistoryPanel } from './components/HistoryPanel';
import { FavoritesPanel } from './components/FavoritesPanel';
import { SurveyPanel } from './components/SurveyPanel';
import { AboutSimulation } from './components/AboutSimulation';
import { DevTools } from './components/DevTools';
import { formatInteger } from './utils/format';

const P = normalizedSpectralProbabilities();

/** 折り畳まれた「このシミュレーションについて」を開いて表示する（URLの#seedは書き換えない） */
function openAbout() {
  const el = document.getElementById('about') as HTMLDetailsElement | null;
  if (!el) return;
  el.open = true;
  el.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}

export default function App() {
  const obs = useObservatory();
  const { current } = obs;

  return (
    <div className="app">
      <header className="site-header">
        <div className="title-block">
          <p className="eyebrow">天の川銀河 主系列星サンプラー</p>
          <h1>ランダム恒星観測所</h1>
          <p className="lead">銀河の恒星をランダムに1つずつ“観測”して、その星と惑星系を調べてみよう。</p>
        </div>
        <div className="control-block">
          <button type="button" className="generate-button" onClick={obs.generate}>
            恒星を生成
          </button>
          <p className="odds">
            出現確率：M型 約{Math.round(P.M * 100)}%／G型（太陽と同じ型） 約{(P.G * 100).toFixed(1)}%／O型 約{formatInteger(1 / P.O)}分の1
          </p>
        </div>
      </header>

      <main>
        <div className="main-grid" key={current.seed}>
          <StarPanel
            system={current}
            tally={obs.tally}
            isFavorite={obs.isFavorite}
            onToggleFavorite={obs.toggleFavorite}
            onResetTally={obs.resetTally}
          />
          <StarInfoCards system={current} />
        </div>

        <PlanetSection key={`planets-${current.seed}`} system={current} />

        <div className="lists-grid">
          <HistoryPanel history={obs.history} currentSeed={current.seed} onRestore={obs.restore} />
          <FavoritesPanel favorites={obs.favorites} currentId={current.id} onRestore={obs.restore} onRemove={obs.removeFavorite} />
        </div>

        <SurveyPanel />
        <AboutSimulation />
        <DevTools currentSeed={current.seed} onForce={obs.generateForced} onLoadSeed={obs.loadSeed} />
      </main>

      <footer className="site-footer">
        <p>
          教育用シミュレーション。表示される恒星・惑星は実在の天体ではありません。詳しくは
          <button type="button" className="link-button" onClick={openAbout}>
            「このシミュレーションについて」
          </button>
          を参照してください。
        </p>
      </footer>
    </div>
  );
}
