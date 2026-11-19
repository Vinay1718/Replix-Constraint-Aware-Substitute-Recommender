import { labelService } from "../services/label.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

export const listLabels = asyncHandler(async (req, res) => sendSuccess(res, await labelService.list(req.validated.query)));
export const createLabel = asyncHandler(async (req, res) => sendSuccess(res, await labelService.create(req.user, req.body), 201));
export const updateLabel = asyncHandler(async (req, res) => sendSuccess(res, await labelService.update(req.params.id, req.body)));
export const deleteLabel = asyncHandler(async (req, res) => sendSuccess(res, await labelService.remove(req.params.id)));
