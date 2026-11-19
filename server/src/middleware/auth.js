import { userRepository } from "../repositories/user.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyToken } from "../utils/token.js";

export const authenticate = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) throw ApiError.unauthorized();
  const payload = verifyToken(token);
  const user = await userRepository.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized("Account not found or disabled.");
  req.user = user;
  next();
});

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};
