import { normalizeTag } from "./dietary.js";

/**
 * EngineProduct: { id, name, brand, category, price, attributes, dietaryTags, isActive, stock }
 * Requirements: { maxBudget, sameCategoryOnly, organicOnly, dietaryRestrictions, requiredAttributes, preferredBrands }
 *   HARD: maxBudget, sameCategoryOnly, organicOnly, dietaryRestrictions, requiredAttributes
 *   SOFT: preferredBrands (ranking only)
 * Candidate: { product, origin: "label"|"category", label: {relationType, similarityScore, source}|null }
 */

// Order matters: a rejected candidate is attributed to the FIRST rule it fails.
export const REJECTION_RULES = Object.freeze(["stock", "category", "budget", "dietary", "organic", "attributes"]);

export class EngineInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "EngineInputError";
  }
}

export const DEFAULT_REQUIREMENTS = Object.freeze({
  maxBudget: null,
  sameCategoryOnly: true,
  organicOnly: false,
  dietaryRestrictions: Object.freeze([]),
  preferredBrands: Object.freeze([]),
  requiredAttributes: Object.freeze({}),
});

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

const readBoolean = (input, key, fallback) => {
  const value = input[key];
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new EngineInputError(`requirements.${key} must be true or false`);
  return value;
};
const readStrings = (input, key) => {
  const value = input[key];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((x) => typeof x !== "string")) {
    throw new EngineInputError(`requirements.${key} must be an array of strings`);
  }
  return value;
};

// Hard constraints FAIL CLOSED: malformed values throw instead of being ignored.
export const normalizeRequirements = (raw) => {
  const input = raw ?? {};
  if (!isPlainObject(input)) throw new EngineInputError("requirements must be an object");

  const maxBudget = input.maxBudget ?? null;
  if (maxBudget !== null && (typeof maxBudget !== "number" || !Number.isFinite(maxBudget) || maxBudget < 0)) {
    throw new EngineInputError("requirements.maxBudget must be a number >= 0 or null");
  }
  const requiredAttributes = input.requiredAttributes ?? {};
  if (!isPlainObject(requiredAttributes)) throw new EngineInputError("requirements.requiredAttributes must be an object");

  const dietaryRestrictions = [...new Set(readStrings(input, "dietaryRestrictions").map(normalizeTag).filter(Boolean))];
  const brands = new Map();
  for (const b of readStrings(input, "preferredBrands")) {
    const trimmed = b.trim();
    if (trimmed && !brands.has(trimmed.toLowerCase())) brands.set(trimmed.toLowerCase(), trimmed);
  }

  return {
    maxBudget,
    sameCategoryOnly: readBoolean(input, "sameCategoryOnly", DEFAULT_REQUIREMENTS.sameCategoryOnly),
    organicOnly: readBoolean(input, "organicOnly", DEFAULT_REQUIREMENTS.organicOnly),
    dietaryRestrictions,
    preferredBrands: [...brands.values()],
    requiredAttributes: { ...requiredAttributes },
  };
};
