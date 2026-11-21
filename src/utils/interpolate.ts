/** [x, y] の点列（xは昇順）を両対数で区分線形補間する。範囲外は端の値に固定する */
export function logLogInterpolate(points: readonly (readonly [number, number])[], x: number): number {
  if (points.length === 0) throw new Error('logLogInterpolate(): 点列が空です');
  if (x <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    if (x <= x1) {
      const [x0, y0] = points[i - 1];
      const t = (Math.log(x) - Math.log(x0)) / (Math.log(x1) - Math.log(x0));
      return Math.exp(Math.log(y0) + t * (Math.log(y1) - Math.log(y0)));
    }
  }
  return last[1];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}
