import { clamp01, roundAll, weightedAverage } from "../math.js";
import { norm } from "../text.js";

const priceAffinity = (original, product) => {
  const { price } = product;
  const ref = original.price;
  if (!Number.isFinite(price)) return 0;
  if (!Number.isFinite(ref) || ref <= 0) return price <= 0 ? 1 : 0;
  return price <= ref ? 1 : clamp01(1 - (price - ref) / ref);
};
const organicAffinity = (original, product) => {
  const theirs = product.attributes?.organic === true;
  const ours = original.attributes?.organic === true;
  if (theirs === ours) return 1;
  return theirs ? 0.7 : 0;
};
const stockConfidence = (product, quantity) => {
  const stock = Number.isFinite(product.stock) ? product.stock : 0;
  return clamp01(stock / (3 * quantity));
};

/** Soft preferences only. ctx: { original, requirements, quantity, weights } */
export const scorePreference = (candidate, { original, requirements, quantity, weights }) => {
  const product = candidate.product;
  const preferred = new Set(requirements.preferredBrands.map(norm));
  const components = {
    brand: preferred.size === 0 ? null : preferred.has(norm(product.brand)) ? 1 : 0,
    price: priceAffinity(original, product),
    organic: requirements.organicOnly ? null : organicAffinity(original, product),
    stock: stockConfidence(product, quantity),
  };
  return { score: clamp01(weightedAverage(components, weights)), details: { components: roundAll(components) } };
};
