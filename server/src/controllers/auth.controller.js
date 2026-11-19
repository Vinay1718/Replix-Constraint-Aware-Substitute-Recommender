import { authService, toPublicUser } from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

export const register = asyncHandler(async (req, res) => sendSuccess(res, await authService.register(req.body), 201));
export const login = asyncHandler(async (req, res) => sendSuccess(res, await authService.login(req.body)));
export const me = asyncHandler(async (req, res) => sendSuccess(res, { user: toPublicUser(req.user) }));
