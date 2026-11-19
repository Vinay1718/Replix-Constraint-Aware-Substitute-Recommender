import { DEFAULT_LOW_STOCK_THRESHOLD } from "../constants/index.js";
import { ProductStock } from "../models/index.js";

export const stockRepository = {
  create: (data) => ProductStock.create(data),
  async ensure(productId) {
    try {
      await ProductStock.updateOne(
        { product: productId },
        { $setOnInsert: { quantity: 0, lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD } },
        { upsert: true }
      );
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  },
  set: (productId, fields) =>
    ProductStock.findOneAndUpdate({ product: productId }, { $set: fields }, { new: true, runValidators: true }).lean(),
  // Gives units back (checkout rollback, order cancellation). Not a "restock", so lastRestockedAt is untouched.
  restore: (productId, quantity) => ProductStock.updateOne({ product: productId }, { $inc: { quantity } }, { upsert: true }),
  adjust(productId, delta, extra = {}) {
    const update = { $inc: { quantity: delta } };
    const $set = { ...extra, ...(delta > 0 && { lastRestockedAt: new Date() }) };
    if (Object.keys($set).length > 0) update.$set = $set;
    return ProductStock.findOneAndUpdate({ product: productId, quantity: { $gte: -delta } }, update, { new: true }).lean();
  },
};
