import { useState } from 'react';
import type { FormEvent } from 'react';
import type { SpectralClass } from '../types';
import { SPECTRAL_TYPE_LIST } from '../data/stellarTypes';

interface Props {
  currentSeed: string;
  onForce: (cls: SpectralClass) => void;
  onLoadSeed: (seed: string) => boolean;
}

/** 開発者・先生向け：型を直接指定した生成と、seed からの再生成 */
export function DevTools({ currentSeed, onForce, onLoadSeed }: Props) {
  const [seedInput, setSeedInput] = useState('');
  const [message, setMessage] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(onLoadSeed(seedInput) ? `seed「${seedInput.trim()}」の恒星系を再生成しました。` : 'seed は英数字（32文字まで）で入力してください。');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage('この恒星系へのリンクをコピーしました。');
    } catch {
      setMessage(`リンク：${window.location.href}`);
    }
  };

  return (
    <details className="panel dev-tools collapsible">
      <summary>
        <h2>seed と開発者・先生向けツール</h2>
      </summary>
      <div className="dev-row">
        <p>
          現在の seed：<code data-testid="current-seed">{currentSeed}</code>{' '}
          <button type="button" className="link-button" onClick={copyLink}>
            共有リンクをコピー
          </button>
        </p>
        <form onSubmit={submit} className="seed-form">
          <label htmlFor="seed-input">seed から再生成</label>
          <input id="seed-input" value={seedInput} onChange={(e) => setSeedInput(e.target.value)} placeholder="例: k3j9xz2a" autoComplete="off" />
          <button type="submit" className="secondary-button">再生成</button>
        </form>
      </div>
      <div className="dev-row">
        <p className="note">
          型を直接指定して生成（物理モデルの確認用）。確率どおりの抽選ではないため、観測数には数えません。seed の末尾に「@型」が付きます。
        </p>
        <div className="force-buttons">
          {SPECTRAL_TYPE_LIST.map((t) => (
            <button key={t.cls} type="button" className="type-button" style={{ ['--type-color' as string]: t.displayColor }} onClick={() => onForce(t.cls)}>
              {t.cls}型を生成
            </button>
          ))}
        </div>
      </div>
      {message && <p className="dev-message" role="status">{message}</p>}
    </details>
  );
}
