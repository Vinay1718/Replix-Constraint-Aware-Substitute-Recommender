import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "./ApiError.js";

const ALGORITHM = "HS256";
export const signToken = (user) =>
  jwt.sign({}, env.JWT_SECRET, { subject: String(user._id), expiresIn: env.JWT_EXPIRES_IN, algorithm: ALGORITHM });

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
  } catch (err) {
    if (err.name === "TokenExpiredError") throw ApiError.unauthorized("Your session has expired. Please log in again.");
    throw ApiError.unauthorized("Invalid authentication token.");
  }
};
