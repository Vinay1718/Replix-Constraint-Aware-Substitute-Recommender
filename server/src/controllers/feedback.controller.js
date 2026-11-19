import { feedbackService } from "../services/feedback.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

export const submitFeedback = asyncHandler(async (req, res) => sendSuccess(res, await feedbackService.submit(req.user, req.body)));
export const listFeedback = asyncHandler(async (req, res) => sendSuccess(res, await feedbackService.adminList(req.validated.query)));
