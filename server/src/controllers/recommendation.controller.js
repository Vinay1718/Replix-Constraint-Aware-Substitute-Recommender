import { recommendationService } from "../services/recommendation.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

export const recommend = asyncHandler(async (req, res) => sendSuccess(res, await recommendationService.recommend(req.user, req.body)));
export const recordDecision = asyncHandler(async (req, res) => sendSuccess(res, await recommendationService.recordDecision(req.user, req.body)));
