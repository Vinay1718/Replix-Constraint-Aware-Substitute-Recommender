import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import { EngineInputError } from "../recommendation/index.js";

const normalizeError = (err) => {
  if (err instanceof ApiError) return err;
  if (err instanceof EngineInputError) return new ApiError(422, err.message);
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return new ApiError(422, "Validation failed", details);
  }
  if (err instanceof mongoose.Error.CastError) return ApiError.badRequest(`Invalid value for "${err.path}"`);
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || {}).join(", ");
    return ApiError.conflict(`Duplicate value for: ${fields || "unique field"}`);
  }
  if (err.type === "entity.parse.failed") return ApiError.badRequest("Malformed JSON in request body");
  return null;
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const known = normalizeError(err);
  const statusCode = known?.statusCode ?? 500;
  const message = known ? known.message : env.isProduction ? "Internal server error" : err.message || "Internal server error";
  if (!known) console.error(err);
  res.status(statusCode).json({
    success: false,
    message,
    ...(known?.details && { errors: known.details }),
    ...(!env.isProduction && !known && { stack: err.stack }),
  });
};
