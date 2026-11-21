// 履歴・お気に入り・観測記録の保存（localStorage）。読み書きに失敗してもアプリは動き続ける。
import type { SpectralClass, StarSystem } from '../types';
import { SPECTRAL_CLASSES } from '../types';

export const HISTORY_LIMIT = 10;

const KEYS = {
  history: 'stellar-observatory:history:v1',
  favorites: 'stellar-observatory:favorites:v1',
  tally: 'stellar-observatory:tally:v1',
} as const;

export interface HistoryEntry {
  system: StarSystem;
  viewedAt: number;
}

export interface FavoriteRecord {
  /** 恒星ID */
  id: string;
  seed: string;
  /** 恒星画像（PNGのdata URL） */
  imageDataUrl: string | null;
  savedAt: number;
  /** スペクトル型・恒星物理量・惑星システムを含む完全なデータ */
  system: StarSystem;
}

export type Tally = Record<SpectralClass, number>;

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 容量超過・プライベートモード等。保存できなくても表示は続ける
  }
}

function isStarSystem(value: unknown): value is StarSystem {
  const v = value as StarSystem | null;
  return !!v && typeof v.seed === 'string' && typeof v.id === 'string' && !!v.star && Array.isArray(v.planets);
}

// ---------------------------------------------------------------- 履歴

/** 先頭に追加し、同じseedの重複を除いて最大件数に切り詰める（純粋関数） */
export function addToHistory(history: HistoryEntry[], system: StarSystem, now = Date.now()): HistoryEntry[] {
  return [{ system, viewedAt: now }, ...history.filter((h) => h.system.seed !== system.seed)].slice(0, HISTORY_LIMIT);
}

export function loadHistory(): HistoryEntry[] {
  const data = readJson(KEYS.history);
  if (!Array.isArray(data)) return [];
  return data.filter((h): h is HistoryEntry => isStarSystem(h?.system)).slice(0, HISTORY_LIMIT);
}

export function saveHistory(history: HistoryEntry[]): void {
  writeJson(KEYS.history, history.slice(0, HISTORY_LIMIT));
}

// ---------------------------------------------------------------- お気に入り

export function createFavoriteRecord(system: StarSystem, imageDataUrl: string | null, now = Date.now()): FavoriteRecord {
  return { id: system.id, seed: system.seed, imageDataUrl, savedAt: now, system };
}

export function loadFavorites(): FavoriteRecord[] {
  const data = readJson(KEYS.favorites);
  if (!Array.isArray(data)) return [];
  return data.filter((f): f is FavoriteRecord => typeof f?.id === 'string' && isStarSystem(f.system));
}

export function saveFavorites(favorites: FavoriteRecord[]): void {
  writeJson(KEYS.favorites, favorites);
}

// ---------------------------------------------------------------- 観測記録（型ごとの生成回数）

export function emptyTally(): Tally {
  return Object.fromEntries(SPECTRAL_CLASSES.map((c) => [c, 0])) as Tally;
}

export function loadTally(): Tally {
  const data = readJson(KEYS.tally) as Partial<Tally> | null;
  const tally = emptyTally();
  if (data && typeof data === 'object') {
    for (const c of SPECTRAL_CLASSES) {
      const n = data[c];
      if (typeof n === 'number' && Number.isFinite(n) && n >= 0) tally[c] = Math.floor(n);
    }
  }
  return tally;
}

export function saveTally(tally: Tally): void {
  writeJson(KEYS.tally, tally);
}
