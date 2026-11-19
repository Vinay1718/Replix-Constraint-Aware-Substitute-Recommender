import { PASS, fail } from "./result.js";
const toCents = (n) => Math.round(n * 100);
export const budgetRule = {
  name: "budget",
  check(product, { requirements }) {
    if (requirements.maxBudget === null) return PASS;
    if (!Number.isFinite(product.price)) return fail("invalid_price");
    return toCents(product.price) <= toCents(requirements.maxBudget) ? PASS : fail("over_budget");
  },
};
