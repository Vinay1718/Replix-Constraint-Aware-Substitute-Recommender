import { EngineInputError } from "../contracts.js";

export const DEFAULT_MAX_CANDIDATES = 200;
const REQUIRED = ["getLabels", "getProductsByIds", "getCategoryProducts"];
const compare = (a, b) => (a === b ? 0 : a < b ? -1 : 1);

/** `source` is the data-access port: MongoDB in production, in-memory fakes in tests. */
export const createCandidateGenerator = (source) => {
  for (const method of REQUIRED) {
    if (typeof source?.[method] !== "function") throw new TypeError(`Candidate source must implement ${method}()`);
  }

  return {
    async generate({ original, maxCandidates = DEFAULT_MAX_CANDIDATES }) {
      if (!original?.id) throw new EngineInputError("original product with an id is required");
      if (!Number.isInteger(maxCandidates) || maxCandidates < 1) throw new EngineInputError("maxCandidates must be a whole number >= 1");

      const usable = (p) => Boolean(p) && p.id !== original.id && p.isActive !== false;

      const labelBySubstitute = new Map();
      for (const l of await source.getLabels(original.id)) {
        if (l.substituteId === original.id || labelBySubstitute.has(l.substituteId)) continue;
        labelBySubstitute.set(l.substituteId, { relationType: l.relationType, similarityScore: l.similarityScore ?? null, source: l.source });
      }

      const [labeledProducts, categoryProducts] = await Promise.all([
        source.getProductsByIds([...labelBySubstitute.keys()]),
        source.getCategoryProducts(original.category, original.id, maxCandidates),
      ]);
      const labeledById = new Map(labeledProducts.filter(usable).map((p) => [p.id, p]));

      const labeled = [...labelBySubstitute.entries()]
        .filter(([id]) => labeledById.has(id))
        .map(([id, label]) => ({ product: labeledById.get(id), origin: "label", label }))
        .sort((a, b) => compare(b.label.similarityScore ?? -1, a.label.similarityScore ?? -1) || compare(a.product.id, b.product.id));

      const priceGap = (p) => (Number.isFinite(p.price) ? Math.abs(p.price - original.price) : Infinity);
      const seen = new Set(labeledById.keys());
      const fallback = [];
      for (const p of categoryProducts) {
        if (!usable(p) || seen.has(p.id)) continue;
        seen.add(p.id);
        fallback.push({ product: p, origin: "category", label: null });
      }
      fallback.sort((a, b) => compare(priceGap(a.product), priceGap(b.product)) || compare(a.product.name, b.product.name) || compare(a.product.id, b.product.id));

      const candidates = [...labeled, ...fallback].slice(0, maxCandidates);
      const labeledCount = candidates.filter((c) => c.origin === "label").length;
      return { candidates, meta: { labeled: labeledCount, fromCategory: candidates.length - labeledCount } };
    },
  };
};
