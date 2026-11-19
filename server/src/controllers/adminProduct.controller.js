import { productService } from "../services/product.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

export const listAdminProducts = asyncHandler(async (req, res) => sendSuccess(res, await productService.adminList(req.validated.query)));
export const getAdminProduct = asyncHandler(async (req, res) => sendSuccess(res, await productService.adminGet(req.params.id)));
export const createProduct = asyncHandler(async (req, res) => sendSuccess(res, await productService.create(req.body), 201));
export const updateProduct = asyncHandler(async (req, res) => sendSuccess(res, await productService.update(req.params.id, req.body)));
export const deactivateProduct = asyncHandler(async (req, res) => sendSuccess(res, await productService.deactivate(req.params.id)));
