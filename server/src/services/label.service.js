import { labelRepository } from "../repositories/label.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { toObjectId } from "../utils/objectId.js";

const NOT_FOUND = "Label not found.";
const requireObjectId = (id) => {
  const oid = toObjectId(id);
  if (!oid) throw ApiError.notFound(NOT_FOUND);
  return oid;
};

export const labelService = {
  async list({ originalProductId, substituteProductId, source, status, page, limit }) {
    const match = {};
    if (originalProductId) match.originalProduct = toObjectId(originalProductId);
    if (substituteProductId) match.substituteProduct = toObjectId(substituteProductId);
    if (source) match.source = source;
    if (status !== "all") match.isActive = status === "active";
    const [items, total] = await Promise.all([labelRepository.page({ match, skip: (page - 1) * limit, limit }), labelRepository.count(match)]);
    return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  },
  async create(admin, { originalProductId, substituteProductId, ...fields }) {
    const original = toObjectId(originalProductId);
    const substitute = toObjectId(substituteProductId);
    if (String(original) === String(substitute)) throw ApiError.badRequest("A product cannot be a substitute for itself.");
    const [o, s] = await Promise.all([productRepository.findById(original), productRepository.findById(substitute)]);
    if (!o || !s) throw ApiError.notFound("Product not found.");
    if (!o.isActive || !s.isActive) throw ApiError.badRequest("Both products must be active.");
    try {
      const label = await labelRepository.create({ ...fields, originalProduct: original, substituteProduct: substitute, source: "admin", createdBy: admin._id });
      return labelRepository.findById(label._id);
    } catch (err) {
      if (err.code === 11000) throw ApiError.conflict("That substitute relationship already exists.");
      throw err;
    }
  },
  async update(id, data) {
    const label = await labelRepository.updateById(requireObjectId(id), data);
    if (!label) throw ApiError.notFound(NOT_FOUND);
    return label;
  },
  async remove(id) {
    const removed = await labelRepository.deleteById(requireObjectId(id));
    if (!removed) throw ApiError.notFound(NOT_FOUND);
    return { deleted: true };
  },
};
