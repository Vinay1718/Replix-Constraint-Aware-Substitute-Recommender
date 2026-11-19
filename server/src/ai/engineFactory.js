import { env } from "../config/env.js";
import { ENGINE_VERSIONS } from "../constants/index.js";
import { feedbackSignalsRepository } from "../repositories/feedbackSignals.repository.js";
import { recommendationRepository } from "../repositories/recommendation.repository.js";
import { buildSignals, createEmbeddingSimilarityScorer, createLearnedPreferenceScorer, createRankingEngine } from "../recommendation/index.js";
import { toObjectId } from "../utils/objectId.js";
import { embeddingService } from "./embedding.service.js";

/**
 * Chooses the ranking engine for one request.
 * AI_ENABLED=false -> plain rule-based engine.
 * AI_ENABLED=true  -> hybrid engine (embeddings + learning). Each AI part degrades
 * independently: if loading vectors or history fails, that part is skipped and the
 * request still succeeds. AI never touches constraints (they ran before ranking).
 */
export const buildRankingEngine = async ({ userId, originalId, candidateIds, topN }) => {
  const config = topN ? { topN } : undefined;
  if (!env.AI_ENABLED || !userId) return { engine: createRankingEngine({ config }), version: ENGINE_VERSIONS.RULE_BASED, ai: { enabled: false } };

  const used = { embeddings: false, learning: false };
  const options = { config };

  try {
    const vectors = await embeddingService.loadVectors([originalId, ...candidateIds]);
    if (vectors.size > 0) {
      options.similarityScorer = createEmbeddingSimilarityScorer({ vectors, weight: env.AI_SIMILARITY_WEIGHT });
      used.embeddings = true;
    }
  } catch (err) {
    console.warn("AI embeddings unavailable, using rule-based similarity:", err.message);
  }

  try {
    const originalOid = toObjectId(originalId);
    const candidateOids = candidateIds.map(toObjectId).filter(Boolean);
    const [userDecisions, ratings, pairs] = await Promise.all([
      recommendationRepository.userDecisionsWithBrand(userId),
      feedbackSignalsRepository.ratingsFor(candidateOids),
      recommendationRepository.pairOutcomes(originalOid),
    ]);
    const signals = buildSignals({
      userDecisions,
      ratings: ratings.map((r) => ({ productId: r._id, avg: r.avg, count: r.count })),
      pairs: pairs.map((p) => ({ substituteId: p._id, accepted: p.accepted, rejected: p.rejected })),
    });
    options.preferenceScorer = createLearnedPreferenceScorer({ signals, weight: env.AI_LEARNING_WEIGHT });
    used.learning = true;
  } catch (err) {
    console.warn("AI learning signals unavailable, using rule-based preferences:", err.message);
  }

  const anyAi = used.embeddings || used.learning;
  return {
    engine: createRankingEngine(options),
    version: anyAi ? ENGINE_VERSIONS.HYBRID : ENGINE_VERSIONS.RULE_BASED,
    ai: { enabled: true, ...used },
  };
};
