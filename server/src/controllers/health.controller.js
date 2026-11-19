import { isDBConnected } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

export const getHealth = asyncHandler(async (req, res) => {
  const dbConnected = isDBConnected();
  return sendSuccess(res, {
    status: dbConnected ? "ok" : "degraded",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: dbConnected ? "connected" : "disconnected",
  }, dbConnected ? 200 : 503);
});
