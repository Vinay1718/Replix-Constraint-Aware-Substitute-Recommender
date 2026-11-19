import { productService } from "../services/product.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

export const listProducts = asyncHandler(async (req, res) => sendSuccess(res, await productService.list(req.validated.query)));
export const listCategories = asyncHandler(async (req, res) => sendSuccess(res, await productService.getCategories()));
export const getProduct = asyncHandler(async (req, res) => sendSuccess(res, await productService.getById(req.params.id)));
