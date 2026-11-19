import "dotenv/config";
import { z } from "zod";

const flag = z.enum(["true", "false"]).default("false").transform((v) => v === "true");
const weight = (def) => z.coerce.number().min(0).max(1).default(def);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN must look like "15m", "12h" or "7d"').default("7d"),

  RATE_LIMIT_MAX: z.coerce.number().int().min(10).default(1000),

  AI_ENABLED: flag,
  EMBEDDINGS_PROVIDER: z.enum(["local", "openai"]).default("local"),
  EMBEDDINGS_MODEL: z.string().default("text-embedding-3-small"),
  OPENAI_API_KEY: z.string().optional().default(""),
  AI_SIMILARITY_WEIGHT: weight(0.4),
  AI_LEARNING_WEIGHT: weight(0.3),
  AI_EXPLANATIONS: flag,
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  EXPLANATION_MODEL: z.string().default("claude-haiku-4-5-20251001"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === "production",
  isDevelopment: parsed.data.NODE_ENV === "development",
};
