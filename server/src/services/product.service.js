import { PUBLIC_LIST_LIMIT } from "../constants/index.js";
import { productRepository } from "../repositories/product.repository.js";
import { stockRepository } from "../repositories/stock.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { toObjectId } from "../utils/objectId.js";
import { escapeRegex } from "../utils/regex.js";

const NOT_FOUND = "Product not found.";

const buildMatch = ({ search, category, isActive }) => {
  const match = {};
  if (isActive !== undefined) match.isActive = isActive;
  if (category) match.category = category;
  if (search) {
    const pattern = escapeRegex(search);
    match.$or = [{ name: { $regex: pattern, $options: "i" } }, { brand: { $regex: pattern, $options: "i" } }];
  }
  return match;
};

const toPublic = ({ lowStockThreshold, ...rest }) => rest;

const requireObjectId = (id) => {
  const oid = toObjectId(id);
  if (!oid) throw ApiError.notFound(NOT_FOUND);
  return oid;
};

const getAdminById = async (id) => {
  const product = await productRepository.findOneWithStock({ _id: requireObjectId(id) });
  if (!product) throw ApiError.notFound(NOT_FOUND);
  return product;
};

export const productService = {
  async list({ search, category, inStockOnly }) {
    const products = await productRepository.list({
      match: buildMatch({ search, category, isActive: true }),
      stockFilter: inStockOnly ? "in" : undefined,
      limit: PUBLIC_LIST_LIMIT,
    });
    return products.map(toPublic);
  },
  async getCategories() {
    const categories = await productRepository.distinctCategories();
    return categories.sort((a, b) => a.localeCompare(b));
  },
  async getById(id) {
    const product = await productRepository.findOneWithStock({ _id: requireObjectId(id), isActive: true });
    if (!product) throw ApiError.notFound(NOT_FOUND);
    return toPublic(product);
  },
  async adminList({ search, category, status, stockStatus, page, limit }) {
    const isActive = status === "all" ? undefined : status === "active";
    const { items, total } = await productRepository.page({
      match: buildMatch({ search, category, isActive }),
      stockFilter: stockStatus,
      skip: (page - 1) * limit,
      limit,
    });
    return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  },
  adminGet: getAdminById,
  async create({ stock = 0, ...data }) {
    const product = await productRepository.create(data);
    try {
      await stockRepository.create({ product: product._id, quantity: stock, ...(stock > 0 && { lastRestockedAt: new Date() }) });
    } catch (err) {
      await productRepository.deleteById(product._id);
      throw err;
    }
    return getAdminById(product._id);
  },
  async update(id, data) {
    const oid = requireObjectId(id);
    const updated = await productRepository.updateById(oid, data);
    if (!updated) throw ApiError.notFound(NOT_FOUND);
    return getAdminById(oid);
  },
  async deactivate(id) {
    return productService.update(id, { isActive: false });
  },
};
