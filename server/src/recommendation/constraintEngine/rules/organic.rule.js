import { PASS, fail } from "./result.js";
export const organicRule = {
  name: "organic",
  check(product, { requirements }) {
    if (!requirements.organicOnly) return PASS;
    return product.attributes?.organic === true ? PASS : fail("not_organic");
  },
};
