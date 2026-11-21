import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom は canvas を実装していないため、描画はスキップし画像は固定のダミーを返す。
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,TEST';

afterEach(() => {
  cleanup();
  localStorage.clear();
});
