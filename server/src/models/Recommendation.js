import mongoose from "mongoose";
import { DECISIONS, DIETARY_TAGS, ENGINE_VERSIONS } from "../constants/index.js";
import { baseOptions } from "./schemaOptions.js";

const { ObjectId } = mongoose.Schema.Types;
const score = { type: Number, min: 0, max: 1, required: true };

const requirementsSnapshotSchema = new mongoose.Schema(
  {
    maxBudget: { type: Number, default: null },
    sameCategoryOnly: { type: Boolean, default: true },
    organicOnly: { type: Boolean, default: false },
    dietaryRestrictions: [{ type: String, enum: DIETARY_TAGS }],
    preferredBrands: [String],
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    product: { type: ObjectId, ref: "Product", required: true },
    rank: { type: Number, required: true, min: 1 },
    similarityScore: score,
    preferenceScore: score,
    finalScore: score,
    explanationTags: { type: [String], default: [] },
    decision: { type: String, enum: Object.values(DECISIONS), default: DECISIONS.PENDING },
    decidedAt: { type: Date },
  },
  { _id: false }
);

const count = { type: Number, min: 0, default: 0 };

const recommendationSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: "User", required: true },
    originalProduct: { type: ObjectId, ref: "Product", required: true },
    requirements: { type: requirementsSnapshotSchema, required: true },
    items: { type: [itemSchema], default: [] },
    stats: {
      candidatesEvaluated: count,
      candidatesRejected: count,
      rejectedBy: { stock: count, budget: count, category: count, dietary: count, organic: count, attributes: count },
    },
    engineVersion: { type: String, default: ENGINE_VERSIONS.RULE_BASED },
  },
  { ...baseOptions, collection: "recommendations", minimize: false }
);
recommendationSchema.index({ user: 1, originalProduct: 1, createdAt: -1 });
recommendationSchema.index({ originalProduct: 1 });
recommendationSchema.index({ createdAt: -1 });
recommendationSchema.index({ "items.product": 1, "items.decision": 1 });
export const Recommendation = mongoose.model("Recommendation", recommendationSchema);
