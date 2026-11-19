import { Recommendation, Order } from "../models/index.js";
import { productRepository } from "../repositories/product.repository.js";
import { recommendationService } from "./recommendation.service.js";

const slim = (p) => ({ _id: p._id, name: p.name, brand: p.brand, category: p.category, price: p.price, attributes: p.attributes, dietaryTags: p.dietaryTags });

export const demoService = {
  // Public: out-of-stock products to try the engine on (at most 2 per category, so the list is varied)
  async examples() {
    const out = await productRepository.list({ match: { isActive: true }, stockFilter: "out", limit: 100 });
    const perCategory = new Map();
    const picked = [];
    for (const p of out) {
      const n = perCategory.get(p.category) ?? 0;
      if (n < 2) { perCategory.set(p.category, n + 1); picked.push(slim(p)); }
    }
    return picked;
  },

  // Public: same engine, rule-based, no login, nothing stored
  recommend: (input) => recommendationService.recommend(null, input, { persist: false }),

  async stats() {
    const [products, categories, outOfStock, accepted, substituteOrders] = await Promise.all([
      productRepository.page({ match: { isActive: true }, skip: 0, limit: 1 }).then((r) => r.total),
      productRepository.distinctCategories().then((c) => c.length),
      productRepository.page({ match: { isActive: true }, stockFilter: "out", skip: 0, limit: 1 }).then((r) => r.total),
      Recommendation.aggregate([{ $unwind: "$items" }, { $match: { "items.decision": "accepted" } }, { $count: "n" }]).then((r) => r[0]?.n ?? 0),
      Order.countDocuments({ status: { $ne: "cancelled" }, "items.substitutedFor.product": { $exists: true } }),
    ]);
    return { products, categories, outOfStock, substitutesAccepted: accepted, ordersWithSubstitutes: substituteOrders };
  },
};
