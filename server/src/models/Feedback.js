import mongoose from "mongoose";
import { baseOptions } from "./schemaOptions.js";

const { ObjectId } = mongoose.Schema.Types;

const feedbackSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: "User", required: true },
    originalProduct: { type: ObjectId, ref: "Product", required: true },
    substituteProduct: { type: ObjectId, ref: "Product", required: true },
    recommendation: { type: ObjectId, ref: "Recommendation" },
    rating: {
      type: Number, required: [true, "Rating is required"],
      min: [1, "Rating must be between 1 and 5"], max: [5, "Rating must be between 1 and 5"],
      validate: { validator: Number.isInteger, message: "Rating must be a whole number" },
    },
    comment: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { ...baseOptions, collection: "feedback" }
);
feedbackSchema.index({ user: 1, originalProduct: 1, substituteProduct: 1 }, { unique: true });
feedbackSchema.index({ substituteProduct: 1, rating: 1 });
feedbackSchema.index({ createdAt: -1 });
export const Feedback = mongoose.model("Feedback", feedbackSchema);
