import { demoService } from "../services/demo.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

export const examples = asyncHandler(async (req, res) => sendSuccess(res, await demoService.examples()));
export const stats = asyncHandler(async (req, res) => sendSuccess(res, await demoService.stats()));
export const recommend = asyncHandler(async (req, res) => sendSuccess(res, await demoService.recommend(req.body)));
