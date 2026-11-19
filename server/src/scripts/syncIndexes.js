import { connectDB, disconnectDB } from "../config/db.js";
import * as models from "../models/index.js";

try {
  await connectDB();
  for (const [name, Model] of Object.entries(models)) {
    await Model.syncIndexes();
    console.log(`Indexes synced: ${name} -> ${Model.collection.name}`);
  }
} catch (err) {
  console.error("Index sync failed:", err.message);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
