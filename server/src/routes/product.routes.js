import { Router } from "express";
import { getProduct, listCategories, listProducts } from "../controllers/product.controller.js";
import { validate } from "../middleware/validate.js";
import { listQuerySchema } from "../validators/product.validator.js";

const router = Router();
router.get("/", validate(listQuerySchema, "query"), listProducts);
router.get("/categories", listCategories); // must stay above "/:id"
router.get("/:id", getProduct);
export default router;
