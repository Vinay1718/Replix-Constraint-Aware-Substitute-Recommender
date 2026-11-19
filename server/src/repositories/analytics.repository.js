import { DECISIONS } from "../constants/index.js";
import { Feedback, Recommendation, User } from "../models/index.js";

const topProducts = (pipelineTail) => [...pipelineTail, { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "p" } }];

export const analyticsRepository = {
  userCount: () => User.countDocuments({ role: "user" }),
  runCount: () => Recommendation.countDocuments(),
  emptyRunCount: () => Recommendation.countDocuments({ items: { $size: 0 } }),

  async decisionTotals() {
    const rows = await Recommendation.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.decision", count: { $sum: 1 } } },
    ]);
    const out = { pending: 0, accepted: 0, rejected: 0 };
    for (const r of rows) out[r._id] = r.count;
    return out;
  },

  async rejectionTotals() {
    const [r] = await Recommendation.aggregate([
      {
        $group: {
          _id: null,
          evaluated: { $sum: "$stats.candidatesEvaluated" },
          rejected: { $sum: "$stats.candidatesRejected" },
          stock: { $sum: "$stats.rejectedBy.stock" },
          category: { $sum: "$stats.rejectedBy.category" },
          budget: { $sum: "$stats.rejectedBy.budget" },
          dietary: { $sum: "$stats.rejectedBy.dietary" },
          organic: { $sum: "$stats.rejectedBy.organic" },
          attributes: { $sum: "$stats.rejectedBy.attributes" },
        },
      },
    ]);
    const { _id, ...rest } = r ?? {};
    return { evaluated: 0, rejected: 0, stock: 0, category: 0, budget: 0, dietary: 0, organic: 0, attributes: 0, ...rest };
  },

  engineVersions: () => Recommendation.aggregate([{ $group: { _id: "$engineVersion", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),

  topSubstitutes: () =>
    Recommendation.aggregate(
      topProducts([
        { $unwind: "$items" },
        { $match: { "items.decision": { $ne: DECISIONS.PENDING } } },
        {
          $group: {
            _id: "$items.product",
            accepted: { $sum: { $cond: [{ $eq: ["$items.decision", DECISIONS.ACCEPTED] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ["$items.decision", DECISIONS.REJECTED] }, 1, 0] } },
          },
        },
        { $sort: { accepted: -1, rejected: 1 } },
        { $limit: 5 },
      ])
    ),

  mostRequested: () =>
    Recommendation.aggregate(
      topProducts([{ $group: { _id: "$originalProduct", requests: { $sum: 1 } } }, { $sort: { requests: -1 } }, { $limit: 5 }])
    ),

  async feedbackTotals() {
    const [r] = await Feedback.aggregate([{ $group: { _id: null, count: { $sum: 1 }, avg: { $avg: "$rating" } } }]);
    return { count: r?.count ?? 0, averageRating: r ? Math.round(r.avg * 100) / 100 : null };
  },
};
