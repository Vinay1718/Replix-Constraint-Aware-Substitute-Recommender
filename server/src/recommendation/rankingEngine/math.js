export const clamp01 = (n) => Math.max(0, Math.min(1, n));
export const round4 = (n) => Math.round(n * 10000) / 10000;

// 1 = identical price. Falls as the gap grows relative to the higher price.
export const priceProximity = (a, b) => {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  const high = Math.max(a, b);
  if (high <= 0) return 1;
  return clamp01(1 - Math.abs(a - b) / high);
};

// parts: { key: number | null }. null = not applicable, excluded from the average.
export const weightedAverage = (parts, weights) => {
  let sum = 0;
  let total = 0;
  for (const [key, value] of Object.entries(parts)) {
    if (value === null) continue;
    sum += weights[key] * value;
    total += weights[key];
  }
  return total > 0 ? sum / total : 0;
};

export const roundAll = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === null ? null : round4(v)]));
