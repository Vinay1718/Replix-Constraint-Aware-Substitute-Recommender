import { inventoryService } from "../services/inventory.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

export const updateInventory = asyncHandler(async (req, res) => sendSuccess(res, await inventoryService.update(req.params.productId, req.body)));
