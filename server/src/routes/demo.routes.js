import { Router } from "express";
import rateLimit from "express-rate-limit";
import { examples, recommend, stats } from "../controllers/demo.controller.js";
import { validate } from "../middleware/validate.js";
import { recommendSchema } from "../validators/recommendation.validator.js";

const router = Router();
const demoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: "Too many demo requests. Please try again later." },
});
router.get("/examples", examples);
router.get("/stats", stats);
router.post("/recommend", demoLimiter, validate(recommendSchema), recommend);
export default router;
