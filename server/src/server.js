import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";

let server;

const start = async () => {
  try {
    await connectDB();
    server = app.listen(env.PORT, () => {
      console.log(`Server running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}`);
      console.log(`AI layer: ${env.AI_ENABLED ? `ON (embeddings: ${env.EMBEDDINGS_PROVIDER}, LLM explanations: ${env.AI_EXPLANATIONS})` : "OFF (rule-based only)"}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down...`);
  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref();
  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  shutdown("unhandledRejection");
});

start();
