// Orders / checkout / demo end-to-end test against a REAL MongoDB. Run after `npm run seed && npm run seed:labels`.
import { connectDB, disconnectDB } from "../config/db.js";
import { ROLES } from "../constants/index.js";
import { Order, Product, ProductStock, Recommendation, User } from "../models/index.js";
import { createAccount } from "../services/auth.service.js";

await connectDB();
const { default: app } = await import("../app.js");
const server = app.listen(0);
const api = `http://127.0.0.1:${server.address().port}/api`;
let failures = 0, total = 0;
const check = (name, ok, extra) => { total++; if (!ok) { failures++; console.log(`FAIL  ${name}`, extra ? JSON.stringify(extra).slice(0, 400) : ""); } };
const call = async (method, url, { body, token } = {}) => {
  const res = await fetch(api + url, { method, headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
  return { status: res.status, ...(await res.json().catch(() => ({}))) };
};
const stamp = Date.now();
const mail = (n) => `${n}${stamp}@e2eord.test`;
const address = { fullName: "Asha Rao", phone: "+91 98765 43210", line1: "12 Park Street", city: "Phagwara", postalCode: "144401" };
const made = [];

try {
  await createAccount({ name: "Admin", email: mail("adm"), password: "longenough1", role: ROLES.ADMIN });
  await createAccount({ name: "Buyer One", email: mail("a"), password: "longenough1" });
  await createAccount({ name: "Buyer Two", email: mail("b"), password: "longenough1" });
  const login = async (n) => (await call("POST", "/auth/login", { body: { email: mail(n), password: "longenough1" } })).data.token;
  const [A, T1, T2] = [await login("adm"), await login("a"), await login("b")];

  const mk = async (name, stock, price = 2.5) => {
    const r = await call("POST", "/admin/products", { token: A, body: { name: `ZZ ${name} ${stamp}`, category: "Snacks", brand: "TestCo", price, dietaryTags: ["vegan"], attributes: { organic: false, size: "1" }, stock } });
    made.push(r.data._id);
    return r.data;
  };
  const stockOf = async (p) => (await call("GET", `/admin/products/${p._id}`, { token: A })).data.stock;
  const item = (p, quantity = 1, extra = {}) => ({ productId: p._id, quantity, ...extra });
  const checkout = (token, items, extra = {}) => call("POST", "/orders", { token, body: { items, shippingAddress: address, paymentMethod: "cod", ...extra } });

  const P1 = await mk("Alpha", 5, 2.5), P2 = await mk("Beta", 1, 4.1), P3 = await mk("Gamma", 10, 1.1);

  // ---- happy path ----
  const ok = await checkout(T1, [item(P1, 2), item(P3, 3)], { price: 0.01, total: 0.01 });
  check("checkout 201 with order number, status placed", ok.status === 201 && /^SS-/.test(ok.data.orderNumber) && ok.data.status === "placed", ok);
  check("prices come from the database, client price/total ignored", ok.data.total === 8.3 && ok.data.items.find((i) => i.name.includes("Alpha")).price === 2.5, ok.data);
  check("stock reduced exactly", (await stockOf(P1)) === 3 && (await stockOf(P3)) === 7);
  check("cod is pending, demo-card is paid", ok.data.paymentStatus === "pending" && (await checkout(T1, [item(P3, 1)], { paymentMethod: "demo-card" })).data.paymentStatus === "paid");

  // ---- validation ----
  check("empty cart 422", (await checkout(T1, [])).status === 422);
  check("bad phone 422", (await call("POST", "/orders", { token: T1, body: { items: [item(P3)], shippingAddress: { ...address, phone: "abc" }, paymentMethod: "cod" } })).status === 422);
  check("unknown payment method 422", (await checkout(T1, [item(P3)], { paymentMethod: "bitcoin" })).status === 422);
  check("requires login", (await call("POST", "/orders", { body: {} })).status === 401);
  check("quantity 0 / fractional 422", (await checkout(T1, [item(P3, 0)])).status === 422 && (await checkout(T1, [item(P3, 1.5)])).status === 422);

  // ---- insufficient stock: nothing is taken, with details ----
  const before = [await stockOf(P1), await stockOf(P2)];
  const tooMany = await checkout(T1, [item(P1, 1), item(P2, 5)]);
  check("insufficient stock 409 with item details", tooMany.status === 409 && tooMany.errors?.[0]?.name.includes("Beta") && tooMany.errors[0].available === 1, tooMany);
  check("failed checkout leaves ALL stock untouched (no partial take)", (await stockOf(P1)) === before[0] && (await stockOf(P2)) === before[1]);

  // ---- race for the last unit ----
  const race = await Promise.all([checkout(T1, [item(P2, 1)]), checkout(T2, [item(P2, 1)])]);
  const statuses = race.map((r) => r.status).sort();
  check("two buyers, one unit: exactly one wins, one gets 409", statuses.join() === "201,409", race.map((r) => r.status));
  check("stock never goes negative", (await stockOf(P2)) === 0);
  const orderCountBefore = await Order.countDocuments({ items: { $elemMatch: { product: P2._id } } });
  check("only one order exists for the contested item", orderCountBefore === 1);

  // ---- multi-line rollback when a LATER line fails under contention ----
  const P4 = await mk("Delta", 1), P5 = await mk("Epsilon", 3);
  await checkout(T2, [item(P4, 1)]); // P4 is now sold out
  const rb = await checkout(T1, [item(P5, 2), item(P4, 1)]);
  check("order with a sold-out line is rejected", rb.status === 409);
  check("earlier line was not left decremented", (await stockOf(P5)) === 3);

  // ---- idempotency ----
  const P6 = await mk("Zeta", 5);
  const rid = `req-${stamp}-aaaa`;
  const dup = await Promise.all([checkout(T1, [item(P6, 2)], { clientRequestId: rid }), checkout(T1, [item(P6, 2)], { clientRequestId: rid })]);
  check("double submit returns the same order", dup.every((d) => d.status === 201 || d.status === 200) && dup[0].data.orderNumber === dup[1].data.orderNumber, dup.map((d) => [d.status, d.data?.orderNumber]));
  check("double submit takes stock only once", (await stockOf(P6)) === 3);
  check("later retry with same id is still the same order", (await checkout(T1, [item(P6, 2)], { clientRequestId: rid })).data.orderNumber === dup[0].data.orderNumber && (await stockOf(P6)) === 3);

  // ---- deactivated product ----
  const P7 = await mk("Eta", 5);
  await call("DELETE", `/admin/products/${P7._id}`, { token: A });
  const dead = await checkout(T1, [item(P7, 1)]);
  check("deactivated product cannot be bought", dead.status === 409 && dead.errors[0].reason === "unavailable");

  // ---- order history and privacy ----
  const mine = await call("GET", "/orders", { token: T1 });
  check("my orders listed newest first, paginated", mine.status === 200 && mine.data.items.length >= 3 && mine.data.items[0].createdAt >= mine.data.items[1].createdAt && mine.data.pages >= 1);
  check("order detail", (await call("GET", `/orders/${ok.data._id}`, { token: T1 })).data.orderNumber === ok.data.orderNumber);
  check("another user cannot read or cancel my order (404)", (await call("GET", `/orders/${ok.data._id}`, { token: T2 })).status === 404 && (await call("POST", `/orders/${ok.data._id}/cancel`, { token: T2 })).status === 404);
  check("bad order id 404", (await call("GET", "/orders/zzz", { token: T1 })).status === 404);

  // ---- cancel restocks ----
  const s1 = await stockOf(P1), s3 = await stockOf(P3);
  const cancelled = await call("POST", `/orders/${ok.data._id}/cancel`, { token: T1 });
  check("cancel works and restocks exactly", cancelled.status === 200 && cancelled.data.status === "cancelled" && (await stockOf(P1)) === s1 + 2 && (await stockOf(P3)) === s3 + 3, cancelled);
  check("cannot cancel twice, no double restock", (await call("POST", `/orders/${ok.data._id}/cancel`, { token: T1 })).status === 409 && (await stockOf(P1)) === s1 + 2);
  const [c1, c2] = await Promise.all([0, 1].map(async () => { const o = await checkout(T1, [item(P3, 1)]); return o; }));
  const stockBeforeRaceCancel = await stockOf(P3);
  const rc = await Promise.all([call("POST", `/orders/${c1.data._id}/cancel`, { token: T1 }), call("POST", `/orders/${c1.data._id}/cancel`, { token: T1 })]);
  check("parallel cancels: one wins, stock restored once", rc.map((r) => r.status).sort().join() === "200,409" && (await stockOf(P3)) === stockBeforeRaceCancel + 1, rc.map((r) => r.status));

  // ---- admin order management ----
  check("normal user gets 403 on admin orders", (await call("GET", "/admin/orders", { token: T1 })).status === 403);
  const adminList = await call("GET", "/admin/orders?status=placed&limit=5", { token: A });
  check("admin lists orders with customer info and status filter", adminList.status === 200 && adminList.data.items.every((o) => o.status === "placed" && o.user?.email) && adminList.data.total >= 1, adminList);
  check("admin search by order number", (await call("GET", `/admin/orders?search=${c2.data.orderNumber}`, { token: A })).data.items.length === 1);
  const shipped = await call("PATCH", `/admin/orders/${c2.data._id}/status`, { token: A, body: { status: "shipped" } });
  check("placed -> shipped", shipped.status === 200 && shipped.data.status === "shipped" && shipped.data.statusHistory.length === 2, shipped);
  check("customer can no longer cancel a shipped order", (await call("POST", `/orders/${c2.data._id}/cancel`, { token: T1 })).status === 409);
  check("shipped -> placed rejected", (await call("PATCH", `/admin/orders/${c2.data._id}/status`, { token: A, body: { status: "placed" } })).status === 409);
  check("invalid status 422", (await call("PATCH", `/admin/orders/${c2.data._id}/status`, { token: A, body: { status: "teleported" } })).status === 422);
  const sBefore = await stockOf(P3);
  const adminCancel = await call("PATCH", `/admin/orders/${c2.data._id}/status`, { token: A, body: { status: "cancelled" } });
  check("admin cancel restocks and sets cancelledAt", adminCancel.status === 200 && (await stockOf(P3)) === sBefore + 1 && !!adminCancel.data.cancelledAt);
  const o3 = await checkout(T1, [item(P3, 1)]);
  await call("PATCH", `/admin/orders/${o3.data._id}/status`, { token: A, body: { status: "shipped" } });
  check("shipped -> delivered", (await call("PATCH", `/admin/orders/${o3.data._id}/status`, { token: A, body: { status: "delivered" } })).data.status === "delivered");
  check("delivered cannot be cancelled", (await call("PATCH", `/admin/orders/${o3.data._id}/status`, { token: A, body: { status: "cancelled" } })).status === 409);
  check("refund marks paid orders as refunded", await (async () => { const o = await checkout(T1, [item(P3, 1)], { paymentMethod: "demo-card" }); return (await call("PATCH", `/admin/orders/${o.data._id}/status`, { token: A, body: { status: "cancelled" } })).data.paymentStatus === "refunded"; })());

  // ---- substitution verification ----
  const outOfStock = (await call("GET", "/admin/products?stockStatus=out&search=Milk&limit=1", { token: A })).data.items.find((p) => !made.includes(p._id));
  const rec = await call("POST", "/recommendations", { token: T1, body: { productId: outOfStock._id, requirements: { sameCategoryOnly: true, dietaryRestrictions: [], preferredBrands: [], maxBudget: null, organicOnly: false } } });
  const offered = rec.data.recommendations[0].product;
  const subOrder = await checkout(T1, [item({ _id: offered._id }, 1, { substitutedForId: outOfStock._id })]);
  check("verified substitution is recorded on the order item", subOrder.status === 201 && subOrder.data.items[0].substitutedFor?.name === outOfStock.name, subOrder);
  const fake = await checkout(T2, [item({ _id: offered._id }, 1, { substitutedForId: outOfStock._id })]);
  check("a substitution the server never offered this user is NOT recorded", fake.status === 201 && !fake.data.items[0].substitutedFor, fake.data?.items);

  // ---- analytics + demo ----
  const an = await call("GET", "/admin/analytics", { token: A });
  check("analytics includes orders, revenue and substitution sales", an.data.orders.orders >= 1 && an.data.orders.revenue > 0 && an.data.orders.ordersWithSubstitutes >= 1 && an.data.orders.substitutedUnits >= 1 && an.data.orders.byStatus.cancelled >= 1, an.data?.orders);

  const ex = await call("GET", "/demo/examples");
  check("demo examples are out of stock and varied", ex.status === 200 && ex.data.length >= 3 && new Set(ex.data.map((p) => p.category)).size >= 3);
  const runsBefore = await Recommendation.countDocuments();
  const demo = await call("POST", "/demo/recommend", { body: { productId: outOfStock._id, requirements: { dietaryRestrictions: ["vegan"], maxBudget: 8, sameCategoryOnly: true, organicOnly: false, preferredBrands: [] } } });
  check("demo works without login, rule-based, respects constraints", demo.status === 200 && demo.data.engineVersion === "rule-based-v1" && demo.data.recommendations.length > 0 && demo.data.recommendations.every((r) => r.product.price <= 8 && r.product.dietaryTags.includes("vegan") && r.product.stock > 0), demo);
  check("demo stores nothing", (await Recommendation.countDocuments()) === runsBefore && demo.data.recommendationId === null);
  check("demo validates input", (await call("POST", "/demo/recommend", { body: { productId: "p1" } })).status === 422);
  const st = await call("GET", "/demo/stats");
  check("public stats", st.status === 200 && st.data.products > 200 && st.data.categories === 6 && st.data.outOfStock > 0);
} catch (err) {
  failures++;
  console.error("Orders e2e crashed:", err);
} finally {
  await Order.deleteMany({ "shippingAddress.fullName": address.fullName, createdAt: { $gte: new Date(stamp) } });
  await Product.deleteMany({ name: { $regex: `^ZZ .* ${stamp}$` } });
  await ProductStock.deleteMany({ product: { $in: made } });
  await User.deleteMany({ email: { $regex: `${stamp}@e2eord.test$` } });
  server.close();
  await disconnectDB();
}
console.log(`\n${total - failures}/${total} order e2e checks passed${failures ? `, ${failures} FAILED` : ""}.`);
process.exit(failures ? 1 : 0);
