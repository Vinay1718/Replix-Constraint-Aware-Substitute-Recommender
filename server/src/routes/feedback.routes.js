import { Router } from "express";
import { submitFeedback } from "../controllers/feedback.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { feedbackSchema } from "../validators/feedback.validator.js";

const router = Router();
router.post("/", authenticate, validate(feedbackSchema), submitFeedback);
export default router;
