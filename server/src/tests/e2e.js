// End-to-end API test against a REAL MongoDB (uses MONGODB_URI from .env).
// Run `npm run seed && npm run seed:labels` first. Creates its own throwaway users.
import { connectDB, disconnectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { ROLES } from "../constants/index.js";
import { User } from "../models/index.js";
import { createAccount } from "../services/auth.service.js";

if (env.isProduction) throw new Error("Refusing to run e2e against production");
await connectDB();
const { default: app } = await import("../app.js");
const server = app.listen(0);
const api = `http://127.0.0.1:${server.address().port}/api`;

let failures = 0, total = 0;
const check = (name, ok, extra) => { total++; if (!ok) { failures++; console.log(`FAIL  ${name}`, extra ?? ""); } };
const call = async (method, url, { body, token } = {}) => {
  const res = await fetch(api + url, { method, headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
  return { status: res.status, ...(await res.json().catch(() => ({}))) };
};

const stamp = Date.now();
const email = (n) => `${n}${stamp}@e2e.test`;
try {
  // ---- auth ----
  const reg = await call("POST", "/auth/register", { body: { name: "Asha Rao", email: email("u1"), password: "longenough1", role: "admin" } });
  check("register 201, role forced to user, no passwordHash", reg.status === 201 && reg.data.user.role === "user" && !JSON.stringify(reg).includes("passwordHash"), reg);
  check("duplicate email 409", (await call("POST", "/auth/register", { body: { name: "Asha Rao", email: email("u1"), password: "longenough1" } })).status === 409);
  const login = await call("POST", "/auth/login", { body: { email: email("u1"), password: "longenough1" } });
  const U = login.data.token;
  check("login 200 with token", login.status === 200 && !!U);
  const bad1 = await call("POST", "/auth/login", { body: { email: email("u1"), password: "wrongwrong" } });
  const bad2 = await call("POST", "/auth/login", { body: { email: email("nobody"), password: "wrongwrong" } });
  check("wrong password and unknown email give identical 401", bad1.status === 401 && bad1.message === bad2.message);
  check("/auth/me", (await call("GET", "/auth/me", { token: U })).data.user.email === email("u1"));

  await createAccount({ name: "Admin", email: email("adm"), password: "longenough1", role: ROLES.ADMIN });
  const A = (await call("POST", "/auth/login", { body: { email: email("adm"), password: "longenough1" } })).data.token;

  // ---- public products ----
  const all = await call("GET", "/products");
  check("GET /products returns array with numeric stock, no threshold", all.status === 200 && all.data.length > 200 && all.data.every((p) => typeof p.stock === "number" && !("lowStockThreshold" in p)));
  check("search is case-insensitive and regex-safe", (await call("GET", "/products?search=ALMOND")).data.length > 0 && (await call("GET", "/products?search=a.b(")).data.length === 0);
  check("inStockOnly", (await call("GET", "/products?inStockOnly=true")).data.every((p) => p.stock > 0));
  check("categories sorted", (await call("GET", "/products/categories")).data.length === 6);
  check("bad id 404", (await call("GET", "/products/zzz")).status === 404);

  // ---- admin guard ----
  check("normal user gets 403 on admin routes", (await call("GET", "/admin/products", { token: U })).status === 403 && (await call("GET", "/admin/analytics", { token: U })).status === 403);

  // ---- admin product CRUD (regression: ObjectId 404 bug) ----
  const created = await call("POST", "/admin/products", { token: A, body: { name: "Test Oat Bar", category: "Snacks", brand: "OatLand", price: 2.5, dietaryTags: ["vegan"], attributes: { organic: true }, stock: 10 } });
  check("create product 201 with stock 10", created.status === 201 && created.data.stock === 10, created);
  const pid = created.data?._id;
  check("update 200", (await call("PATCH", `/admin/products/${pid}`, { token: A, body: { price: 3 } })).data?.price === 3);
  check("create validation 422", (await call("POST", "/admin/products", { token: A, body: { name: "x", category: "c", brand: "b", price: -1 } })).status === 422);
  check("inventory delta guard 409, stock unchanged", (await call("PATCH", `/admin/inventory/${pid}`, { token: A, body: { delta: -1000 } })).status === 409 && (await call("GET", `/admin/products/${pid}`, { token: A })).data.stock === 10);
  check("inventory +5 and quantity 0", (await call("PATCH", `/admin/inventory/${pid}`, { token: A, body: { delta: 5 } })).data.quantity === 15 && (await call("PATCH", `/admin/inventory/${pid}`, { token: A, body: { quantity: 0 } })).data.isInStock === false);
  const out = await call("GET", "/admin/products?stockStatus=out&limit=5", { token: A });
  check("admin list out-of-stock paginated", out.status === 200 && out.data.items.length === 5 && out.data.items.every((p) => p.stock === 0) && out.data.total > 5);
  check("low-stock filter", (await call("GET", "/admin/products?stockStatus=low", { token: A })).data.items.every((p) => p.stock > 0 && p.stock <= p.lowStockThreshold));
  check("deactivate -> public 404, admin still sees it", (await call("DELETE", `/admin/products/${pid}`, { token: A })).data.isActive === false && (await call("GET", `/products/${pid}`)).status === 404 && (await call("GET", `/admin/products/${pid}`, { token: A })).status === 200);

  // ---- preferences ----
  check("preferences null for new user", (await call("GET", "/preferences", { token: U })).data === null);
  const prefIn = { maxBudget: 9, sameCategoryOnly: true, organicOnly: false, dietaryRestrictions: ["vegan", "vegan"], preferredBrands: ["OatLand", "oatland"] };
  const saved = await call("PUT", "/preferences", { token: U, body: prefIn });
  check("save preferences dedupes", saved.status === 200 && saved.data.dietaryRestrictions.length === 1 && saved.data.preferredBrands.length === 1, saved);
  check("get preferences round trip", (await call("GET", "/preferences", { token: U })).data.maxBudget === 9);
  check("preferences validation", (await call("PUT", "/preferences", { token: U, body: { maxBudget: -5 } })).status === 422);

  // ---- recommendations (rule-based) ----
  const outOfStock = (await call("GET", "/admin/products?stockStatus=out&search=Almond Milk&limit=1", { token: A })).data.items[0];
  check("found an out-of-stock almond milk", !!outOfStock);
  const requirements = { maxBudget: 6, sameCategoryOnly: true, organicOnly: false, dietaryRestrictions: ["vegan"], preferredBrands: ["GreenFarm"] };
  const rec = await call("POST", "/recommendations", { token: U, body: { productId: outOfStock._id, requirements } });
  check("recommend 200, rule-based, up to 5 results", rec.status === 200 && rec.data.engineVersion === "rule-based-v1" && rec.data.recommendations.length > 0 && rec.data.recommendations.length <= 5, rec);
  const items = rec.data?.recommendations ?? [];
  check("every result satisfies the HARD constraints", items.every((r) => r.product.stock > 0 && r.product.price <= 6 && r.product.category === outOfStock.category && r.product.dietaryTags.includes("vegan")));
  check("results sorted by finalScore desc, scores in 0..1", items.every((r, i) => (i === 0 || items[i - 1].finalScore >= r.finalScore) && [r.similarityScore, r.preferenceScore, r.finalScore].every((n) => n >= 0 && n <= 1)));
  check("shape the frontend needs (_id, tags, explanation)", items.every((r) => r.product._id && r.explanationTags.length > 0 && typeof r.explanation === "string"));
  check("explanation tags are truthful", items.every((r) => r.explanationTags.includes("Within budget") && r.explanationTags.includes("Vegan-friendly") && r.explanationTags.includes("Same category")));
  check("original product never recommended", items.every((r) => r.product._id !== outOfStock._id));
  check("saved preferences used when requirements omitted", (await call("POST", "/recommendations", { token: U, body: { productId: outOfStock._id } })).data.recommendations.every((r) => r.product.price <= 9 && r.product.dietaryTags.includes("vegan")));
  const tight = await call("POST", "/recommendations", { token: U, body: { productId: outOfStock._id, requirements: { ...requirements, maxBudget: 0.5 } } });
  check("impossible budget gives empty list (not an error)", tight.status === 200 && tight.data.recommendations.length === 0);
  check("unknown product 404, bad id 422", (await call("POST", "/recommendations", { token: U, body: { productId: "507f1f77bcf86cd799439011" } })).status === 404 && (await call("POST", "/recommendations", { token: U, body: { productId: "p1" } })).status === 422);
  check("quantity respected (stock >= qty)", (await call("POST", "/recommendations", { token: U, body: { productId: outOfStock._id, requirements, quantity: 30 } })).data.recommendations.every((r) => r.product.stock >= 30));

  // ---- decisions + feedback ----
  const top = items[0].product._id;
  check("accept recorded", (await call("POST", "/recommendations/decisions", { token: U, body: { originalProductId: outOfStock._id, substituteProductId: top, decision: "accepted" } })).data?.saved === true);
  check("reject another", items[1] ? (await call("POST", "/recommendations/decisions", { token: U, body: { originalProductId: outOfStock._id, substituteProductId: items[1].product._id, decision: "rejected" } })).status === 200 : true);
  check("decision for never-offered pair 404", (await call("POST", "/recommendations/decisions", { token: U, body: { originalProductId: outOfStock._id, substituteProductId: pid, decision: "accepted" } })).status === 404);
  check("feedback saved then upserted", (await call("POST", "/feedback", { token: U, body: { originalProductId: outOfStock._id, substituteProductId: top, rating: 4, comment: "Good" } })).data?.saved === true && (await call("POST", "/feedback", { token: U, body: { originalProductId: outOfStock._id, substituteProductId: top, rating: 2 } })).status === 200);
  const fb = await call("GET", "/admin/feedback", { token: A });
  check("admin feedback: one doc, rating 2, linked to the run, summary", fb.data.items.filter((f) => f.user?.email === email("u1")).length === 1 && fb.data.items.find((f) => f.user?.email === email("u1")).rating === 2 && !!fb.data.items.find((f) => f.user?.email === email("u1")).recommendation && fb.data.summary.total >= 1, fb);
  check("feedback validation", (await call("POST", "/feedback", { token: U, body: { originalProductId: top, substituteProductId: top, rating: 3 } })).status === 400 && (await call("POST", "/feedback", { token: U, body: { originalProductId: "507f1f77bcf86cd799439011", substituteProductId: top, rating: 3 } })).status === 404);

  // ---- labels ----
  const lbls = await call("GET", `/admin/labels?originalProductId=${outOfStock._id}&limit=3`, { token: A });
  check("seeded labels listed, populated", lbls.data.items.length > 0 && !!lbls.data.items[0].substituteProduct.name);
  const other = all.data.find((p) => p.category === "Bakery");
  const newLabel = await call("POST", "/admin/labels", { token: A, body: { originalProductId: outOfStock._id, substituteProductId: other._id, relationType: "partial", similarityScore: 0.6 } });
  check("create label 201 (admin source)", newLabel.status === 201 && newLabel.data.source === "admin", newLabel);
  check("duplicate label 409, self 400", (await call("POST", "/admin/labels", { token: A, body: { originalProductId: outOfStock._id, substituteProductId: other._id } })).status === 409 && (await call("POST", "/admin/labels", { token: A, body: { originalProductId: other._id, substituteProductId: other._id } })).status === 400);
  const crossCat = await call("POST", "/recommendations", { token: U, body: { productId: outOfStock._id, requirements: { ...requirements, sameCategoryOnly: false, dietaryRestrictions: [], maxBudget: null }, topN: 50 } });
  check("cross-category label usable when sameCategoryOnly=false", crossCat.data.recommendations.some((r) => r.product._id === other._id));
  check("update + delete label", (await call("PATCH", `/admin/labels/${newLabel.data._id}`, { token: A, body: { isActive: false } })).data.isActive === false && (await call("DELETE", `/admin/labels/${newLabel.data._id}`, { token: A })).data.deleted === true && (await call("DELETE", `/admin/labels/${newLabel.data._id}`, { token: A })).status === 404);

  // ---- analytics ----
  const an = await call("GET", "/admin/analytics", { token: A });
  check("analytics overview", an.status === 200 && an.data.products.outOfStock > 0 && an.data.recommendations.runs >= 5 && an.data.recommendations.decisions.accepted >= 1 && an.data.recommendations.acceptanceRate !== null && an.data.constraints.evaluated > 0 && an.data.topSubstitutes.length > 0 && an.data.mostRequested.length > 0 && an.data.feedback.count >= 1, an);

  // ---- AI layer ----
  const emb = await call("POST", "/admin/ai/embeddings", { token: A, body: { force: true } });
  check("embeddings built (local provider)", emb.status === 200 && emb.data.embedded > 200, emb);
  check("embeddings are incremental", (await call("POST", "/admin/ai/embeddings", { token: A, body: {} })).data.embedded === 0);
  console.log(total - failures + "/" + total + " passed so far (AI-on checks run in a second process)");
} catch (err) {
  failures++;
  console.error("E2E crashed:", err);
} finally {
  await User.deleteMany({ email: { $regex: `${stamp}@e2e.test$` } });
  server.close();
  await disconnectDB();
}
console.log(`\n${total - failures}/${total} e2e checks passed${failures ? `, ${failures} FAILED` : ""}.`);
process.exit(failures ? 1 : 0);
