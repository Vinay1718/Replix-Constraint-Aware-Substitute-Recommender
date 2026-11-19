import mongoose from "mongoose";
import { baseOptions } from "./schemaOptions.js";

// AI layer (Phase 5): one vector per product per embedding model.
// textHash lets the refresh job skip products whose text has not changed.
const productEmbeddingSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, unique: true },
    model: { type: String, required: true },
    textHash: { type: String, required: true },
    vector: { type: [Number], required: true },
  },
  { ...baseOptions, collection: "productEmbeddings" }
);
export const ProductEmbedding = mongoose.model("ProductEmbedding", productEmbeddingSchema);
