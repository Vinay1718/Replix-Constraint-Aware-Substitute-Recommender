import { analyticsRepository as repo } from "../repositories/analytics.repository.js";
import { orderRepository } from "../repositories/order.repository.js";
import { productRepository } from "../repositories/product.repository.js";

const countProducts = async (stockFilter, isActive = true) =>
  (await productRepository.page({ match: { isActive }, stockFilter, skip: 0, limit: 1 })).total;

const named = (rows, extra) => rows.map((r) => ({ productId: r._id, name: r.p?.[0]?.name ?? "(deleted product)", brand: r.p?.[0]?.brand ?? "", ...extra(r) }));

export const analyticsService = {
  async overview() {
    const [active, out, low, inactive, users, runs, emptyRuns, decisions, rejections, versions, topSub, requested, feedback, orders] = await Promise.all([
      countProducts(undefined), countProducts("out"), countProducts("low"), countProducts(undefined, false),
      repo.userCount(), repo.runCount(), repo.emptyRunCount(), repo.decisionTotals(), repo.rejectionTotals(),
      repo.engineVersions(), repo.topSubstitutes(), repo.mostRequested(), repo.feedbackTotals(), orderRepository.analytics(),
    ]);
    const decided = decisions.accepted + decisions.rejected;
    return {
      products: { active, inactive, outOfStock: out, lowStock: low },
      users,
      recommendations: {
        runs,
        runsWithNoResults: emptyRuns,
        noResultRate: runs ? Math.round((emptyRuns / runs) * 1000) / 1000 : null,
        decisions,
        acceptanceRate: decided ? Math.round((decisions.accepted / decided) * 1000) / 1000 : null,
        engineVersions: versions.map((v) => ({ version: v._id, runs: v.count })),
      },
      constraints: rejections,
      topSubstitutes: named(topSub, (r) => ({ accepted: r.accepted, rejected: r.rejected })),
      mostRequested: named(requested, (r) => ({ requests: r.requests })),
      feedback,
      orders,
    };
  },
};
