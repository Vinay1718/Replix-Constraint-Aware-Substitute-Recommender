import { scoreSimilarity } from "../rankingEngine/scorers/similarity.js";
import { clamp01, round4 } from "../rankingEngine/math.js";
import { cosine } from "./cosine.js";

/**
 * Similarity scorer that blends the rule-based score with embedding cosine similarity.
 * vectors: Map<productId, number[]>. Falls back to the plain rule-based result
 * (details.ai.used=false) whenever a vector is missing, so AI can never break ranking.
 * Only RANKING is affected: feasibility is decided before this runs.
 */
export const createEmbeddingSimilarityScorer = ({ vectors, weight = 0.4, base = scoreSimilarity }) => {
  const w = clamp01(weight);
  return (candidate, ctx) => {
    const baseResult = base(candidate, ctx);
    const a = vectors.get(ctx.original.id);
    const b = vectors.get(candidate.product.id);
    if (!a || !b) return { score: baseResult.score, details: { ...baseResult.details, ai: { used: false } } };

    const cos = clamp01(cosine(a, b));
    return {
      score: clamp01((1 - w) * baseResult.score + w * cos),
      details: { ...baseResult.details, basis: "hybrid", ruleScore: round4(baseResult.score), ai: { used: true, cosine: round4(cos), weight: w } },
    };
  };
};
