// AI-layer end-to-end test against a REAL MongoDB. Run after `npm run test:e2e` (needs seed data).
import { connectDB, disconnectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { ROLES } from "../constants/index.js";
import { User } from "../models/index.js";
import { createAccount } from "../services/auth.service.js";
import { embeddingService } from "../ai/embedding.service.js";

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
const mail = (n) => `${n}${stamp}@e2eai.test`;

try {
  await createAccount({ name: "Admin", email: mail("adm"), password: "longenough1", role: ROLES.ADMIN });
  await createAccount({ name: "Shopper", email: mail("u"), password: "longenough1" });
  const A = (await call("POST", "/auth/login", { body: { email: mail("adm"), password: "longenough1" } })).data.token;
  const U = (await call("POST", "/auth/login", { body: { email: mail("u"), password: "longenough1" } })).data.token;

  await call("POST", "/admin/ai/embeddings", { token: A, body: {} });
  const orig = (await call("GET", "/admin/products?stockStatus=out&search=Milk&limit=1", { token: A })).data.items[0];
  const requirements = { maxBudget: 8, sameCategoryOnly: true, organicOnly: false, dietaryRestrictions: ["vegan"], preferredBrands: [] };
  const ask = (extra = {}) => call("POST", "/recommendations", { token: U, body: { productId: orig._id, requirements, topN: 50, ...extra } });

  env.AI_ENABLED = false;
  const off = await ask();
  check("AI off -> rule-based-v1", off.data.engineVersion === "rule-based-v1" && off.data.ai.enabled === false, off);

  env.AI_ENABLED = true;
  const on = await ask();
  check("AI on -> hybrid-v1 with embeddings", on.data.engineVersion === "hybrid-v1" && on.data.ai.embeddings === true, on);
  const idsOf = (r) => r.data.recommendations.map((x) => x.product._id).sort().join();
  check("AI never changes WHICH products are returned (same feasible set)", idsOf(off) === idsOf(on) && off.data.recommendations.length > 5);
  check("hard constraints still hold with AI on", on.data.recommendations.every((r) => r.product.stock > 0 && r.product.price <= 8 && r.product.dietaryTags.includes("vegan") && r.product.category === orig.category));
  check("scores stay within 0..1 with AI on", on.data.recommendations.every((r) => [r.similarityScore, r.preferenceScore, r.finalScore].every((n) => n >= 0 && n <= 1)));
  check("explanations still present with AI on", on.data.recommendations.every((r) => r.explanationTags.length > 0 && r.explanation.length > 10));

  // learning: accept a brand-specific substitute, then that brand should gain preference
  const target = on.data.recommendations[on.data.recommendations.length - 1];
  const before = target.preferenceScore;
  for (let i = 0; i < 3; i++) {
    await call("POST", "/recommendations/decisions", { token: U, body: { originalProductId: orig._id, substituteProductId: target.product._id, decision: "accepted" } });
  }
  await call("POST", "/feedback", { token: U, body: { originalProductId: orig._id, substituteProductId: target.product._id, rating: 5 } });
  const learned = await ask();
  const after = learned.data.recommendations.find((r) => r.product._id === target.product._id);
  check("learning: accepted + well-rated substitute gains preference score", after.preferenceScore > before, { before, after: after.preferenceScore });
  check("learning: result flagged as learned in the explanation tags", after.explanationTags.some((t) => ["Matches your past choices", "Often accepted for this product"].includes(t)), after.explanationTags);
  check("learning does not alter the feasible set", idsOf(learned) === idsOf(off));

  // graceful degradation: embeddings store failing must not break recommendations
  const original = embeddingService.loadVectors;
  embeddingService.loadVectors = async () => { throw new Error("vector store down"); };
  const degraded = await ask();
  embeddingService.loadVectors = original;
  check("embeddings failure degrades gracefully (still 200, still a valid result)", degraded.status === 200 && degraded.data.recommendations.length > 0 && degraded.data.ai.embeddings === false);

  // optional LLM explanations: with no key configured it silently falls back to the template
  env.AI_EXPLANATIONS = true;
  env.ANTHROPIC_API_KEY = "";
  const noKey = await ask({ topN: 2 });
  check("LLM explanations without a key fall back to the template sentence", noKey.status === 200 && noKey.data.recommendations.every((r) => /match to/.test(r.explanation)));
  env.AI_EXPLANATIONS = false;

  const an = await call("GET", "/admin/analytics", { token: A });
  check("analytics shows both engine versions", an.data.recommendations.engineVersions.some((v) => v.version === "hybrid-v1") && an.data.recommendations.engineVersions.some((v) => v.version === "rule-based-v1"), an.data?.recommendations?.engineVersions);
} catch (err) {
  failures++;
  console.error("AI e2e crashed:", err);
} finally {
  await User.deleteMany({ email: { $regex: `${stamp}@e2eai.test$` } });
  server.close();
  await disconnectDB();
}
console.log(`\n${total - failures}/${total} AI e2e checks passed${failures ? `, ${failures} FAILED` : ""}.`);
process.exit(failures ? 1 : 0);
