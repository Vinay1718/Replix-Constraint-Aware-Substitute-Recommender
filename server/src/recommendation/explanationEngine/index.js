import { normalizeRequirements } from "../contracts.js";
import { stockRule, categoryRule, budgetRule, dietaryRule, organicRule } from "../constraintEngine/index.js";
import { norm } from "../rankingEngine/text.js";

const DIET_LABEL = new Map([
  ["vegan", "Vegan-friendly"],
  ["vegetarian", "Vegetarian-friendly"],
  ["gluten-free", "Gluten-free"],
  ["lactose-free", "Lactose-free"],
  ["nut-free", "Nut-free"],
]);

const cents = (n) => Math.round(n * 100);
const passes = (rule, product, ctx) => rule.check(product, ctx).passed === true;

/**
 * Builds explanationTags + a readable sentence from VERIFIED facts only.
 * Constraint tags are re-checked against the real rules, so a tag can never
 * claim something the product does not satisfy. Score tags need real scores.
 * AI tags appear only when the scorers actually reported AI evidence.
 */
export const buildExplanation = ({ original, item, requirements, quantity = 1 }) => {
  const reqs = normalizeRequirements(requirements);
  const ctx = { original, requirements: reqs, quantity };
  const p = item.product;
  const tags = [];
  const add = (t) => { if (!tags.includes(t)) tags.push(t); };

  // ---- hard constraints (verified) ----
  if (passes(stockRule, p, ctx)) add(quantity > 1 ? "Enough stock for your order" : "In stock");
  if (reqs.maxBudget !== null && passes(budgetRule, p, ctx)) add("Within budget");
  if (norm(p.category) === norm(original.category) && passes(categoryRule, p, ctx)) add("Same category");
  for (const r of reqs.dietaryRestrictions) {
    const single = { ...ctx, requirements: { ...reqs, dietaryRestrictions: [r] } };
    if (passes(dietaryRule, p, single)) add(DIET_LABEL.get(r) ?? `${r}`);
  }
  if (reqs.organicOnly && passes(organicRule, p, ctx)) add("Organic");
  else if (!reqs.organicOnly && p.attributes?.organic === true && original.attributes?.organic === true) add("Organic match");

  // ---- soft facts ----
  if (reqs.preferredBrands.map(norm).includes(norm(p.brand))) add("Preferred brand");
  if (Number.isFinite(p.price) && Number.isFinite(original.price)) {
    if (cents(p.price) < cents(original.price)) add("Lower price");
    else if (cents(p.price) === cents(original.price)) add("Same price");
  }
  if (item.label?.source === "admin") add("Curated by admin");
  if (item.similarityScore >= 0.85) add("Very similar product");
  if (item.rank === 1) add("Closest match");

  // ---- AI evidence (only when reported) ----
  const ai = item.breakdown?.similarity?.ai;
  if (ai?.used && ai.cosine >= 0.8) add("Semantically similar");
  const learned = item.breakdown?.preference?.learned;
  if (learned?.used) {
    if (learned.rating && learned.rating.count >= 3 && learned.rating.avg >= 4) add("Highly rated by shoppers");
    if (learned.brandAffinity !== null && learned.brandAffinity !== undefined && learned.brandAffinity > 0.3) add("Matches your past choices");
    if (learned.pair && learned.pair.accepted > learned.pair.rejected && learned.pair.accepted >= 2) add("Often accepted for this product");
  }

  // ---- sentence ----
  const pct = (n) => `${Math.round(n * 100)}%`;
  const clauses = [];
  const musts = [];
  if (reqs.maxBudget !== null) musts.push("your budget");
  if (reqs.sameCategoryOnly) musts.push("the same category");
  if (reqs.dietaryRestrictions.length) musts.push(`your dietary needs (${reqs.dietaryRestrictions.join(", ")})`);
  if (reqs.organicOnly) musts.push("organic only");
  clauses.push(
    musts.length
      ? `${p.name} is available and meets ${musts.join(", ")}.`
      : `${p.name} is available.`
  );
  clauses.push(`It is a ${pct(item.similarityScore)} match to ${original.name}${item.label?.source === "admin" ? " (curated by an admin)" : ""}.`);
  const extras = [];
  if (tags.includes("Preferred brand")) extras.push(`it is from a brand you prefer (${p.brand})`);
  if (tags.includes("Lower price")) extras.push(`it costs less ($${p.price.toFixed(2)} vs $${original.price.toFixed(2)})`);
  if (tags.includes("Matches your past choices")) extras.push("it resembles substitutes you accepted before");
  if (tags.includes("Highly rated by shoppers")) extras.push("other shoppers rated it highly");
  if (extras.length) clauses.push(`Also, ${extras.join(" and ")}.`);

  return {
    tags,
    explanation: clauses.join(" "),
    // Facts handed to the optional LLM rewriter: it may rephrase these, never add to them
    facts: {
      original: original.name,
      substitute: p.name,
      brand: p.brand,
      price: p.price,
      originalPrice: original.price,
      similarityPercent: Math.round(item.similarityScore * 100),
      rank: item.rank,
      tags,
    },
  };
};
