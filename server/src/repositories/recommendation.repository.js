import { Recommendation } from "../models/index.js";
import { DECISIONS } from "../constants/index.js";

export const recommendationRepository = {
  create: (data) => Recommendation.create(data),

  findLatestOffering: ({ user, originalProduct, substituteProduct }) =>
    Recommendation.findOne({ user, originalProduct, "items.product": substituteProduct }).sort({ createdAt: -1 }).select("_id").lean(),

  // Records accept/reject on the most recent run that offered this substitute
  recordDecision: ({ user, originalProduct, substituteProduct, decision }) =>
    Recommendation.findOneAndUpdate(
      { user, originalProduct, "items.product": substituteProduct },
      { $set: { "items.$[el].decision": decision, "items.$[el].decidedAt": new Date() } },
      { arrayFilters: [{ "el.product": substituteProduct }], sort: { createdAt: -1 }, new: true }
    ).select("_id").lean(),

  // Decided items from this user's last runs, with the substitute's brand (learning signal)
  userDecisionsWithBrand: (user, runs = 200) =>
    Recommendation.aggregate([
      { $match: { user } },
      { $sort: { createdAt: -1 } },
      { $limit: runs },
      { $unwind: "$items" },
      { $match: { "items.decision": { $ne: DECISIONS.PENDING } } },
      { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "p" } },
      { $project: { _id: 0, decision: "$items.decision", brand: { $arrayElemAt: ["$p.brand", 0] } } },
    ]),

  // Accepted / rejected counts per substitute for one original (all users)
  pairOutcomes: (originalProduct) =>
    Recommendation.aggregate([
      { $match: { originalProduct } },
      { $unwind: "$items" },
      { $match: { "items.decision": { $ne: DECISIONS.PENDING } } },
      {
        $group: {
          _id: "$items.product",
          accepted: { $sum: { $cond: [{ $eq: ["$items.decision", DECISIONS.ACCEPTED] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$items.decision", DECISIONS.REJECTED] }, 1, 0] } },
        },
      },
    ]),
};
