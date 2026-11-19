import mongoose from "mongoose";
import { DIETARY_TAGS } from "../constants/index.js";
import { baseOptions, unique } from "./schemaOptions.js";

const customerRequirementSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    // HARD constraints
    maxBudget: { type: Number, min: [0, "Budget cannot be negative"], default: null },
    sameCategoryOnly: { type: Boolean, default: true },
    organicOnly: { type: Boolean, default: false },
    dietaryRestrictions: { type: [{ type: String, enum: DIETARY_TAGS, lowercase: true }], default: [], set: unique },
    // SOFT preference
    preferredBrands: {
      type: [{ type: String, trim: true, maxlength: 80 }],
      default: [],
      validate: { validator: (arr) => arr.length <= 20, message: "At most 20 preferred brands are allowed" },
    },
  },
  { ...baseOptions, collection: "customerRequirements" }
);
export const CustomerRequirement = mongoose.model("CustomerRequirement", customerRequirementSchema);
