// アプリの状態（現在の恒星システム・履歴・お気に入り・観測記録）を管理するフック
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpectralClass, StarSystem } from '../types';
import { generateRandomStarSystem, generateStarSystem, isValidSeed, makeForcedSeed } from '../models/systemGenerator';
import {
  addToHistory,
  createFavoriteRecord,
  loadFavorites,
  loadHistory,
  loadTally,
  saveFavorites,
  saveHistory,
  saveTally,
  emptyTally,
} from '../storage/persistence';
import type { FavoriteRecord, HistoryEntry, Tally } from '../storage/persistence';
import { starImageDataUrl } from '../render/canvas';

const HASH_KEY = 'seed';

export function readSeedFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const seed = params.get(HASH_KEY);
  return seed && isValidSeed(seed) ? seed : null;
}

function writeSeedToHash(seed: string): void {
  try {
    const url = `${window.location.pathname}${window.location.search}#${HASH_KEY}=${encodeURIComponent(seed)}`;
    window.history.replaceState(null, '', url);
  } catch {
    // 履歴APIが使えない環境では何もしない
  }
}

export function useObservatory() {
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [favorites, setFavorites] = useState<FavoriteRecord[]>(() => loadFavorites());
  const [tally, setTally] = useState<Tally>(() => loadTally());
  const [initial] = useState(() => {
    const fromHash = readSeedFromHash();
    return { system: fromHash ? generateStarSystem(fromHash) : generateRandomStarSystem(), fromHash: fromHash !== null };
  });
  const [current, setCurrent] = useState<StarSystem>(initial.system);
  const initialized = useRef(false);

  // 初回表示の恒星も履歴に入れる（ランダム生成なら観測記録にも数える）。StrictModeの二重実行を避ける
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setHistory((h) => addToHistory(h, initial.system));
    if (!initial.fromHash) {
      const cls = initial.system.star.spectralClass;
      setTally((t) => ({ ...t, [cls]: t[cls] + 1 }));
    }
  }, [initial]);

  useEffect(() => saveHistory(history), [history]);
  useEffect(() => saveFavorites(favorites), [favorites]);
  useEffect(() => saveTally(tally), [tally]);
  useEffect(() => writeSeedToHash(current.seed), [current.seed]);

  const show = useCallback((system: StarSystem, { countInTally }: { countInTally: boolean }) => {
    setCurrent(system);
    setHistory((h) => addToHistory(h, system));
    if (countInTally) setTally((t) => ({ ...t, [system.star.spectralClass]: t[system.star.spectralClass] + 1 }));
  }, []);

  /** 「恒星を生成」：固定確率分布による新しい恒星システム */
  const generate = useCallback(() => show(generateRandomStarSystem(), { countInTally: true }), [show]);

  /** 開発者テスト用：型を直接指定（観測記録には数えない） */
  const generateForced = useCallback((cls: SpectralClass) => show(generateStarSystem(makeForcedSeed(cls)), { countInTally: false }), [show]);

  /** seedから再生成 */
  const loadSeed = useCallback(
    (seed: string): boolean => {
      if (!isValidSeed(seed)) return false;
      show(generateStarSystem(seed), { countInTally: false });
      return true;
    },
    [show],
  );

  /** 履歴・お気に入りから復元（保存されたデータをそのまま表示） */
  const restore = useCallback((system: StarSystem) => show(system, { countInTally: false }), [show]);

  const isFavorite = favorites.some((f) => f.id === current.id);

  const toggleFavorite = useCallback(() => {
    setFavorites((favs) =>
      favs.some((f) => f.id === current.id)
        ? favs.filter((f) => f.id !== current.id)
        : [createFavoriteRecord(current, starImageDataUrl(current.star.appearance)), ...favs],
    );
  }, [current]);

  const removeFavorite = useCallback((id: string) => setFavorites((favs) => favs.filter((f) => f.id !== id)), []);

  const resetTally = useCallback(() => setTally(emptyTally()), []);

  return {
    current,
    history,
    favorites,
    tally,
    isFavorite,
    generate,
    generateForced,
    loadSeed,
    restore,
    toggleFavorite,
    removeFavorite,
    resetTally,
  };
}
