import { useState } from 'react';
import type { Planet, StarSystem } from '../types';
import { PLANET_TYPES, TEMPERATURE_CLASSES } from '../data/planetModel';
import { planetDiskFraction } from '../render/planetSprite';
import { formatInteger, formatPeriod, formatSignificant } from '../utils/format';
import { PlanetSprite } from './Sprites';

/** 系外惑星の慣習的な名前：恒星名 + b, c, d ... */
export function planetLetter(index: number): string {
  return String.fromCharCode('a'.charCodeAt(0) + index);
}

/** 一覧で表示する惑星の円盤の直径 [px]。実際の比率ではなく見やすさ優先（平方根で圧縮） */
function listDiameter(radiusEarth: number): number {
  return Math.min(92, 22 + 16 * Math.sqrt(radiusEarth));
}

function OrbitRuler({ system, activeIndex, onPick }: { system: StarSystem; activeIndex: number | null; onPick: (i: number) => void }) {
  const { planets, zones } = system;
  const orbits = planets.map((p) => p.orbitAU);
  const lo = Math.min(...orbits, zones.habitableInnerAU) / 2;
  const hi = Math.max(...orbits, zones.snowLineAU) * 2;
  const W = 1000;
  const x = (a: number) => 40 + ((Math.log10(a) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (W - 70);
  const ticks: number[] = [];
  for (let e = Math.ceil(Math.log10(lo)); e <= Math.floor(Math.log10(hi)); e++) ticks.push(10 ** e);

  return (
    <svg className="orbit-ruler" viewBox={`0 0 ${W} 86`} role="img" aria-label="恒星からの距離（対数目盛り）とハビタブルゾーン・スノーラインの位置">
      <rect x={0} y={14} width={22} height={40} rx={4} fill={system.star.appearance.baseColor} opacity={0.9} />
      <rect x={x(zones.habitableInnerAU)} y={18} width={Math.max(2, x(zones.habitableOuterAU) - x(zones.habitableInnerAU))} height={32} className="hz-band" />
      <text x={(x(zones.habitableInnerAU) + x(zones.habitableOuterAU)) / 2} y={12} textAnchor="middle" className="svg-label tiny hz-text">ハビタブルゾーン</text>
      <line x1={x(zones.snowLineAU)} x2={x(zones.snowLineAU)} y1={14} y2={56} className="snow-line" />
      <text x={x(zones.snowLineAU)} y={68} textAnchor="middle" className="svg-label tiny snow-text">スノーライン</text>
      <line x1={30} x2={W - 20} y1={34} y2={34} className="ruler-axis" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={30} y2={38} className="ruler-tick" />
          <text x={x(t)} y={82} textAnchor="middle" className="svg-label tiny">{t} AU</text>
        </g>
      ))}
      {planets.map((p, i) => (
        <g key={p.index} className={`ruler-planet ${activeIndex === i ? 'active' : ''}`} onClick={() => onPick(i)}>
          <circle cx={x(p.orbitAU)} cy={34} r={activeIndex === i ? 9 : 6} fill={p.appearance.palette[3]} />
          <text x={x(p.orbitAU)} y={i % 2 === 0 ? 24 : 52} textAnchor="middle" className="svg-label tiny planet-letter">{planetLetter(p.index)}</text>
        </g>
      ))}
    </svg>
  );
}

function PlanetDetail({ planet, system }: { planet: Planet; system: StarSystem }) {
  const typeModel = PLANET_TYPES[planet.type];
  const tempLabel = TEMPERATURE_CLASSES.find((c) => c.cls === planet.temperatureClass)?.labelJa ?? '';
  const enlarged = 132 / (2 * planetDiskFraction(planet.appearance));
  return (
    <div className="planet-detail" aria-live="polite">
      <div className="planet-detail-sprite">
        <PlanetSprite appearance={planet.appearance} displaySize={Math.min(enlarged, 264)} label={`惑星${planet.index}の拡大ドット絵`} />
      </div>
      <div className="planet-detail-body">
        <h3>
          惑星{planet.index} <span className="planet-name">（{system.id} {planetLetter(planet.index)}）</span>
        </h3>
        <p className="planet-type-name">{typeModel.nameJa}</p>
        <dl className="planet-facts">
          <div><dt>半径</dt><dd>約{formatSignificant(planet.radiusEarth, 2)} R⊕（地球の約{formatSignificant(planet.radiusEarth, 2)}倍）</dd></div>
          <div><dt>恒星からの距離</dt><dd>約{formatSignificant(planet.orbitAU, 2)} AU</dd></div>
          <div><dt>公転周期</dt><dd>{formatPeriod(planet.periodDays)}</dd></div>
          <div><dt>平衡温度の目安</dt><dd>約{formatInteger(planet.equilibriumTempK)} K（{tempLabel}）</dd></div>
          {planet.inHabitableZone && <div><dt>位置</dt><dd className="hz-text">ハビタブルゾーン内</dd></div>}
        </dl>
        <p className="planet-desc">{planet.description}</p>
        <p className="illustration-note">
          ※ ドット絵は生成モデルにもとづく教育用イラストです。平衡温度は大気の温室効果を考えない目安です。
        </p>
      </div>
    </div>
  );
}

export function PlanetSection({ system }: { system: StarSystem }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const { planets } = system;
  const activeIndex = hovered ?? selected;
  const active = activeIndex !== null ? planets[activeIndex] : null;

  return (
    <section className="panel planet-section" aria-labelledby="planet-title">
      <div className="section-head">
        <h2 id="planet-title">惑星系（{planets.length}個）</h2>
        <p className="section-sub">内側（恒星に近い順）から並べています。惑星にマウスを合わせるか、タップすると詳しく見られます。</p>
      </div>

      {planets.length === 0 ? (
        <p className="empty-note">
          この恒星には惑星が生成されませんでした（このモデルで惑星が0個になる確率は10%です）。
        </p>
      ) : (
        <>
          <div className="orbit-scroll">
            <OrbitRuler system={system} activeIndex={activeIndex} onPick={(i) => setSelected(i)} />
          </div>
          <ol className="planet-row" onMouseLeave={() => setHovered(null)}>
            <li className="row-star" aria-hidden="true" style={{ ['--star-color' as string]: system.star.appearance.baseColor }} />
            {planets.map((p, i) => {
              const d = listDiameter(p.radiusEarth);
              return (
                <li key={p.index}>
                  <button
                    type="button"
                    className={`planet-button ${activeIndex === i ? 'active' : ''}`}
                    aria-pressed={selected === i}
                    aria-label={`惑星${p.index}（${PLANET_TYPES[p.type].nameJa}）`}
                    onMouseEnter={() => setHovered(i)}
                    onFocus={() => setSelected(i)}
                    onClick={() => setSelected(i)}
                  >
                    <span className="planet-sprite-box" style={{ height: 96 }}>
                      <PlanetSprite appearance={p.appearance} displaySize={Math.min(150, d / (2 * planetDiskFraction(p.appearance)))} label={`惑星${p.index}のドット絵`} />
                    </span>
                    <span className="planet-label">
                      <b>{planetLetter(p.index)}</b> {formatSignificant(p.orbitAU, 2)} AU
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {active ? (
            <PlanetDetail planet={active} system={system} />
          ) : (
            <p className="empty-note">惑星を選ぶと、ここに拡大図と詳しいデータが表示されます。</p>
          )}
        </>
      )}
    </section>
  );
}
