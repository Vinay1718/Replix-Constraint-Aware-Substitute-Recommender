import { labelRepository } from "./label.repository.js";
import { productRepository } from "./product.repository.js";
import { toObjectId } from "../utils/objectId.js";

export const toEngineProduct = (doc) => ({
  id: String(doc._id),
  name: doc.name,
  brand: doc.brand,
  category: doc.category,
  price: doc.price,
  attributes: doc.attributes ?? {},
  dietaryTags: doc.dietaryTags ?? [],
  isActive: doc.isActive !== false,
  stock: doc.stock ?? 0,
});

export const candidateSource = {
  async getLabels(originalId) {
    const oid = toObjectId(originalId);
    if (!oid) return [];
    const labels = await labelRepository.findActiveForOriginal(oid);
    return labels.map((l) => ({
      substituteId: String(l.substituteProduct),
      relationType: l.relationType,
      similarityScore: l.similarityScore ?? null,
      source: l.source,
    }));
  },
  async getProductsByIds(ids) {
    const oids = ids.map(toObjectId).filter(Boolean);
    if (oids.length === 0) return [];
    const docs = await productRepository.list({ match: { _id: { $in: oids }, isActive: true }, limit: oids.length });
    return docs.map(toEngineProduct);
  },
  async getCategoryProducts(category, excludeId, limit) {
    const oid = toObjectId(excludeId);
    const docs = await productRepository.list({ match: { category, isActive: true, ...(oid && { _id: { $ne: oid } }) }, limit });
    return docs.map(toEngineProduct);
  },
};
