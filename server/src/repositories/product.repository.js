import { DEFAULT_LOW_STOCK_THRESHOLD } from "../constants/index.js";
import { Product, ProductStock } from "../models/index.js";

const COLLATION = { locale: "en", strength: 2 };

const STOCK_STAGES = [
  { $lookup: { from: ProductStock.collection.name, localField: "_id", foreignField: "product", as: "_stock" } },
  {
    $addFields: {
      stock: { $ifNull: [{ $arrayElemAt: ["$_stock.quantity", 0] }, 0] },
      lowStockThreshold: { $ifNull: [{ $arrayElemAt: ["$_stock.lowStockThreshold", 0] }, DEFAULT_LOW_STOCK_THRESHOLD] },
    },
  },
  { $project: { _stock: 0 } },
];

const STOCK_MATCH = {
  in: { stock: { $gt: 0 } },
  out: { stock: 0 },
  low: { $expr: { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$lowStockThreshold"] }] } },
};

const buildPipeline = ({ match, stockFilter }) => [
  { $match: match },
  ...STOCK_STAGES,
  ...(STOCK_MATCH[stockFilter] ? [{ $match: STOCK_MATCH[stockFilter] }] : []),
  { $sort: { name: 1, _id: 1 } },
];

export const productRepository = {
  create: (data) => Product.create(data),
  findById: (id) => Product.findById(id).lean(),
  deleteById: (id) => Product.findByIdAndDelete(id),
  updateById: (id, data) => Product.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean(),
  distinctCategories: () => Product.distinct("category", { isActive: true }),

  async findOneWithStock(match) {
    const [doc] = await Product.aggregate([{ $match: match }, ...STOCK_STAGES, { $limit: 1 }]);
    return doc ?? null;
  },
  list: ({ match, stockFilter, limit }) =>
    Product.aggregate([...buildPipeline({ match, stockFilter }), { $limit: limit }]).collation(COLLATION),

  async page({ match, stockFilter, skip, limit }) {
    const [result] = await Product.aggregate([
      ...buildPipeline({ match, stockFilter }),
      { $facet: { items: [{ $skip: skip }, { $limit: limit }], total: [{ $count: "n" }] } },
    ]).collation(COLLATION);
    return { items: result.items, total: result.total[0]?.n ?? 0 };
  },
};
