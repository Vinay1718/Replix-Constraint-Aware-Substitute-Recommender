import { preferenceService } from "../services/preference.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

export const getPreferences = asyncHandler(async (req, res) => sendSuccess(res, await preferenceService.get(req.user._id)));
export const savePreferences = asyncHandler(async (req, res) => sendSuccess(res, await preferenceService.save(req.user._id, req.body)));
