import { EngineInputError } from "../contracts.js";

export const MAX_TOP_N = 50;

export const DEFAULT_RANKING_CONFIG = Object.freeze({
  topN: 5,
  finalWeights: Object.freeze({ similarity: 0.7, preference: 0.3 }),
  similarityWeights: Object.freeze({ name: 0.4, dietary: 0.25, attributes: 0.15, price: 0.2 }),
  preferenceWeights: Object.freeze({ brand: 0.35, price: 0.25, organic: 0.2, stock: 0.2 }),
});

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

const mergeWeights = (label, given, defaults) => {
  if (given !== undefined && !isPlainObject(given)) throw new EngineInputError(`${label} must be an object`);
  const overrides = given ?? {};
  for (const key of Object.keys(overrides)) {
    if (!Object.hasOwn(defaults, key)) throw new EngineInputError(`${label}.${key} is not a known weight`);
  }
  const merged = { ...defaults, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new EngineInputError(`${label}.${key} must be a number >= 0`);
  }
  if (Object.values(merged).every((v) => v === 0)) throw new EngineInputError(`${label} cannot all be 0`);
  return Object.freeze(merged);
};

export const validateTopN = (topN) => {
  if (!Number.isInteger(topN) || topN < 1 || topN > MAX_TOP_N) throw new EngineInputError(`topN must be a whole number between 1 and ${MAX_TOP_N}`);
  return topN;
};

export const resolveRankingConfig = (overrides) => {
  if (overrides !== undefined && overrides !== null && !isPlainObject(overrides)) throw new EngineInputError("ranking config must be an object");
  const input = overrides ?? {};
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(DEFAULT_RANKING_CONFIG, key)) throw new EngineInputError(`ranking config.${key} is not a known option`);
  }
  const final = mergeWeights("finalWeights", input.finalWeights, DEFAULT_RANKING_CONFIG.finalWeights);
  const total = final.similarity + final.preference;
  return Object.freeze({
    topN: validateTopN(input.topN ?? DEFAULT_RANKING_CONFIG.topN),
    finalWeights: Object.freeze({ similarity: final.similarity / total, preference: final.preference / total }),
    similarityWeights: mergeWeights("similarityWeights", input.similarityWeights, DEFAULT_RANKING_CONFIG.similarityWeights),
    preferenceWeights: mergeWeights("preferenceWeights", input.preferenceWeights, DEFAULT_RANKING_CONFIG.preferenceWeights),
  });
};
