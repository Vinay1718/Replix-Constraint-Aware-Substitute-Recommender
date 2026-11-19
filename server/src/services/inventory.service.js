import { productRepository } from "../repositories/product.repository.js";
import { stockRepository } from "../repositories/stock.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { toObjectId } from "../utils/objectId.js";

const toView = (stock) => ({
  productId: stock.product,
  quantity: stock.quantity,
  lowStockThreshold: stock.lowStockThreshold,
  isInStock: stock.quantity > 0,
  isLowStock: stock.quantity > 0 && stock.quantity <= stock.lowStockThreshold,
  lastRestockedAt: stock.lastRestockedAt ?? null,
});

export const inventoryService = {
  async update(productId, { quantity, delta, lowStockThreshold }) {
    const oid = toObjectId(productId);
    if (!oid || !(await productRepository.findById(oid))) throw ApiError.notFound("Product not found.");
    await stockRepository.ensure(oid);

    const fields = {};
    if (lowStockThreshold !== undefined) fields.lowStockThreshold = lowStockThreshold;

    let stock;
    if (delta !== undefined) {
      stock = await stockRepository.adjust(oid, delta, fields);
      if (!stock) throw ApiError.conflict("Not enough stock to remove that quantity.");
    } else {
      if (quantity !== undefined) fields.quantity = quantity;
      stock = await stockRepository.set(oid, fields);
    }
    return toView(stock);
  },
};
