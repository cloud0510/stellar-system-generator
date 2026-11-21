import type { ReactNode } from 'react';
import type { Provenance, StarSystem } from '../types';
import { SPECTRAL_TYPES } from '../data/stellarTypes';
import { UNIVERSE_AGE_YEARS } from '../data/mainSequence';
import { PRIMORDIAL_COMPOSITION } from '../data/composition';
import {
  formatInteger,
  formatLuminosity,
  formatPercent,
  formatRatioToSun,
  formatSignificant,
  formatYearsJa,
} from '../utils/format';
import { ProvenanceTag } from './ProvenanceTag';

/** 太陽半径 / 地球半径 */
const SUN_TO_EARTH_RADIUS = 109.1;

function Card({ title, tags, children, wide }: { title: string; tags: Provenance[]; children: ReactNode; wide?: boolean }) {
  return (
    <article className={`info-card ${wide ? 'wide' : ''}`}>
      <header>
        <h3>{title}</h3>
        <div className="tags">
          {tags.map((t) => (
            <ProvenanceTag key={t} kind={t} />
          ))}
        </div>
      </header>
      {children}
    </article>
  );
}

/** 対数目盛りのメーター（min〜max の中での位置） */
function LogMeter({ value, min, max, marks, label }: { value: number; min: number; max: number; marks: { at: number; text: string; above?: boolean }[]; label: string }) {
  const pos = (v: number) => Math.min(100, Math.max(0, ((Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min))) * 100));
  return (
    <div className="log-meter" role="img" aria-label={label}>
      <div className="track">
        <div className="fill" style={{ width: `${pos(value)}%` }} />
        {marks.map((m) => (
          <span key={m.text} className="mark" style={{ left: `${pos(m.at)}%` }}>
            <span className={`mark-text ${m.above ? 'above' : ''}`}>{m.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function StarInfoCards({ system }: { system: StarSystem }) {
  const { star, planets } = system;
  const model = SPECTRAL_TYPES[star.spectralClass];
  const c = star.composition;
  const lifetimeVsUniverse = star.mainSequenceLifetimeYears / UNIVERSE_AGE_YEARS;
  const otherMetals = c.metals - c.metalBreakdown.reduce((s, e) => s + e.massFraction, 0);

  return (
    <section className="panel cards-panel" aria-label="恒星のデータ">
      <div className="cards-grid">
        <Card title="スペクトル型" tags={['A']}>
          <p className="big-value">{star.spectralLabel}</p>
          <p className="sub-value">{model.nameJa}（{model.colorJa}色の星）</p>
          <p className="note">末尾の「V」は主系列星（光度階級V）を表します。数字は型の中の細分類で、0が高温側です。</p>
        </Card>

        <Card title="表面温度" tags={['A', 'B']}>
          <p className="big-value">約{formatInteger(star.temperatureK)} K</p>
          <p className="sub-value">約{formatInteger(star.temperatureK - 273)} ℃ ／ 太陽は約5,772 K</p>
          <LogMeter
            value={star.temperatureK}
            min={2400}
            max={50000}
            marks={[{ at: 5772, text: '太陽' }]}
            label={`表面温度のメーター。${formatInteger(star.temperatureK)} K`}
          />
          <p className="note">{star.spectralClass}型の範囲：{formatInteger(model.temperatureRangeK[0])}〜{star.spectralClass === 'O' ? '' : formatInteger(model.temperatureRangeK[1]) + ' '}K{star.spectralClass === 'O' ? ' 以上' : ''}</p>
        </Card>

        <Card title="質量" tags={['B']}>
          <p className="big-value">約{formatSignificant(star.massSolar, 2)} M☉</p>
          <p className="sub-value">{formatRatioToSun(star.massSolar)}</p>
          <p className="note">質量はこのモデルの「主役」のパラメータです。温度・半径・明るさ・寿命は質量から決まります。</p>
        </Card>

        <Card title="半径" tags={['B']}>
          <p className="big-value">約{formatSignificant(star.radiusSolar, 2)} R☉</p>
          <p className="sub-value">{formatRatioToSun(star.radiusSolar)}（地球の約{formatSignificant(star.radiusSolar * SUN_TO_EARTH_RADIUS, 2)}倍）</p>
          <p className="note">明るさ（光度）は約{formatLuminosity(star.luminositySolar)} L☉（{formatRatioToSun(star.luminositySolar)}）。L = R²×T⁴（太陽比）で計算。</p>
        </Card>

        <Card title="主系列寿命" tags={['B']} wide>
          <p className="big-value">約{formatYearsJa(star.mainSequenceLifetimeYears)}</p>
          <p className="sub-value">
            {lifetimeVsUniverse >= 1
              ? `宇宙の年齢（約138億年）の約${formatSignificant(lifetimeVsUniverse, 2)}倍。このくらいの質量の星は、宇宙が誕生してから今までに、まだ1つも主系列の時期を終えていないと考えられます。`
              : `宇宙の年齢（約138億年）の約${formatSignificant(lifetimeVsUniverse * 100, 2)}%。`}
          </p>
          <LogMeter
            value={star.mainSequenceLifetimeYears}
            min={1e6}
            max={1e13}
            marks={[
              { at: 1e10, text: '太陽' },
              { at: UNIVERSE_AGE_YEARS, text: '宇宙年齢', above: true },
            ]}
            label={`主系列寿命のメーター。約${formatYearsJa(star.mainSequenceLifetimeYears)}`}
          />
          <p className="note">中心部で水素をヘリウムに変える核融合を続けられる期間。重い星ほど燃料を激しく使うため、寿命は極端に短くなります。</p>
        </Card>

        <Card title="構成元素（表面の質量比）" tags={['A', 'B']} wide>
          <div className="comp-bar" role="img" aria-label={`水素${formatPercent(c.hydrogen)}、ヘリウム${formatPercent(c.helium)}、その他の元素${formatPercent(c.metals, 2)}`}>
            <span className="comp-h" style={{ width: `${c.hydrogen * 100}%` }} />
            <span className="comp-he" style={{ width: `${c.helium * 100}%` }} />
            <span className="comp-z" style={{ width: `${Math.max(c.metals * 100, 0.8)}%` }} />
          </div>
          <ul className="comp-legend">
            <li><i className="comp-h" />水素 {formatPercent(c.hydrogen)}</li>
            <li><i className="comp-he" />ヘリウム {formatPercent(c.helium)}</li>
            <li><i className="comp-z" />その他の元素 {formatPercent(c.metals, 2)}</li>
          </ul>
          <details className="comp-details">
            <summary>「その他の元素」の内訳と、組成についての注意</summary>
            <ul className="metal-list">
              {c.metalBreakdown.map((e) => (
                <li key={e.symbol}>
                  {e.nameJa}（{e.symbol}）{formatPercent(e.massFraction, 2)}
                </li>
              ))}
              <li>そのほか {formatPercent(Math.max(0, otherMetals), 2)}</li>
            </ul>
            <p className="note">
              金属量 [Fe/H] = {c.metallicityFeH >= 0 ? '+' : ''}{c.metallicityFeH.toFixed(2)}（太陽を0とした対数。+0.3なら重元素が太陽の約2倍）。
            </p>
            <p className="note">
              ここに示すのは<strong>恒星表面（大気）の現在の組成</strong>です。中心部では核融合で水素がヘリウムに変わり続けているので、組成は表面と異なります。
              また、ビッグバン直後の<strong>宇宙初期の組成</strong>は水素 約{Math.round(PRIMORDIAL_COMPOSITION.hydrogen * 100)}%・ヘリウム 約{Math.round(PRIMORDIAL_COMPOSITION.helium * 100)}%で、
              炭素や酸素などの重元素はほとんどありませんでした。重元素は、過去の世代の恒星の内部や超新星爆発などでつくられ、星間ガスに混ざって新しい恒星に取り込まれたものです。
            </p>
          </details>
        </Card>

        <Card title="惑星数" tags={['C']} wide>
          <p className="big-value">{planets.length} 個</p>
          <p className="note">惑星数は観測データをそのまま再現したものではなく、系外惑星研究の知見をもとにした教育用の確率モデルです。</p>
        </Card>
      </div>
    </section>
  );
}
