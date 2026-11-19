import { missingRestrictions } from "../../dietary.js";
import { PASS, fail } from "./result.js";
export const dietaryRule = {
  name: "dietary",
  check(product, { requirements }) {
    if (requirements.dietaryRestrictions.length === 0) return PASS;
    const missing = missingRestrictions(product, requirements.dietaryRestrictions);
    return missing.length === 0 ? PASS : fail(`missing:${missing.join(",")}`);
  },
};
