import { Router } from "express";
import { cancelMyOrder, getMyOrder, listMyOrders, placeOrder } from "../controllers/order.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { checkoutSchema, orderListQuerySchema } from "../validators/order.validator.js";

const router = Router();
router.use(authenticate);
router.post("/", validate(checkoutSchema), placeOrder);
router.get("/", validate(orderListQuerySchema, "query"), listMyOrders);
router.get("/:id", getMyOrder);
router.post("/:id/cancel", cancelMyOrder);
export default router;
