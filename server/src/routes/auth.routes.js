import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, me, register } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again in 15 minutes." },
});
router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.get("/me", authenticate, me);
export default router;
