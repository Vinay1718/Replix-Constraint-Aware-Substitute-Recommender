import { connectDB, disconnectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { Product, SubstituteLabel } from "../models/index.js";
import { buildLabels } from "../seed/labels.js";

const args = new Set(process.argv.slice(2));
const CHUNK = 1000;

try {
  if (env.isProduction && !args.has("--force")) throw new Error("Refusing to seed a production database without --force.");
  await connectDB();

  const products = await Product.find({ isActive: true }).lean();
  if (products.length === 0) throw new Error("No products found. Run `npm run seed` first.");

  if (args.has("--reset")) {
    const { deletedCount } = await SubstituteLabel.deleteMany({ source: "system" });
    console.log(`Removed ${deletedCount} existing system labels.`);
  }

  const labels = buildLabels(products);
  let inserted = 0;
  for (let i = 0; i < labels.length; i += CHUNK) {
    const ops = labels.slice(i, i + CHUNK).map(({ originalProduct, substituteProduct, ...rest }) => ({
      updateOne: { filter: { originalProduct, substituteProduct }, update: { $setOnInsert: rest }, upsert: true },
    }));
    const result = await SubstituteLabel.bulkWrite(ops, { ordered: false });
    inserted += result.upsertedCount;
  }
  const byType = {};
  for (const l of labels) byType[l.relationType] = (byType[l.relationType] ?? 0) + 1;
  console.log(`\nGenerated ${labels.length} labels, inserted ${inserted} new, skipped ${labels.length - inserted} existing.`);
  console.table(byType);
} catch (err) {
  console.error("Label seed failed:", err.message);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
