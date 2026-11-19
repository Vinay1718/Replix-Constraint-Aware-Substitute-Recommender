const STOPWORDS = new Set(["of", "the", "and", "with", "for", "pack"]);
export const norm = (s) => String(s ?? "").trim().toLowerCase();
const splitWords = (s) => norm(s).split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);

// The words that say what KIND of product this is (no brand, "organic", stopwords, sizes).
export const nameTokens = (product) => {
  const brandWords = new Set(splitWords(product.brand));
  return splitWords(product.name).filter((t) => !brandWords.has(t) && t !== "organic" && !STOPWORDS.has(t) && !/^\d/.test(t));
};

// Half token overlap (Jaccard), half "same last word" (head noun).
export const nameSimilarity = (a, b) => {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const sa = new Set(ta);
  const sb = new Set(tb);
  let shared = 0;
  for (const t of sa) if (sb.has(t)) shared++;
  const jaccard = shared / (sa.size + sb.size - shared);
  const sameHead = ta[ta.length - 1] === tb[tb.length - 1] ? 1 : 0;
  return 0.5 * jaccard + 0.5 * sameHead;
};
