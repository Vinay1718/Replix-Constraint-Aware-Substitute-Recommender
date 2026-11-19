import mongoose from "mongoose";
import { ORDER_STATUSES, PAYMENT_METHODS } from "../constants/index.js";
import { baseOptions } from "./schemaOptions.js";

const { ObjectId } = mongoose.Schema.Types;

// Prices and names are SNAPSHOTS: later catalog edits must not rewrite history.
const itemSchema = new mongoose.Schema(
  {
    product: { type: ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    brand: { type: String, default: "" },
    category: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, validate: { validator: Number.isInteger, message: "Quantity must be a whole number" } },
    // Set only when the server verified this product was actually recommended as a substitute
    substitutedFor: { type: new mongoose.Schema({ product: { type: ObjectId, ref: "Product" }, name: String }, { _id: false }), default: undefined },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true, default: "" },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true, default: "" },
    postalCode: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: ObjectId, ref: "User", required: true },
    clientRequestId: { type: String }, // makes a double-submitted checkout create ONE order
    items: { type: [itemSchema], validate: { validator: (a) => a.length > 0, message: "An order needs at least one item" } },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: "placed" },
    statusHistory: { type: [new mongoose.Schema({ status: String, at: Date }, { _id: false })], default: [] },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentStatus: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" },
    shippingAddress: { type: addressSchema, required: true },
    cancelledAt: { type: Date },
  },
  { ...baseOptions, collection: "orders" }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ user: 1, clientRequestId: 1 }, { unique: true, partialFilterExpression: { clientRequestId: { $type: "string" } } });
orderSchema.index({ "items.substitutedFor.product": 1 }, { sparse: true });

export const Order = mongoose.model("Order", orderSchema);
