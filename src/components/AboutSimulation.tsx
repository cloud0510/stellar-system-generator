import { MODEL_ASPECTS, PROVENANCE_LABELS, SOURCES } from '../data/modelProvenance';
import type { Provenance } from '../types';
import { ProvenanceTag } from './ProvenanceTag';

export function AboutSimulation() {
  return (
    <details className="panel about collapsible" id="about">
      <summary>
        <h2 id="about-title">このシミュレーションについて</h2>
        <span className="summary-hint">科学的注意事項・モデルの根拠・参考資料</span>
      </summary>
      <p className="disclaimer">
        このページで生成される恒星や惑星は、実際に観測された特定の天体ではありません。天文学で知られている恒星の性質や統計的傾向をもとに、教育目的で確率的に生成したモデルです。
      </p>
      <p>
        各データには、根拠の種類を示すタグを付けています：
        {(['A', 'B', 'C'] as Provenance[]).map((k) => (
          <span key={k} className="legend-item">
            <ProvenanceTag kind={k} /> {PROVENANCE_LABELS[k].long.slice(3)}
          </span>
        ))}
      </p>

      <h3>科学的注意事項：観測に基づく部分と、教育用モデルとして設定した部分</h3>
      <div className="aspect-grid">
        {MODEL_ASPECTS.map((aspect) => (
          <article key={aspect.id} className="aspect">
            <h4>{aspect.title}</h4>
            <ul>
              {aspect.items.map((item, i) => (
                <li key={i}>
                  <ProvenanceTag kind={item.provenance} />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <h3>生成の手順</h3>
      <ol className="steps">
        <li>恒星のスペクトル型を、固定された確率分布から抽選</li>
        <li>型の範囲内で質量を決め、質量から温度・半径・光度・寿命を計算</li>
        <li>惑星の数を抽選</li>
        <li>内側から順に、惑星どうしが近づきすぎないよう軌道半径を決定</li>
        <li>軌道と恒星の性質を参考に惑星のサイズを決定</li>
        <li>サイズ（主）と温度・距離（補助）から惑星タイプを決定</li>
        <li>タイプ・温度・サイズから惑星のドット絵を生成</li>
      </ol>
      <p className="note">
        すべての結果は seed（種）とよばれる文字列から決まります。同じ seed を入力すれば、同じ恒星と惑星系がそっくり再現されます。
      </p>

      <h3>参考資料</h3>
      <ul className="sources">
        {SOURCES.map((s) => (
          <li key={s.label}>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            ) : (
              <b>{s.label}</b>
            )}
            <span> — {s.detail}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
