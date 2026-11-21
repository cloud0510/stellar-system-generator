// 「このシミュレーションについて」で表示する、モデルの各部分の根拠の区分（要件24・29）
import type { Provenance } from '../types';

export const PROVENANCE_LABELS: Record<Provenance, { short: string; long: string }> = {
  A: { short: '観測・文献', long: 'A. 観測・文献に基づくパラメータ' },
  B: { short: '近似モデル', long: 'B. 天文学的知見から導いた近似モデル' },
  C: { short: '教育用の仮定', long: 'C. 本教育アプリ独自の仮定' },
};

export interface ModelAspect {
  id: string;
  title: string;
  items: { provenance: Provenance; text: string }[];
}

export const MODEL_ASPECTS: readonly ModelAspect[] = [
  {
    id: 'spectral-fraction',
    title: '恒星のスペクトル型の割合',
    items: [
      {
        provenance: 'A',
        text: 'O 0.00003%、B 0.13%、A 0.60%、F 3.00%、G 7.60%、K 12.10%、M 76.45% という比率は、太陽近傍の恒星集団の調査をもとにした主系列星の代表的な頻度です（LeDrew 2001 などで紹介されている値）。',
      },
      {
        provenance: 'C',
        text: 'この比率を「天の川銀河全体の恒星分布を体験するための固定モデル」として使っています。銀河全体を直接すべて観測して得た厳密な割合ではありません。合計がちょうど100%にならない丸め誤差は、抽選時に合計で割って正規化しています。',
      },
    ],
  },
  {
    id: 'stellar-physics',
    title: '恒星の物理量（質量・温度・半径・寿命）',
    items: [
      {
        provenance: 'A',
        text: 'OBAFGKM が高温から低温への順であること、各型の温度・質量・半径のおおよその範囲、太陽の値（5772 K など）。',
      },
      {
        provenance: 'B',
        text: '質量を主パラメータとし、主系列星の標準的な関係（Pecaut & Mamajek 2013 などの傾向）をなめらかにつないだ補間表から温度と半径を決めています。光度はシュテファン＝ボルツマンの法則 L = R²T⁴（太陽比）で計算し、寿命は低質量星では t ≈ 100億年 × M/L、大質量星では恒星進化モデルの値を丸めた表から求めています。型の中の質量分布には初期質量関数（Kroupa 2001）の形を使っています。',
      },
      {
        provenance: 'C',
        text: '同じ質量の星の温度・半径の小さなばらつきの大きさ、型の境界を越えないようにする調整、表示用の細分類（M3 など）の割り当て。',
      },
    ],
  },
  {
    id: 'composition',
    title: '構成元素',
    items: [
      {
        provenance: 'A',
        text: '太陽の現在の表面組成（水素 約74%、ヘリウム 約25%、その他 約1.3%：Asplund et al. 2009）。',
      },
      {
        provenance: 'B',
        text: '星ごとの金属量（重元素の量）は太陽近傍の星の典型的な広がり（±0.2桁程度）でばらつかせ、重元素が多いほどヘリウムもやや多くなる関係を使っています。',
      },
    ],
  },
  {
    id: 'planet-count',
    title: '惑星数',
    items: [
      {
        provenance: 'A',
        text: '系外惑星はありふれていて、平均すると恒星1個あたり1個以上の惑星があると考えられています（NASA・ESA の系外惑星観測の成果）。',
      },
      {
        provenance: 'C',
        text: '0〜8個の確率（0個 10%、1個 20%、2個 25%、3個 20%、4個 12%、5個 7%、6個 4%、7個 1.5%、8個 0.5%）は、観測された実際の惑星数分布ではなく、教育用に設定した仮想の分布です。すべてのスペクトル型で同じ分布を使っていますが、実際には O型・B型星のまわりの惑星はほとんど見つかっていません。',
      },
    ],
  },
  {
    id: 'planet-orbit',
    title: '惑星の軌道',
    items: [
      {
        provenance: 'A',
        text: '公転周期はケプラーの第三法則 P² = a³ / M（P:年、a:AU、M:太陽質量）で計算しています。',
      },
      {
        provenance: 'B',
        text: '隣り合う惑星の周期比が 1.3 以上（近すぎると軌道が不安定）、多惑星系では周期比 1.5〜2.5 程度が多い（ケプラー衛星の観測傾向）、恒星に近すぎる場所（恒星内部やダストが蒸発する領域）には置かない、という条件を使っています。ハビタブルゾーンとスノーラインは恒星の光度から目安を計算しています。',
      },
      {
        provenance: 'C',
        text: '最も内側の惑星の位置の範囲、周期比の平均値とばらつき、外側に大きなすき間ができる確率などの具体的な数値。',
      },
    ],
  },
  {
    id: 'planet-type',
    title: '惑星のサイズとタイプ',
    items: [
      {
        provenance: 'A',
        text: '小さな惑星ほど多く、地球の1〜4倍程度のスーパーアース〜ミニネプチューンが最も多く見つかっていること、木星型は少数派であること、金属量の多い星ほど巨大惑星が見つかりやすいこと（Fischer & Valenti 2005）。',
      },
      {
        provenance: 'B',
        text: 'スノーラインの外側で巨大惑星ができやすい、恒星のごく近くの巨大惑星（ホットジュピター）は珍しい、M型星では巨大惑星が少ない、といった傾向を確率の補正として入れています。',
      },
      {
        provenance: 'C',
        text: 'サイズ帯ごとの重みとタイプの抽選確率。「海洋惑星」は理論上の仮説的なタイプです。惑星のドット絵は、タイプ・温度・サイズから作った教育用イラストで、実際の画像ではありません。',
      },
    ],
  },
];

export interface SourceReference {
  label: string;
  detail: string;
  url?: string;
}

export const SOURCES: readonly SourceReference[] = [
  { label: 'OpenStax Astronomy 2e', detail: '第17章「星の光を分析する」、第18章「恒星：天体の国勢調査」、第22章「恒星の青年期から老年期まで」ほか', url: 'https://openstax.org/details/books/astronomy-2e' },
  { label: 'Swinburne University COSMOS', detail: 'Encyclopedia of Astronomy：Spectral Type, Main Sequence など', url: 'https://astronomy.swin.edu.au/cosmos/' },
  { label: 'NASA Science – Exoplanets', detail: '系外惑星の種類（スーパーアース、海王星型など）と発見状況', url: 'https://science.nasa.gov/exoplanets/' },
  { label: 'NASA Exoplanet Archive', detail: '確認された系外惑星のデータベース', url: 'https://exoplanetarchive.ipac.caltech.edu/' },
  { label: 'ESA – Exoplanets', detail: 'ESAの系外惑星ミッション（CHEOPS, PLATO, Ariel など）の解説', url: 'https://www.esa.int/Science_Exploration/Space_Science/Exoplanets' },
  { label: 'LeDrew, G. (2001)', detail: 'The Real Starry Sky, JRASC 95, 32 — 主系列星のスペクトル型の割合' },
  { label: 'Pecaut, M. J. & Mamajek, E. E. (2013)', detail: 'ApJS 208, 9 — 主系列星の温度・色・スペクトル型の標準値' },
  { label: 'Kroupa, P. (2001)', detail: 'MNRAS 322, 231 — 初期質量関数' },
  { label: 'Ekström, S. et al. (2012)', detail: 'A&A 537, A146 — 恒星進化モデル（大質量星の寿命）' },
  { label: 'Laughlin, G., Bodenheimer, P. & Adams, F. C. (1997)', detail: 'ApJ 482, 420 — 低質量星の非常に長い寿命' },
  { label: 'Asplund, M. et al. (2009)', detail: 'ARA&A 47, 481 — 太陽の化学組成' },
  { label: 'Fulton, B. J. et al. (2017)', detail: 'AJ 154, 109 — 小型惑星の半径分布（半径の谷）' },
  { label: 'Weiss, L. M. et al. (2018)', detail: 'AJ 155, 48 — 多惑星系の惑星のサイズと間隔のそろい方' },
  { label: 'Fischer, D. A. & Valenti, J. (2005)', detail: 'ApJ 622, 1102 — 金属量と巨大惑星の頻度' },
  { label: 'Kopparapu, R. K. et al. (2013)', detail: 'ApJ 765, 131 — ハビタブルゾーンの推定' },
  { label: 'Hayashi, C. (1981)', detail: 'Prog. Theor. Phys. Suppl. 70, 35 — 太陽系形成の標準モデルとスノーライン' },
];
