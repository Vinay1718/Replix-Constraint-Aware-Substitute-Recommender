import { EngineInputError, normalizeRequirements } from "../contracts.js";
import { attributesRule } from "./rules/attributes.rule.js";
import { budgetRule } from "./rules/budget.rule.js";
import { categoryRule } from "./rules/category.rule.js";
import { dietaryRule } from "./rules/dietary.rule.js";
import { organicRule } from "./rules/organic.rule.js";
import { stockRule } from "./rules/stock.rule.js";

export const RULES = Object.freeze([stockRule, categoryRule, budgetRule, dietaryRule, organicRule, attributesRule]);
export { stockRule, categoryRule, budgetRule, dietaryRule, organicRule, attributesRule };

/** Splits candidates into feasible / rejected. Pure; rule-based only (no AI here). */
export const applyConstraints = ({ candidates, original, requirements, quantity = 1, rules = RULES }) => {
  if (!original || typeof original !== "object") throw new EngineInputError("original product is required");
  if (!Number.isInteger(quantity) || quantity < 1) throw new EngineInputError("quantity must be a whole number >= 1");

  const normalized = normalizeRequirements(requirements);
  const ctx = Object.freeze({ original, requirements: normalized, quantity });

  const rejectedBy = Object.fromEntries(rules.map((rule) => [rule.name, 0]));
  const feasible = [];
  const rejected = [];

  for (const candidate of candidates) {
    let failure = null;
    for (const rule of rules) {
      const result = rule.check(candidate.product, ctx);
      if (!result.passed) { failure = { rule: rule.name, reason: result.reason }; break; }
    }
    if (failure) { rejected.push({ candidate, ...failure }); rejectedBy[failure.rule] += 1; }
    else feasible.push(candidate);
  }

  return {
    feasible,
    rejected,
    requirements: normalized,
    stats: { candidatesEvaluated: candidates.length, candidatesRejected: rejected.length, rejectedBy },
  };
};
