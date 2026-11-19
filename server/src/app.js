import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Behind a reverse proxy (Nginx, Render, Heroku) set TRUST_PROXY=1 so rate limits see real client IPs
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
if (env.isDevelopment) app.use(morgan("dev"));

app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000, limit: env.RATE_LIMIT_MAX, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
}));

app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

export default app;
