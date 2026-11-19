import mongoose from "mongoose";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "../constants/index.js";
import { baseOptions } from "./schemaOptions.js";

const wholeNumber = { validator: Number.isInteger, message: "{PATH} must be a whole number" };

const productStockSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, unique: true },
    quantity: { type: Number, required: true, min: [0, "Quantity cannot be negative"], default: 0, validate: wholeNumber },
    lowStockThreshold: { type: Number, min: 0, default: DEFAULT_LOW_STOCK_THRESHOLD, validate: wholeNumber },
    lastRestockedAt: { type: Date },
  },
  { ...baseOptions, collection: "productStocks", toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
productStockSchema.virtual("isInStock").get(function () { return this.quantity > 0; });
productStockSchema.virtual("isLowStock").get(function () { return this.quantity > 0 && this.quantity <= this.lowStockThreshold; });
productStockSchema.index({ quantity: 1 });
export const ProductStock = mongoose.model("ProductStock", productStockSchema);
