import { effectiveTags } from "../../dietary.js";
import { clamp01, priceProximity, roundAll, weightedAverage } from "../math.js";
import { nameSimilarity } from "../text.js";

const sameValue = (a, b) =>
  typeof a === "string" && typeof b === "string" ? a.trim().toLowerCase() === b.trim().toLowerCase() : a === b;

const dietaryRetention = (original, product) => {
  const wanted = effectiveTags(original.dietaryTags);
  if (wanted.size === 0) return 1;
  const have = effectiveTags(product.dietaryTags);
  let kept = 0;
  for (const tag of wanted) if (have.has(tag)) kept++;
  return kept / wanted.size;
};

const attributeMatch = (original, product) => {
  const keys = Object.keys(original.attributes ?? {});
  if (keys.length === 0) return 0.5;
  const theirs = product.attributes ?? {};
  let matches = 0;
  for (const key of keys) if (Object.hasOwn(theirs, key) && sameValue(original.attributes[key], theirs[key])) matches++;
  return matches / keys.length;
};

/** Rule-based similarity: curated label score wins, otherwise computed. ctx: { original, weights } */
export const scoreSimilarity = (candidate, { original, weights }) => {
  const product = candidate.product;
  const components = {
    name: nameSimilarity(original, product),
    dietary: dietaryRetention(original, product),
    attributes: attributeMatch(original, product),
    price: priceProximity(original.price, product.price),
  };
  const computed = clamp01(weightedAverage(components, weights));
  const curated = candidate.label?.similarityScore;
  const isCurated = typeof curated === "number" && Number.isFinite(curated);
  return {
    score: isCurated ? clamp01(curated) : computed,
    details: { basis: isCurated ? "curated" : "computed", computed: Math.round(computed * 10000) / 10000, components: roundAll(components) },
  };
};
