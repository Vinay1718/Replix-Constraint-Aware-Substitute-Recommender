import { Router } from "express";
import { recommend, recordDecision } from "../controllers/recommendation.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { decisionSchema, recommendSchema } from "../validators/recommendation.validator.js";

const router = Router();
router.use(authenticate);
router.post("/", validate(recommendSchema), recommend);
router.post("/decisions", validate(decisionSchema), recordDecision);
export default router;
