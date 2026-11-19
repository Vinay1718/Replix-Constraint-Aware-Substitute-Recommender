import mongoose from "mongoose";
import { ROLES } from "../constants/index.js";
import { baseOptions } from "./schemaOptions.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true, minlength: [2, "Name must be at least 2 characters"], maxlength: [80, "Name must be at most 80 characters"] },
    email: { type: String, required: [true, "Email is required"], unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, "Email is invalid"] },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },
    isActive: { type: Boolean, default: true },
  },
  {
    ...baseOptions,
    collection: "users",
    toJSON: { transform: (doc, ret) => { delete ret.passwordHash; return ret; } },
  }
);
export const User = mongoose.model("User", userSchema);
