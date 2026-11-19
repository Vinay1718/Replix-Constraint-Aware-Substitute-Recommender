import mongoose from "mongoose";
import { DIETARY_TAGS } from "../constants/index.js";
import { baseOptions, unique } from "./schemaOptions.js";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Product name is required"], trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    category: { type: String, required: [true, "Category is required"], trim: true },
    brand: { type: String, required: [true, "Brand is required"], trim: true },
    price: { type: Number, required: [true, "Price is required"], min: [0, "Price cannot be negative"] },
    attributes: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    dietaryTags: { type: [{ type: String, enum: DIETARY_TAGS, lowercase: true }], default: [], set: unique },
    imageUrl: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { ...baseOptions, collection: "products", minimize: false }
);
productSchema.index({ category: 1, isActive: 1, price: 1 });
productSchema.index({ dietaryTags: 1 });
productSchema.index({ brand: 1 });
export const Product = mongoose.model("Product", productSchema);
