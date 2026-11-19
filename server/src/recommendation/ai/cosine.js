// Cosine similarity of two equal-length numeric vectors. 0 when either is zero/invalid.
export const cosine = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  const c = dot / (Math.sqrt(na) * Math.sqrt(nb));
  return Number.isFinite(c) ? Math.max(-1, Math.min(1, c)) : 0;
};
