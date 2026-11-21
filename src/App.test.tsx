import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { generateStarSystem } from './models/systemGenerator';
import { HISTORY_LIMIT, addToHistory, loadFavorites, loadHistory } from './storage/persistence';
import type { HistoryEntry } from './storage/persistence';

/** 惑星を n 個以上もつ seed を探す */
function seedWithPlanets(n: number): string {
  for (let i = 0; ; i++) {
    const seed = `ui-${i}`;
    if (generateStarSystem(seed).planets.length >= n) return seed;
  }
}

function setHashSeed(seed: string | null) {
  window.history.replaceState(null, '', seed ? `/#seed=${encodeURIComponent(seed)}` : '/');
}

beforeEach(() => setHashSeed(null));

describe('メイン画面', () => {
  it('「恒星を生成」で新しい恒星系が表示される', () => {
    render(<App />);
    const before = screen.getByTestId('current-seed').textContent;
    fireEvent.click(screen.getByRole('button', { name: '恒星を生成' }));
    const after = screen.getByTestId('current-seed').textContent;
    expect(after).not.toBe(before);
    expect(screen.getByRole('heading', { level: 2, name: /主系列星/ })).toBeInTheDocument();
    for (const label of ['表面温度', '質量', '半径', '主系列寿命', '構成元素（表面の質量比）', '惑星数']) {
      expect(screen.getByRole('heading', { level: 3, name: label })).toBeInTheDocument();
    }
  });

  it('URLのseedから同じ恒星系が復元される', () => {
    const seed = 'k3j9xz2a';
    setHashSeed(seed);
    render(<App />);
    const expected = generateStarSystem(seed);
    expect(screen.getByTestId('current-seed')).toHaveTextContent(seed);
    expect(screen.getByRole('heading', { level: 2, name: new RegExp(expected.star.spectralLabel) })).toBeInTheDocument();
  });

  it('開発者ツールで7つの型を直接指定して生成できる', () => {
    render(<App />);
    for (const cls of ['O', 'B', 'A', 'F', 'G', 'K', 'M']) {
      fireEvent.click(screen.getByRole('button', { name: `${cls}型を生成` }));
      expect(screen.getByTestId('current-seed').textContent).toMatch(new RegExp(`@${cls}$`));
      expect(screen.getByRole('heading', { level: 2, name: new RegExp(`${cls}型主系列星`) })).toBeInTheDocument();
    }
  });
});

describe('惑星のインタラクション', () => {
  it('マウスを合わせると拡大表示と詳しい情報が出る', () => {
    const seed = seedWithPlanets(2);
    setHashSeed(seed);
    render(<App />);
    const system = generateStarSystem(seed);
    const buttons = screen.getAllByRole('button', { name: /^惑星\d+（/ });
    expect(buttons).toHaveLength(system.planets.length);

    fireEvent.mouseEnter(buttons[1]);
    const detail = screen.getByRole('heading', { level: 3, name: /^惑星2/ }).closest('.planet-detail') as HTMLElement;
    expect(detail).toBeInTheDocument();
    expect(within(detail).getByRole('img', { name: '惑星2の拡大ドット絵' })).toBeInTheDocument();
    for (const term of ['半径', '恒星からの距離', '公転周期']) expect(within(detail).getByText(term)).toBeInTheDocument();
    expect(within(detail).getByText(system.planets[1].description)).toBeInTheDocument();
  });

  it('タップ（クリック）でも選択され、マウスが離れても表示が残る', () => {
    const seed = seedWithPlanets(2);
    setHashSeed(seed);
    render(<App />);
    const buttons = screen.getAllByRole('button', { name: /^惑星\d+（/ });
    fireEvent.click(buttons[0]);
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    fireEvent.mouseLeave(buttons[0].closest('ol') as HTMLElement);
    expect(screen.getByRole('heading', { level: 3, name: /^惑星1/ })).toBeInTheDocument();
  });

  it('惑星は内側から外側の順に並ぶ', () => {
    const seed = seedWithPlanets(3);
    setHashSeed(seed);
    render(<App />);
    const labels = screen.getAllByRole('button', { name: /^惑星\d+（/ }).map((b) => b.getAttribute('aria-label'));
    expect(labels.map((l) => Number(l?.match(/^惑星(\d+)/)?.[1]))).toEqual(labels.map((_, i) => i + 1));
  });
});

describe('履歴', () => {
  it(`最大${HISTORY_LIMIT}件まで保持され、クリックで復元できる`, () => {
    render(<App />);
    const generate = screen.getByRole('button', { name: '恒星を生成' });
    for (let i = 0; i < 14; i++) fireEvent.click(generate);
    const list = screen.getByTestId('history-list');
    const items = within(list).getAllByRole('button');
    expect(items).toHaveLength(HISTORY_LIMIT);
    expect(loadHistory()).toHaveLength(HISTORY_LIMIT);

    const oldest = loadHistory()[HISTORY_LIMIT - 1].system;
    fireEvent.click(items[HISTORY_LIMIT - 1]);
    expect(screen.getByTestId('current-seed')).toHaveTextContent(oldest.seed);
  });

  it('同じseedは重複せず先頭に移動する', () => {
    const a = generateStarSystem('a');
    const b = generateStarSystem('b');
    let h: HistoryEntry[] = [];
    h = addToHistory(h, a);
    h = addToHistory(h, b);
    h = addToHistory(h, a);
    expect(h.map((e) => e.system.seed)).toEqual(['a', 'b']);
  });
});

describe('お気に入り', () => {
  it('保存・復元でき、再読み込み後も維持される', () => {
    const seed = seedWithPlanets(1);
    setHashSeed(seed);
    const first = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '☆ お気に入りに保存' }));
    expect(screen.getByRole('button', { name: '★ お気に入り済み' })).toBeInTheDocument();

    const saved = loadFavorites();
    expect(saved).toHaveLength(1);
    const expected = generateStarSystem(seed);
    expect(saved[0].id).toBe(expected.id);
    expect(saved[0].seed).toBe(seed);
    expect(saved[0].imageDataUrl).toMatch(/^data:image\/png/);
    expect(saved[0].system).toEqual(expected); // スペクトル型・物理量・惑星システムを含む

    // 別の恒星に移ってから「再読み込み」
    fireEvent.click(screen.getByRole('button', { name: '恒星を生成' }));
    first.unmount();
    setHashSeed(null);
    render(<App />);

    const favList = screen.getByTestId('favorites-list');
    const favButton = within(favList).getByRole('button', { name: new RegExp(`お気に入りの.*${expected.id}`) });
    fireEvent.click(favButton);
    expect(screen.getByTestId('current-seed')).toHaveTextContent(seed);
    expect(screen.getByRole('heading', { level: 2, name: new RegExp(expected.star.spectralLabel) })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^惑星\d+（/ })).toHaveLength(expected.planets.length);
  });

  it('お気に入りから外せる', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '☆ お気に入りに保存' }));
    fireEvent.click(screen.getByRole('button', { name: /をお気に入りから外す$/ }));
    expect(loadFavorites()).toHaveLength(0);
  });
});

describe('まとめて観測', () => {
  it('1,000個の観測結果の表が表示される', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '1,000個を観測' }));
    const table = screen.getByRole('table');
    expect(within(table).getByText('1,000個の恒星を観測した結果')).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(8);
  });
});

describe('折り畳みパネルとアニメーション', () => {
  it('「このシミュレーションについて」は折り畳み式で、既定では閉じている', () => {
    render(<App />);
    const about = document.getElementById('about') as HTMLDetailsElement;
    expect(about.tagName).toBe('DETAILS');
    expect(about.open).toBe(false);
    expect(within(about).getByRole('heading', { name: 'このシミュレーションについて' })).toBeInTheDocument();
    // フッターのリンクから開ける
    fireEvent.click(screen.getByRole('button', { name: '「このシミュレーションについて」' }));
    expect(about.open).toBe(true);
    // seed 付きURLは書き換わらない
    expect(window.location.hash).toMatch(/^#seed=/);
  });

  it('恒星アニメーションを停止・再生でき、設定は保存される', () => {
    render(<App />);
    const star = screen.getByRole('img', { name: /のアニメーション）$/ });
    expect(star).toHaveAttribute('data-playing', 'true');
    fireEvent.click(screen.getByRole('button', { name: /アニメーション停止/ }));
    expect(star).toHaveAttribute('data-playing', 'false');
    expect(localStorage.getItem('stellar-observatory:animate:v1')).toBe('off');
    fireEvent.click(screen.getByRole('button', { name: /アニメーション再生/ }));
    expect(star).toHaveAttribute('data-playing', 'true');
  });
});
