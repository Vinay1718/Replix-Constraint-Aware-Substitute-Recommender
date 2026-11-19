export { DEFAULT_REQUIREMENTS, EngineInputError, REJECTION_RULES, normalizeRequirements } from "./contracts.js";
export { effectiveTags, missingRestrictions, IMPLIED_TAGS } from "./dietary.js";
export { createCandidateGenerator, DEFAULT_MAX_CANDIDATES } from "./candidateGenerator/index.js";
export { applyConstraints, RULES } from "./constraintEngine/index.js";
export { createRankingEngine, resolveRankingConfig, nameSimilarity, DEFAULT_RANKING_CONFIG, MAX_TOP_N } from "./rankingEngine/index.js";
export { buildExplanation } from "./explanationEngine/index.js";
export { cosine } from "./ai/cosine.js";
export { createEmbeddingSimilarityScorer } from "./ai/embeddingScorer.js";
export { buildSignals, createLearnedPreferenceScorer } from "./ai/learning.js";
