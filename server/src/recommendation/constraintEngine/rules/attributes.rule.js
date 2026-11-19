import { PASS, fail } from "./result.js";
const same = (a, b) =>
  typeof a === "string" && typeof b === "string" ? a.trim().toLowerCase() === b.trim().toLowerCase() : a === b;
export const attributesRule = {
  name: "attributes",
  check(product, { requirements }) {
    for (const [key, wanted] of Object.entries(requirements.requiredAttributes)) {
      const actual = Object.hasOwn(product.attributes ?? {}, key) ? product.attributes[key] : undefined;
      if (!same(actual, wanted)) return fail(`attribute_mismatch:${key}`);
    }
    return PASS;
  },
};
