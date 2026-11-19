import { connectDB, disconnectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { Feedback, Order, Product, ProductEmbedding, ProductStock, Recommendation, SubstituteLabel } from "../models/index.js";
import { generateCatalog } from "../seed/catalog.js";

const args = new Set(process.argv.slice(2));

try {
  if (env.isProduction && !args.has("--force")) throw new Error("Refusing to seed a production database without --force.");
  await connectDB();

  const existing = await Product.countDocuments();
  if (existing > 0 && !args.has("--reset")) {
    throw new Error(`The products collection already has ${existing} documents. Re-run with --reset to wipe catalog data and reseed.`);
  }
  if (args.has("--reset")) {
    await Promise.all([Product, ProductStock, SubstituteLabel, Recommendation, Feedback, ProductEmbedding, Order].map((M) => M.deleteMany({})));
    console.log("Existing catalog data removed.");
  }

  const catalog = generateCatalog();
  const products = await Product.insertMany(catalog.map((c) => c.product));
  await ProductStock.insertMany(
    products.map((p, i) => ({ product: p._id, quantity: catalog[i].quantity, ...(catalog[i].quantity > 0 && { lastRestockedAt: new Date() }) }))
  );

  const byCategory = {};
  for (const { product, quantity } of catalog) {
    const c = (byCategory[product.category] ??= { total: 0, out: 0 });
    c.total++;
    if (quantity === 0) c.out++;
  }
  console.log(`\nSeeded ${products.length} products (+ stock records)`);
  console.table(byCategory);
  console.log(`Out of stock: ${catalog.filter((c) => c.quantity === 0).length} | Low stock: ${catalog.filter((c) => c.quantity > 0 && c.quantity <= 5).length} | Organic: ${catalog.filter((c) => c.product.attributes.organic).length}`);
} catch (err) {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
