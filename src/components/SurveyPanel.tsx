import { useState } from 'react';
import type { SpectralClass } from '../types';
import { SPECTRAL_CLASSES } from '../types';
import { SPECTRAL_TYPE_LIST, normalizedSpectralProbabilities } from '../data/stellarTypes';
import { sampleSpectralClasses } from '../models/systemGenerator';
import { formatInteger } from '../utils/format';

const SIZES = [1000, 10000, 100000] as const;

interface SurveyResult {
  n: number;
  counts: Record<SpectralClass, number>;
}

/** 大量の恒星をまとめて「観測」して、型の割合を確かめる */
export function SurveyPanel() {
  const [result, setResult] = useState<SurveyResult | null>(null);
  const probabilities = normalizedSpectralProbabilities();

  const run = (n: number) => setResult({ n, counts: sampleSpectralClasses(n) });
  const maxCount = result ? Math.max(...SPECTRAL_CLASSES.map((c) => result.counts[c])) : 1;

  return (
    <section className="panel survey-panel" aria-labelledby="survey-title">
      <div className="section-head">
        <h2 id="survey-title">銀河をまとめて観測してみよう</h2>
        <p className="section-sub">
          同じ確率モデルで大量の恒星の型だけを抽選します。何度か試して、毎回どれくらい結果が揺らぐかも見てみましょう。
        </p>
      </div>
      <div className="survey-buttons">
        {SIZES.map((n) => (
          <button key={n} type="button" className="secondary-button" onClick={() => run(n)}>
            {formatInteger(n)}個を観測
          </button>
        ))}
      </div>
      {result && (
        <table className="survey-table">
          <caption>{formatInteger(result.n)}個の恒星を観測した結果</caption>
          <thead>
            <tr>
              <th scope="col">型</th>
              <th scope="col">個数</th>
              <th scope="col" className="bar-col">割合</th>
              <th scope="col">期待値</th>
            </tr>
          </thead>
          <tbody>
            {SPECTRAL_TYPE_LIST.map((t) => {
              const count = result.counts[t.cls];
              const expected = probabilities[t.cls] * result.n;
              return (
                <tr key={t.cls}>
                  <th scope="row" style={{ color: t.displayColor }}>{t.cls}</th>
                  <td>{formatInteger(count)}</td>
                  <td className="bar-col">
                    <span className="survey-bar" style={{ width: `${(count / maxCount) * 100}%`, background: t.displayColor }} />
                    <span className="survey-pct">{((count / result.n) * 100).toFixed(2)}%</span>
                  </td>
                  <td>{expected < 1 ? expected.toFixed(4) : formatInteger(expected)}個</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {result && result.counts.O === 0 && (
        <p className="note">
          O型は1つも出ませんでした。これは正常です。O型の確率は約{formatInteger(1 / probabilities.O)}分の1なので、
          {formatInteger(result.n)}個観測しても期待される数は{(probabilities.O * result.n).toFixed(4)}個しかありません。
        </p>
      )}
    </section>
  );
}
