import { embeddingService } from "../ai/embedding.service.js";
import { analyticsService } from "../services/analytics.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

export const overview = asyncHandler(async (req, res) => sendSuccess(res, await analyticsService.overview()));
// Admin can (re)build product embeddings from the dashboard
export const refreshEmbeddings = asyncHandler(async (req, res) => sendSuccess(res, await embeddingService.refresh({ force: req.body?.force === true })));
