import { EngineInputError, normalizeRequirements } from "../contracts.js";
import { clamp01, round4 } from "./math.js";
import { scorePreference } from "./scorers/preference.js";
import { scoreSimilarity } from "./scorers/similarity.js";
import { resolveRankingConfig, validateTopN } from "./weights.js";

const compare = (a, b) => (a === b ? 0 : a < b ? -1 : 1);
const priceKey = (p) => (Number.isFinite(p.price) ? p.price : Infinity);

const readScore = (result, scorerName) => {
  if (result === null || typeof result !== "object" || !Number.isFinite(result.score)) {
    throw new EngineInputError(`${scorerName} scorer must return { score } with a finite number`);
  }
  return { score: round4(clamp01(result.score)), details: result.details ?? null };
};

/**
 * Orders FEASIBLE candidates. Never adds, removes or re-checks constraints.
 * similarityScorer / preferenceScorer are the AI hooks: (candidate, ctx) => { score, details }
 */
export const createRankingEngine = ({ config, similarityScorer = scoreSimilarity, preferenceScorer = scorePreference } = {}) => {
  const resolved = resolveRankingConfig(config);
  return {
    config: resolved,
    rank({ original, feasible, requirements, quantity = 1, topN = resolved.topN }) {
      if (!original || typeof original !== "object") throw new EngineInputError("original product is required");
      if (!Array.isArray(feasible)) throw new EngineInputError("feasible must be an array");
      if (!Number.isInteger(quantity) || quantity < 1) throw new EngineInputError("quantity must be a whole number >= 1");
      validateTopN(topN);

      const normalized = normalizeRequirements(requirements);
      const base = { original, requirements: normalized, quantity };
      const { finalWeights } = resolved;

      const scored = feasible.map((candidate) => {
        const sim = readScore(similarityScorer(candidate, { ...base, weights: resolved.similarityWeights }), "similarity");
        const pref = readScore(preferenceScorer(candidate, { ...base, weights: resolved.preferenceWeights }), "preference");
        return {
          product: candidate.product,
          origin: candidate.origin,
          label: candidate.label,
          similarityScore: sim.score,
          preferenceScore: pref.score,
          finalScore: round4(clamp01(finalWeights.similarity * sim.score + finalWeights.preference * pref.score)),
          breakdown: { similarity: sim.details, preference: pref.details },
        };
      });

      scored.sort(
        (a, b) =>
          compare(b.finalScore, a.finalScore) ||
          compare(b.similarityScore, a.similarityScore) ||
          compare(priceKey(a.product), priceKey(b.product)) ||
          compare(a.product.name, b.product.name) ||
          compare(a.product.id, b.product.id)
      );

      const ranked = scored.slice(0, topN).map((item, i) => ({ rank: i + 1, ...item }));
      return { ranked, meta: { evaluated: feasible.length, returned: ranked.length, topN, weights: finalWeights } };
    },
  };
};

export { DEFAULT_RANKING_CONFIG, MAX_TOP_N, resolveRankingConfig } from "./weights.js";
export { nameSimilarity, nameTokens } from "./text.js";
