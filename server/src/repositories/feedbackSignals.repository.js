import { Feedback } from "../models/index.js";

export const feedbackSignalsRepository = {
  // Average rating and count per substitute product (all users)
  ratingsFor: (productIds) =>
    Feedback.aggregate([
      { $match: { substituteProduct: { $in: productIds } } },
      { $group: { _id: "$substituteProduct", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]),
};
