import { PASS, fail } from "./result.js";
const norm = (s) => String(s ?? "").trim().toLowerCase();
export const categoryRule = {
  name: "category",
  check(product, { original, requirements }) {
    if (!requirements.sameCategoryOnly) return PASS;
    return norm(product.category) === norm(original.category) ? PASS : fail("different_category");
  },
};
