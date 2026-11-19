import { PASS, fail } from "./result.js";
export const stockRule = {
  name: "stock",
  check(product, { quantity }) {
    if (product.isActive === false) return fail("inactive");
    const stock = Number.isFinite(product.stock) ? product.stock : 0;
    if (stock <= 0) return fail("out_of_stock");
    if (stock < quantity) return fail("insufficient_stock");
    return PASS;
  },
};
