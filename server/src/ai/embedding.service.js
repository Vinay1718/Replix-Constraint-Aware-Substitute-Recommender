import { Product, ProductEmbedding } from "../models/index.js";
import { toObjectId } from "../utils/objectId.js";
import { productText, textHash } from "./productText.js";
import { getEmbeddingProvider } from "./embeddings/index.js";

export const embeddingService = {
  /** Embeds products that are new, changed, or were embedded with a different model. */
  async refresh({ force = false } = {}) {
    const provider = getEmbeddingProvider();
    const products = await Product.find({ isActive: true }).select("name brand category dietaryTags").lean();
    const existing = new Map(
      (await ProductEmbedding.find().select("product model textHash").lean()).map((e) => [String(e.product), e])
    );

    const todo = [];
    for (const p of products) {
      const text = productText(p);
      const hash = textHash(text);
      const old = existing.get(String(p._id));
      if (force || !old || old.model !== provider.model || old.textHash !== hash) todo.push({ id: p._id, text, hash });
    }
    if (todo.length === 0) return { provider: provider.name, model: provider.model, embedded: 0, total: products.length };

    const vectors = await provider.embed(todo.map((t) => t.text));
    await ProductEmbedding.bulkWrite(
      todo.map((t, i) => ({
        updateOne: {
          filter: { product: t.id },
          update: { $set: { product: t.id, model: provider.model, textHash: t.hash, vector: vectors[i] } },
          upsert: true,
        },
      })),
      { ordered: false }
    );
    return { provider: provider.name, model: provider.model, embedded: todo.length, total: products.length };
  },

  /** Map<productId, vector> for the CURRENT model only (mixed models are never compared). */
  async loadVectors(ids) {
    const provider = getEmbeddingProvider();
    const oids = ids.map(toObjectId).filter(Boolean);
    if (oids.length === 0) return new Map();
    const rows = await ProductEmbedding.find({ product: { $in: oids }, model: provider.model }).select("product vector").lean();
    return new Map(rows.map((r) => [String(r.product), r.vector]));
  },
};
