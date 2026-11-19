// Dependency-free "embedding": hashed word unigrams + character trigrams, L2-normalized.
// Captures lexical/morphological overlap (e.g. "Oat Milk" ~ "Almond Milk"), NOT true semantics.
// Use the openai provider for real semantic vectors.
const DIM = 256;

const fnv1a = (str) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

export const embedLocal = (text) => {
  const v = new Array(DIM).fill(0);
  const words = String(text).toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);
  for (const w of words) {
    v[fnv1a(`w:${w}`) % DIM] += 2; // whole words matter more than fragments
    const padded = `^${w}$`;
    for (let i = 0; i + 3 <= padded.length; i++) v[fnv1a(`t:${padded.slice(i, i + 3)}`) % DIM] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return norm === 0 ? v : v.map((x) => x / norm);
};

export const localProvider = {
  name: "local-hash",
  model: "local-hash-256",
  async embed(texts) {
    return texts.map(embedLocal);
  },
};
