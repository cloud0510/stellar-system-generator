// 恒星アニメーションの再生/停止の設定。OSの「視差効果を減らす」設定がオンなら既定で停止する
import { useCallback, useState } from 'react';

const KEY = 'stellar-observatory:animate:v1';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function loadPreference(): boolean {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'on') return true;
    if (v === 'off') return false;
  } catch {
    // 読めなければ既定値
  }
  return !prefersReducedMotion();
}

export function useMotionPreference(): [boolean, () => void] {
  const [playing, setPlaying] = useState(loadPreference);
  const toggle = useCallback(() => {
    setPlaying((p) => {
      try {
        localStorage.setItem(KEY, p ? 'off' : 'on');
      } catch {
        // 保存できなくても切り替えは効く
      }
      return !p;
    });
  }, []);
  return [playing, toggle];
}
