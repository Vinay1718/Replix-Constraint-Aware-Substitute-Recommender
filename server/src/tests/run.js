// Offline test suite: no database, no network. Run with `npm test`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

// Safe defaults so the suite runs without a .env
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:1/none";
process.env.JWT_SECRET ??= "test-secret-test-secret-test-secret-123456";

const { Product, SubstituteLabel, Recommendation, Feedback, User, ProductStock, Order } = await import("../models/index.js");
const { checkoutSchema, orderStatusSchema, adminOrderListQuerySchema } = await import("../validators/order.validator.js");
const { ORDER_TRANSITIONS, ORDER_STATUSES } = await import("../constants/index.js");
const E = await import("../recommendation/index.js");
const { generateCatalog } = await import("../seed/catalog.js");
const { buildLabels, typeOf, GROUPS, groupIndexOf } = await import("../seed/labels.js");
const { registerSchema } = await import("../validators/auth.validator.js");
const { createProductSchema, inventoryUpdateSchema, updateProductSchema } = await import("../validators/product.validator.js");
const { preferenceSchema } = await import("../validators/preference.validator.js");
const { feedbackSchema } = await import("../validators/feedback.validator.js");
const { recommendSchema, decisionSchema } = await import("../validators/recommendation.validator.js");
const { signToken, verifyToken } = await import("../utils/token.js");
const { toObjectId } = await import("../utils/objectId.js");
const { embedLocal } = await import("../ai/embeddings/localHash.js");
const { productText } = await import("../ai/productText.js");

let failures = 0;
let total = 0;
const check = (name, ok) => { total++; if (!ok) { failures++; console.log(`FAIL  ${name}`); } };
const throwsEngine = (fn) => { try { fn(); } catch (e) { return e instanceof E.EngineInputError; } return false; };

// ---------- models ----------
const id = () => new mongoose.Types.ObjectId();
check("product schema rejects negative price", !!new Product({ name: "a", category: "c", brand: "b", price: -1 }).validateSync());
check("stock rejects fractions", !!new ProductStock({ product: id(), quantity: 2.5 }).validateSync());
check("self substitution rejected", (() => { const a = id(); return !!new SubstituteLabel({ originalProduct: a, substituteProduct: a }).validateSync(); })());
check("rating 6 rejected", !!new Feedback({ user: id(), originalProduct: id(), substituteProduct: id(), rating: 6 }).validateSync());
check("user needs a password hash", !!new User({ name: "Asha", email: "a@b.com" }).validateSync());
check("every engine rule has a stats field in the model", E.REJECTION_RULES.every((k) => Recommendation.schema.path(`stats.rejectedBy.${k}`) !== undefined));
check("ObjectId instance accepted", (() => { const x = id(); return toObjectId(x) === x; })());
check("garbage / 12-char ids rejected", toObjectId("zzz") === null && toObjectId("abcdefghijkl") === null);

// ---------- seed data ----------
const catalog = generateCatalog();
check("catalog 200..500 products", catalog.length >= 200 && catalog.length <= 500);
check("names unique", new Set(catalog.map((c) => c.product.name)).size === catalog.length);
check("all products pass the schema", catalog.every((c) => !new Product(c.product).validateSync()));
check("catalog deterministic", JSON.stringify(catalog) === JSON.stringify(generateCatalog()));
check("has out-of-stock, low-stock and organic", catalog.some((c) => c.quantity === 0) && catalog.some((c) => c.quantity > 0 && c.quantity <= 5) && catalog.some((c) => c.product.attributes.organic));

// ---------- validators ----------
const base = { name: "Asha Rao", email: " ASHA@Example.COM ", password: "longenough1" };
check("register normalizes email", registerSchema.parse(base).email === "asha@example.com");
check("register strips role", !("role" in registerSchema.parse({ ...base, role: "admin" })));
check("short password rejected", !registerSchema.safeParse({ ...base, password: "short" }).success);
const vp = { name: "Oat Milk", category: "Beverages", brand: "OatLand", price: 4.2 };
check("product create ok / negative price rejected", createProductSchema.safeParse(vp).success && !createProductSchema.safeParse({ ...vp, price: -1 }).success);
check("organic must be boolean", !createProductSchema.safeParse({ ...vp, attributes: { organic: "yes" } }).success);
check("javascript: image url rejected", !createProductSchema.safeParse({ ...vp, imageUrl: "javascript:alert(1)" }).success);
check("partial update only has sent fields", Object.keys(updateProductSchema.parse({ price: 5 })).join() === "price");
check("inventory: quantity+delta rejected, delta 0 rejected", !inventoryUpdateSchema.safeParse({ quantity: 1, delta: 1 }).success && !inventoryUpdateSchema.safeParse({ delta: 0 }).success);
check("preferences defaults + dedupe", (() => { const p = preferenceSchema.parse({ preferredBrands: [" A ", "a"], dietaryRestrictions: ["vegan", "vegan"] }); return p.maxBudget === null && p.preferredBrands.length === 1 && p.dietaryRestrictions.length === 1; })());
check("feedback rejects mock ids and rating 0", !feedbackSchema.safeParse({ originalProductId: "p1", substituteProductId: "p2", rating: 3 }).success && !feedbackSchema.safeParse({ originalProductId: id().toString(), substituteProductId: id().toString(), rating: 0 }).success);
check("recommend schema: id required, quantity default 1", !recommendSchema.safeParse({ productId: "p1" }).success && recommendSchema.parse({ productId: id().toString() }).quantity === 1);
check("decision must be accepted/rejected", !decisionSchema.safeParse({ originalProductId: id().toString(), substituteProductId: id().toString(), decision: "pending" }).success);

// ---------- auth tokens ----------
const tok = signToken({ _id: "u1" });
check("token round trip", verifyToken(tok).sub === "u1");
check("tampered token rejected", (() => { const [h, , s] = tok.split("."); try { verifyToken(`${h}.${Buffer.from('{"sub":"x"}').toString("base64url")}.${s}`); } catch (e) { return e.statusCode === 401; } return false; })());

// ---------- constraint engine ----------
const P = (o = {}) => ({ id: "x", name: "X", brand: "B", category: "Beverages", price: 4, attributes: {}, dietaryTags: [], isActive: true, stock: 10, ...o });
const C = (p, extra = {}) => ({ product: p, origin: "category", label: null, ...extra });
const O0 = P({ id: "o", price: 4.5, stock: 0 });
const v = (p, requirements = {}, extra = {}) => {
  const r = E.applyConstraints({ candidates: [C(p)], original: O0, requirements, ...extra });
  return r.rejected[0] ? `${r.rejected[0].rule}:${r.rejected[0].reason}` : null;
};
check("stock 0 / inactive / insufficient", v(P({ stock: 0 })) === "stock:out_of_stock" && v(P({ isActive: false })) === "stock:inactive" && v(P({ stock: 2 }), {}, { quantity: 3 }) === "stock:insufficient_stock");
check("budget: equal passes, 1 cent over fails, float noise ok", v(P({ price: 4.2 }), { maxBudget: 4.2 }) === null && v(P({ price: 4.21 }), { maxBudget: 4.2 }) === "budget:over_budget" && v(P({ price: 0.1 + 0.2 }), { maxBudget: 0.3 }) === null);
check("category rule", v(P({ category: "Bakery" })) === "category:different_category" && v(P({ category: "Bakery" }), { sameCategoryOnly: false }) === null);
check("vegan satisfies vegetarian, not vice versa", v(P({ dietaryTags: ["vegan"] }), { dietaryRestrictions: ["vegetarian"] }) === null && v(P({ dietaryTags: ["vegetarian"] }), { dietaryRestrictions: ["vegan"] }) === "dietary:missing:vegan");
check("vegan does not imply nut-free; missing tags unsafe; unknown restriction rejects all", v(P({ dietaryTags: ["vegan"] }), { dietaryRestrictions: ["nut-free"] }) === "dietary:missing:nut-free" && v(P(), { dietaryRestrictions: ["gluten-free"] }) === "dietary:missing:gluten-free" && v(P({ dietaryTags: ["vegan"] }), { dietaryRestrictions: ["keto"] }) === "dietary:missing:keto");
check("organic strictly boolean", v(P({ attributes: { organic: true } }), { organicOnly: true }) === null && v(P({ attributes: { organic: "true" } }), { organicOnly: true }) === "organic:not_organic");
check("required attributes", v(P({ attributes: { size: "1l" } }), { requiredAttributes: { size: "1L" } }) === null && v(P(), { requiredAttributes: { constructor: "x" } }) === "attributes:attribute_mismatch:constructor");
const mixed = E.applyConstraints({ candidates: [C(P({ id: "1" })), C(P({ id: "2", stock: 0 })), C(P({ id: "3", price: 50 })), C(P({ id: "4", category: "Bakery" })), C(P({ id: "5", dietaryTags: ["vegan"] }))], original: O0, requirements: { maxBudget: 10, dietaryRestrictions: ["vegan"] } });
check("per-rule counts sum to rejected; only valid survives", Object.values(mixed.stats.rejectedBy).reduce((a, b) => a + b, 0) === mixed.stats.candidatesRejected && mixed.feasible.map((c) => c.product.id).join() === "5");
check("fail closed on malformed hard constraints", throwsEngine(() => E.applyConstraints({ candidates: [], original: O0, requirements: { maxBudget: -1 } })) && throwsEngine(() => E.applyConstraints({ candidates: [], original: O0, requirements: { maxBudget: "5" } })) && throwsEngine(() => E.applyConstraints({ candidates: [], original: O0, requirements: { sameCategoryOnly: "false" } })));

// ---------- candidate generator ----------
const O = P({ id: "o", category: "Beverages", price: 4.5, stock: 0 });
const A = P({ id: "a", name: "A", price: 4.2 }), B = P({ id: "b", name: "B", category: "Dairy", price: 3.8 });
const Cc = P({ id: "c", name: "C", price: 2.9 }), D = P({ id: "d", name: "D", price: 4.4 }), Z = P({ id: "z", name: "Z", isActive: false });
const db = [O, A, B, Cc, D, Z];
const src = {
  getLabels: async (i) => (i === "o" ? [
    { substituteId: "b", relationType: "partial", similarityScore: 0.55, source: "admin" },
    { substituteId: "a", relationType: "close", similarityScore: 0.9, source: "system" },
    { substituteId: "z", relationType: "close", similarityScore: 0.8, source: "system" },
    { substituteId: "o", relationType: "exact", similarityScore: 1, source: "system" },
  ] : []),
  getProductsByIds: async (ids) => db.filter((p) => ids.includes(p.id) && p.isActive),
  getCategoryProducts: async (cat, ex, lim) => db.filter((p) => p.category === cat && p.isActive && p.id !== ex).slice(0, lim),
};
const gen = E.createCandidateGenerator(src);
const full = await gen.generate({ original: O });
check("labeled first, then category by price proximity", full.candidates.map((c) => c.product.id).join() === "a,b,d,c");
check("original/inactive excluded; cap keeps labeled first", !full.candidates.some((c) => ["o", "z"].includes(c.product.id)) && (await gen.generate({ original: O, maxCandidates: 3 })).candidates.map((c) => c.product.id).join() === "a,b,d");
check("generator passes out-of-stock through", (await E.createCandidateGenerator({ ...src, getLabels: async () => [], getCategoryProducts: async () => [P({ id: "s", stock: 0 })] }).generate({ original: O })).candidates[0].product.id === "s");
const flow = E.applyConstraints({ candidates: full.candidates, original: O, requirements: { maxBudget: 4.3 } });
check("generator + constraints end to end", flow.rejected.map((r) => `${r.candidate.product.id}:${r.rule}`).join() === "b:category,d:budget" && flow.feasible.map((c) => c.product.id).join() === "a,c");

// ---------- ranking ----------
const OO = P({ id: "o", name: "NutriPure Organic Almond Milk 1L", brand: "NutriPure", price: 4.5, attributes: { size: "1L", organic: true }, dietaryTags: ["vegan", "vegetarian", "lactose-free", "gluten-free"], stock: 0 });
const mk = (i, name, brand, price, tags, org = false) => P({ id: i, name, brand, price, attributes: { size: "1L", organic: org }, dietaryTags: tags, stock: 20 });
const RA = mk("a", "GreenFarm Almond Milk 1L", "GreenFarm", 4.2, OO.dietaryTags);
const RS = mk("s", "GreenFarm Soy Milk 1L", "GreenFarm", 3.8, ["vegan", "nut-free"]);
const RT = mk("t", "FreshLeaf Green Tea 20 bags", "FreshLeaf", 3, ["vegan"]);
const engine = E.createRankingEngine();
const rank = (list, req = {}, o = {}) => engine.rank({ original: OO, feasible: list.map((p) => (p.product ? p : C(p))), requirements: req, ...o });
const ids = (r) => r.ranked.map((x) => x.product.id).join();
check("similar outranks unrelated", ids(rank([RT, RS, RA])) === "a,s,t");
check("same type other brand scores 1, unrelated 0", E.nameSimilarity(OO, RA) === 1 && E.nameSimilarity(OO, RT) === 0);
const tea = C(RT, { origin: "label", label: { relationType: "close", similarityScore: 0.99, source: "admin" } });
check("curated score overrides computed", ids(rank([C(RA), tea])) === "t,a" && rank([C(RA), tea]).ranked[0].breakdown.similarity.basis === "curated");
const b1 = mk("b1", "AlphaBrand Almond Milk 1L", "AlphaBrand", 4.2, OO.dietaryTags), b2 = mk("b2", "GreenFarm Almond Milk 1L", "GreenFarm", 4.2, OO.dietaryTags);
check("preferred brand (case-insensitive) moves up", ids(rank([b1, b2])) === "b1,b2" && ids(rank([b1, b2], { preferredBrands: ["greenfarm"] })) === "b2,b1");
check("final = 0.7 sim + 0.3 pref; scores bounded", rank([RA, RS, RT]).ranked.every((r) => Math.abs(r.finalScore - (0.7 * r.similarityScore + 0.3 * r.preferenceScore)) < 0.0002 && [r.similarityScore, r.preferenceScore, r.finalScore].every((n) => n >= 0 && n <= 1)));
const many = Array.from({ length: 12 }, (_, i) => P({ id: `m${String(i).padStart(2, "0")}`, name: `Item ${i}`, price: 1 + i }));
check("topN default 5, override works, never invents products", rank(many).ranked.length === 5 && rank(many, {}, { topN: 50 }).ranked.length === 12 && rank(many, {}, { topN: 2 }).ranked.length === 2);
check("deterministic regardless of input order", ids(rank([...many].reverse(), {}, { topN: 12 })) === ids(rank(many, {}, { topN: 12 })));
check("malformed products never give NaN", rank([P({ id: "w1", price: NaN, attributes: undefined, dietaryTags: undefined, stock: undefined }), P({ id: "w2", price: Infinity, stock: Infinity })], { preferredBrands: ["x"] }).ranked.every((r) => Number.isFinite(r.finalScore)));
check("bad weights/topN/scorer output throw", throwsEngine(() => E.resolveRankingConfig({ topN: 0 })) && throwsEngine(() => E.resolveRankingConfig({ finalWeights: { constructor: 1 } })) && throwsEngine(() => E.createRankingEngine({ similarityScorer: () => ({ score: NaN }) }).rank({ original: OO, feasible: [C(RA)], requirements: {} })));

// ---------- explanation engine ----------
const exItem = (p, o = {}) => rank([C(p, o.cand)], o.req ?? {}).ranked[0];
const ex = (p, req = {}, o = {}) => { const norm = E.normalizeRequirements(req); return E.buildExplanation({ original: OO, item: exItem(p, { req: norm, cand: o.cand }), requirements: norm, quantity: o.quantity ?? 1 }); };
const t1 = ex(RA, { maxBudget: 5, dietaryRestrictions: ["vegan", "gluten-free"], preferredBrands: ["GreenFarm"] });
check("tags reflect verified constraints", ["Within budget", "Vegan-friendly", "Gluten-free", "Preferred brand", "Same category", "Lower price"].every((t) => t1.tags.includes(t)));
check("no budget tag without a budget, no diet tag without restriction", !ex(RA).tags.includes("Within budget") && !ex(RA).tags.includes("Vegan-friendly"));
check("never claims a dietary tag the product lacks", !ex(RS, { dietaryRestrictions: ["gluten-free"] }).tags.includes("Gluten-free"));
check("never claims 'Within budget' when over budget", !ex(RA, { maxBudget: 1 }).tags.includes("Within budget"));
check("organic tags", ex(mk("og", "X Organic Almond Milk 1L", "X", 4, [], true), { organicOnly: true }).tags.includes("Organic") && ex(mk("og", "X Organic Almond Milk 1L", "X", 4, [], true)).tags.includes("Organic match") && !ex(RA).tags.includes("Organic match"));
check("price tags", ex(mk("hi", "X Almond Milk 1L", "X", 9, [])).tags.every((t) => t !== "Lower price") && ex(mk("eq", "X Almond Milk 1L", "X", 4.5, [])).tags.includes("Same price"));
check("curated-by-admin only for admin labels", ex(RT, {}, { cand: { origin: "label", label: { relationType: "close", similarityScore: 0.9, source: "admin" } } }).tags.includes("Curated by admin") && !ex(RT, {}, { cand: { origin: "label", label: { relationType: "close", similarityScore: 0.9, source: "system" } } }).tags.includes("Curated by admin"));
check("quantity tag", ex(RA, {}, { quantity: 2 }).tags.includes("Enough stock for your order") && ex(RA).tags.includes("In stock"));
check("no AI tags without AI evidence", !t1.tags.some((t) => ["Semantically similar", "Highly rated by shoppers", "Matches your past choices"].includes(t)));
check("explanation sentence mentions the product and a score", t1.explanation.includes("GreenFarm Almond Milk 1L") && /\d+% match/.test(t1.explanation));
check("facts for the LLM contain only verified data", t1.facts.substitute === RA.name && t1.facts.tags === t1.tags);

// ---------- AI scorers ----------
const vecs = new Map([["o", [1, 0, 0]], ["a", [1, 0, 0]], ["t", [0, 1, 0]]]);
const embScorer = E.createEmbeddingSimilarityScorer({ vectors: vecs, weight: 0.5 });
const eng2 = E.createRankingEngine({ similarityScorer: embScorer });
const r2 = eng2.rank({ original: OO, feasible: [C(RT), C(RA)], requirements: {} });
check("embedding scorer is hybrid and reports cosine", r2.ranked[0].product.id === "a" && r2.ranked[0].breakdown.similarity.ai.cosine === 1 && r2.ranked[0].breakdown.similarity.basis === "hybrid");
check("orthogonal vectors lower the score", r2.ranked[1].breakdown.similarity.ai.cosine === 0 && r2.ranked[1].similarityScore < rank([RT]).ranked[0].similarityScore + 1e-9);
check("missing vector falls back to rule-based", E.createRankingEngine({ similarityScorer: E.createEmbeddingSimilarityScorer({ vectors: new Map() }) }).rank({ original: OO, feasible: [C(RA)], requirements: {} }).ranked[0].similarityScore === rank([RA]).ranked[0].similarityScore);
check("cosine edge cases", E.cosine([1, 0], [1, 0]) === 1 && E.cosine([], []) === 0 && E.cosine([0, 0], [1, 1]) === 0 && E.cosine([1], [1, 2]) === 0);
check("embedding output hints appear in tags", (() => { const it = r2.ranked[0]; return E.buildExplanation({ original: OO, item: it, requirements: {} }).tags.includes("Semantically similar"); })());

const sig = E.buildSignals({
  userDecisions: [{ brand: "GreenFarm", decision: "accepted" }, { brand: "greenfarm", decision: "accepted" }, { brand: "AlphaBrand", decision: "rejected" }],
  ratings: [{ productId: "b2", avg: 5, count: 6 }, { productId: "b1", avg: 1, count: 6 }],
  pairs: [{ substituteId: "b2", accepted: 4, rejected: 0 }],
});
const eng3 = E.createRankingEngine({ preferenceScorer: E.createLearnedPreferenceScorer({ signals: sig, weight: 0.5 }) });
const r3 = eng3.rank({ original: OO, feasible: [C(b1), C(b2)], requirements: {} });
check("learned scorer prefers accepted brand / well-rated product", r3.ranked[0].product.id === "b2" && r3.ranked[0].preferenceScore > r3.ranked[1].preferenceScore);
check("learned details are reported", r3.ranked[0].breakdown.preference.learned.used === true && r3.ranked[0].breakdown.preference.learned.rating.count === 6);
check("no evidence leaves the rule-based score unchanged", E.createRankingEngine({ preferenceScorer: E.createLearnedPreferenceScorer({ signals: E.buildSignals() }) }).rank({ original: OO, feasible: [C(RA)], requirements: {} }).ranked[0].preferenceScore === rank([RA]).ranked[0].preferenceScore);
check("single 5-star review is shrunk toward neutral", (() => { const s = E.buildSignals({ ratings: [{ productId: "a", avg: 5, count: 1 }] }); const sc = E.createLearnedPreferenceScorer({ signals: s, weight: 1 }); return sc(C(RA), { original: OO, requirements: E.normalizeRequirements({}), quantity: 1, weights: E.DEFAULT_RANKING_CONFIG.preferenceWeights }).score < 0.7; })());
check("AI never changes WHICH products are returned", ids(eng3.rank({ original: OO, feasible: [C(b2), C(b1), C(RA)], requirements: {}, topN: 10 })).split(",").sort().join() === "a,b1,b2");
check("learned tags need real evidence", E.buildExplanation({ original: OO, item: r3.ranked[0], requirements: {} }).tags.includes("Highly rated by shoppers") && E.buildExplanation({ original: OO, item: r3.ranked[0], requirements: {} }).tags.includes("Matches your past choices"));

// ---------- local embeddings ----------
const eo = embedLocal(productText({ name: "A Oat Milk 1L", brand: "A", category: "Beverages", dietaryTags: ["vegan"] }));
const ea = embedLocal(productText({ name: "B Almond Milk 1L", brand: "B", category: "Beverages", dietaryTags: ["vegan"] }));
const et = embedLocal(productText({ name: "C Basmati Rice 1kg", brand: "C", category: "Pantry", dietaryTags: [] }));
check("local embedding: related > unrelated, normalized, deterministic", E.cosine(eo, ea) > E.cosine(eo, et) && Math.abs(Math.hypot(...eo) - 1) < 1e-9 && JSON.stringify(eo) === JSON.stringify(embedLocal(productText({ name: "A Oat Milk 1L", brand: "A", category: "Beverages", dietaryTags: ["vegan"] }))));
check("product text drops the brand", !productText({ name: "GreenFarm Soy Milk 1L", brand: "GreenFarm", category: "X" }).includes("GreenFarm"));

// ---------- seed labels ----------
const prods = catalog.map((c) => ({ ...c.product, _id: id() }));
const labels = buildLabels(prods);
const byId = new Map(prods.map((p) => [String(p._id), p]));
check("labels: no self/duplicates, schema valid", labels.length > 0 && labels.every((l) => String(l.originalProduct) !== String(l.substituteProduct) && !new SubstituteLabel(l).validateSync()) && new Set(labels.map((l) => `${l.originalProduct}|${l.substituteProduct}`)).size === labels.length);
check("labels stay inside groups; close never drops a diet tag", labels.filter((l) => l.relationType !== "exact").every((l) => groupIndexOf(typeOf(byId.get(String(l.originalProduct)))) === groupIndexOf(typeOf(byId.get(String(l.substituteProduct))))) && labels.filter((l) => l.relationType === "close").every((l) => byId.get(String(l.originalProduct)).dietaryTags.every((t) => byId.get(String(l.substituteProduct)).dietaryTags.includes(t))));
check("every group type exists in the catalog", GROUPS.flat().every((t) => new Set(prods.map(typeOf)).has(t)));

// ---------- orders ----------
const addr = { fullName: "Asha Rao", phone: "+91 98765 43210", line1: "12 Park Street", city: "Phagwara", postalCode: "144401" };
const line = { productId: id().toString(), quantity: 2 };
const okOrder = { items: [line], shippingAddress: addr, paymentMethod: "cod" };
check("checkout schema accepts a valid order and fills address defaults", checkoutSchema.safeParse(okOrder).success && checkoutSchema.parse(okOrder).shippingAddress.line2 === "");
check("checkout rejects empty cart / quantity 0 / fractional quantity", !checkoutSchema.safeParse({ ...okOrder, items: [] }).success && !checkoutSchema.safeParse({ ...okOrder, items: [{ ...line, quantity: 0 }] }).success && !checkoutSchema.safeParse({ ...okOrder, items: [{ ...line, quantity: 1.5 }] }).success);
check("checkout rejects bad phone, unknown payment, mock ids", !checkoutSchema.safeParse({ ...okOrder, shippingAddress: { ...addr, phone: "abc" } }).success && !checkoutSchema.safeParse({ ...okOrder, paymentMethod: "bitcoin" }).success && !checkoutSchema.safeParse({ ...okOrder, items: [{ productId: "p1", quantity: 1 }] }).success);
check("checkout strips client-sent price and total", (() => { const r = checkoutSchema.parse({ ...okOrder, items: [{ ...line, price: 0.01 }], total: 0.01 }); return !("total" in r) && !("price" in r.items[0]); })());
check("clientRequestId must be url-safe", checkoutSchema.safeParse({ ...okOrder, clientRequestId: "abcd1234-xyz" }).success && !checkoutSchema.safeParse({ ...okOrder, clientRequestId: "bad id!!" }).success);
check("order status schema", orderStatusSchema.safeParse({ status: "shipped" }).success && !orderStatusSchema.safeParse({ status: "teleported" }).success);
check("admin order list defaults", adminOrderListQuerySchema.parse({}).status === "all");
check("transitions cover every status; delivered/cancelled are terminal", ORDER_STATUSES.every((st) => st in ORDER_TRANSITIONS) && ORDER_TRANSITIONS.delivered.length === 0 && ORDER_TRANSITIONS.cancelled.length === 0);
check("no status can transition back to placed", Object.values(ORDER_TRANSITIONS).every((tos) => !tos.includes("placed")));
check("order model needs items and a valid payment method", !!new Order({ orderNumber: "x", user: id(), items: [], total: 0, paymentMethod: "cod", shippingAddress: addr }).validateSync() && !!new Order({ orderNumber: "x", user: id(), items: [{ product: id(), name: "n", price: 1, quantity: 1 }], total: 1, paymentMethod: "crypto", shippingAddress: addr }).validateSync());
check("order item rejects fractional quantity", !!new Order({ orderNumber: "x", user: id(), items: [{ product: id(), name: "n", price: 1, quantity: 1.5 }], total: 1, paymentMethod: "cod", shippingAddress: addr }).validateSync());

// ---------- architecture: engine stays pure ----------
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../recommendation");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(root).filter((f) => f.endsWith(".js"));
const forbidden = /from\s+["'](mongoose|express)["']|from\s+["'][^"']*\/(models|repositories|services|middleware|controllers|routes|config|ai)\/|\bfetch\(|process\.env/;
const offenders = files.filter((f) => forbidden.test(fs.readFileSync(f, "utf8").replace(/from "\.\.\/ai\/|from "\.\/ai\//g, "")));
check(`engine (${files.length} files) has no Express/Mongoose/network/env access`, files.length > 15 && offenders.length === 0);
if (offenders.length) console.log("   offenders:", offenders);

// ---------- HTTP layer (no database) ----------
const { default: app } = await import("../app.js");
const server = app.listen(0);
const apiBase = `http://127.0.0.1:${server.address().port}/api`;
const call = async (method, url, { body, token } = {}) => {
  const res = await fetch(apiBase + url, { method, headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const userTok = signToken({ _id: id() });
check("health is 503 without a DB, standard shape", (await call("GET", "/health")).status === 503);
check("unknown route -> 404 json", (await call("GET", "/nope")).json?.success === false);
check("register validation -> 422 with message", (await call("POST", "/auth/register", { body: { name: "A", email: "x", password: "1" } })).status === 422);
check("malformed JSON -> 400", (await (await fetch(apiBase + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{bad" })).status) === 400);
check("protected routes need a token (401)", (await Promise.all(["/preferences", "/admin/products", "/admin/analytics", "/orders", "/admin/orders"].map((u) => call("GET", u)))).every((r) => r.status === 401));
check("POST /recommendations without token -> 401", (await call("POST", "/recommendations", { body: {} })).status === 401);
check("invalid bearer token -> 401", (await call("GET", "/preferences", { token: "garbage" })).status === 401);
check("public list validates query (422)", (await call("GET", "/products?inStockOnly=maybe")).status === 422);
check("unknown product id -> 404 (no DB needed)", (await call("GET", "/products/zzz")).status === 404);
server.close();

console.log(`\n${total - failures}/${total} checks passed${failures ? `, ${failures} FAILED` : ""}.`);
process.exit(failures ? 1 : 0);
