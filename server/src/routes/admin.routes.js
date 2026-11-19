import { Router } from "express";
import { createProduct, deactivateProduct, getAdminProduct, listAdminProducts, updateProduct } from "../controllers/adminProduct.controller.js";
import { createLabel, deleteLabel, listLabels, updateLabel } from "../controllers/adminLabel.controller.js";
import { overview, refreshEmbeddings } from "../controllers/analytics.controller.js";
import { listAdminOrders, updateOrderStatus } from "../controllers/order.controller.js";
import { listFeedback } from "../controllers/feedback.controller.js";
import { updateInventory } from "../controllers/inventory.controller.js";
import { ROLES } from "../constants/index.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { adminOrderListQuerySchema, orderStatusSchema } from "../validators/order.validator.js";
import { feedbackListQuerySchema } from "../validators/feedback.validator.js";
import { createLabelSchema, labelListQuerySchema, updateLabelSchema } from "../validators/label.validator.js";
import { adminListQuerySchema, createProductSchema, inventoryUpdateSchema, updateProductSchema } from "../validators/product.validator.js";

const router = Router();
router.use(authenticate, requireRole(ROLES.ADMIN));

router.get("/analytics", overview);
router.post("/ai/embeddings", refreshEmbeddings);

router.get("/products", validate(adminListQuerySchema, "query"), listAdminProducts);
router.post("/products", validate(createProductSchema), createProduct);
router.get("/products/:id", getAdminProduct);
router.patch("/products/:id", validate(updateProductSchema), updateProduct);
router.delete("/products/:id", deactivateProduct);
router.patch("/inventory/:productId", validate(inventoryUpdateSchema), updateInventory);

router.get("/labels", validate(labelListQuerySchema, "query"), listLabels);
router.post("/labels", validate(createLabelSchema), createLabel);
router.patch("/labels/:id", validate(updateLabelSchema), updateLabel);
router.delete("/labels/:id", deleteLabel);

router.get("/orders", validate(adminOrderListQuerySchema, "query"), listAdminOrders);
router.patch("/orders/:id/status", validate(orderStatusSchema), updateOrderStatus);

router.get("/feedback", validate(feedbackListQuerySchema, "query"), listFeedback);
export default router;
