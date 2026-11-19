import { feedbackRepository } from "../repositories/feedback.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { recommendationRepository } from "../repositories/recommendation.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { toObjectId } from "../utils/objectId.js";

export const feedbackService = {
  async submit(user, { originalProductId, substituteProductId, rating, comment }) {
    const original = toObjectId(originalProductId);
    const substitute = toObjectId(substituteProductId);
    if (String(original) === String(substitute)) throw ApiError.badRequest("A product cannot be its own substitute.");

    const [o, s] = await Promise.all([productRepository.findById(original), productRepository.findById(substitute)]);
    if (!o || !s) throw ApiError.notFound("Product not found.");

    const run = await recommendationRepository.findLatestOffering({ user: user._id, originalProduct: original, substituteProduct: substitute });
    await feedbackRepository.upsert(
      { user: user._id, originalProduct: original, substituteProduct: substitute },
      { rating, comment, ...(run && { recommendation: run._id }) }
    );
    return { saved: true };
  },

  async adminList({ rating, productId, page, limit }) {
    const match = {};
    if (rating) match.rating = rating;
    if (productId) {
      const oid = toObjectId(productId);
      match.$or = [{ originalProduct: oid }, { substituteProduct: oid }];
    }
    const [items, total, dist] = await Promise.all([
      feedbackRepository.page({ match, skip: (page - 1) * limit, limit }),
      feedbackRepository.count(match),
      feedbackRepository.distribution(match),
    ]);
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let ratingSum = 0;
    for (const { _id, count } of dist) { distribution[_id] = count; ratingSum += _id * count; }
    const counted = Object.values(distribution).reduce((a, b) => a + b, 0);
    return {
      items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)),
      summary: { total: counted, averageRating: counted ? Math.round((ratingSum / counted) * 100) / 100 : null, distribution },
    };
  },
};
