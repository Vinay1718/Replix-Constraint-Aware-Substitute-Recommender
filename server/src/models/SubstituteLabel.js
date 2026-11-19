import mongoose from "mongoose";
import { LABEL_SOURCES, RELATION_TYPES } from "../constants/index.js";
import { baseOptions } from "./schemaOptions.js";

const { ObjectId } = mongoose.Schema.Types;

const substituteLabelSchema = new mongoose.Schema(
  {
    originalProduct: { type: ObjectId, ref: "Product", required: true },
    substituteProduct: {
      type: ObjectId, ref: "Product", required: true,
      validate: { validator: function (v) { return String(v) !== String(this.originalProduct); }, message: "A product cannot be a substitute for itself" },
    },
    relationType: { type: String, enum: RELATION_TYPES, default: "close" },
    similarityScore: { type: Number, min: 0, max: 1, default: null },
    source: { type: String, enum: LABEL_SOURCES, default: "admin" },
    notes: { type: String, trim: true, maxlength: 300, default: "" },
    createdBy: { type: ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
  },
  { ...baseOptions, collection: "substituteLabels" }
);
substituteLabelSchema.index({ originalProduct: 1, substituteProduct: 1 }, { unique: true });
substituteLabelSchema.index({ substituteProduct: 1 });
export const SubstituteLabel = mongoose.model("SubstituteLabel", substituteLabelSchema);
