import { connectDB, disconnectDB } from "../config/db.js";
import { embeddingService } from "../ai/embedding.service.js";

// Usage: npm run embed:products [-- --force]
try {
  await connectDB();
  const result = await embeddingService.refresh({ force: process.argv.includes("--force") });
  console.log(`Embedding provider: ${result.provider} (${result.model})`);
  console.log(`Embedded ${result.embedded} of ${result.total} active products.`);
  console.log("Set AI_ENABLED=true in .env to use them when ranking.");
} catch (err) {
  console.error("Embedding failed:", err.message);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
