import mongoose from "mongoose";

// Accepts an ObjectId instance or a 24-char hex string; null for anything else.
export const toObjectId = (value) => {
  if (value instanceof mongoose.Types.ObjectId) return value;
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value) ? new mongoose.Types.ObjectId(value) : null;
};
