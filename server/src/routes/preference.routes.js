import { Router } from "express";
import { getPreferences, savePreferences } from "../controllers/preference.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { preferenceSchema } from "../validators/preference.validator.js";

const router = Router();
router.use(authenticate);
router.get("/", getPreferences);
router.put("/", validate(preferenceSchema), savePreferences);
export default router;
