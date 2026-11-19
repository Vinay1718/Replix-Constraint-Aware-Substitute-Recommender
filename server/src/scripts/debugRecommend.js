import { connectDB, disconnectDB } from "../config/db.js";
import { candidateSource, toEngineProduct } from "../repositories/candidate.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { applyConstraints, buildExplanation, createCandidateGenerator, createRankingEngine } from "../recommendation/index.js";
import { toObjectId } from "../utils/objectId.js";

// Rule-based engine only (no user context). Usage:
// npm run debug:recommend -- [--id <productId>] [--budget 4] [--diet vegan,gluten-free] [--organic]
//                            [--any-category] [--qty 2] [--brands OatLand,GreenFarm] [--top 5]
const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const value = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };

try {
  await connectDB();
  const id = value("id");
  let doc;
  if (id) {
    const oid = toObjectId(id);
    doc = oid && (await productRepository.findOneWithStock({ _id: oid }));
    if (!doc) throw new Error(`No product with id ${id}`);
  } else {
    [doc] = await productRepository.list({ match: { isActive: true }, stockFilter: "out", limit: 1 });
    if (!doc) throw new Error("No out-of-stock product found. Run `npm run seed` first.");
  }
  const original = toEngineProduct(doc);
  const requirements = {
    ...(value("budget") !== undefined && { maxBudget: Number(value("budget")) }),
    ...(value("diet") && { dietaryRestrictions: value("diet").split(",") }),
    ...(value("brands") && { preferredBrands: value("brands").split(",") }),
    ...(has("organic") && { organicOnly: true }),
    ...(has("any-category") && { sameCategoryOnly: false }),
  };
  const quantity = value("qty") ? Number(value("qty")) : 1;
  const topN = value("top") ? Number(value("top")) : 5;

  const { candidates, meta } = await createCandidateGenerator(candidateSource).generate({ original });
  const result = applyConstraints({ candidates, original, requirements, quantity });
  const ranking = createRankingEngine().rank({ original, feasible: result.feasible, requirements: result.requirements, quantity, topN });

  console.log(`\nOriginal: ${original.name} | ${original.category} | $${original.price} | stock ${original.stock} (id ${original.id})`);
  console.log("Requirements:", JSON.stringify(result.requirements));
  console.log(`Candidates: ${candidates.length} (${meta.labeled} labels, ${meta.fromCategory} category) | Feasible: ${result.feasible.length} | Rejected: ${result.rejected.length}`);
  console.log("Stats:", JSON.stringify(result.stats));
  console.table(ranking.ranked.map((r) => ({
    rank: r.rank, name: r.product.name, price: r.product.price, stock: r.product.stock,
    similarity: r.similarityScore, preference: r.preferenceScore, final: r.finalScore,
    tags: buildExplanation({ original, item: r, requirements: result.requirements, quantity }).tags.join(", "),
  })));
} catch (err) {
  console.error("Debug run failed:", err.message);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
