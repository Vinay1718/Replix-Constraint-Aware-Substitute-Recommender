import { orderService } from "../services/order.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

export const placeOrder = asyncHandler(async (req, res) => sendSuccess(res, await orderService.placeOrder(req.user, req.body), 201));
export const listMyOrders = asyncHandler(async (req, res) => sendSuccess(res, await orderService.listMine(req.user, req.validated.query)));
export const getMyOrder = asyncHandler(async (req, res) => sendSuccess(res, await orderService.getMine(req.user, req.params.id)));
export const cancelMyOrder = asyncHandler(async (req, res) => sendSuccess(res, await orderService.cancelMine(req.user, req.params.id)));
export const listAdminOrders = asyncHandler(async (req, res) => sendSuccess(res, await orderService.adminList(req.validated.query)));
export const updateOrderStatus = asyncHandler(async (req, res) => sendSuccess(res, await orderService.adminUpdateStatus(req.params.id, req.body.status)));
