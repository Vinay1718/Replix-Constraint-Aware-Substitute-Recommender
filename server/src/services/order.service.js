import { randomBytes } from "node:crypto";
import { ORDER_TRANSITIONS } from "../constants/index.js";
import { orderRepository } from "../repositories/order.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { recommendationRepository } from "../repositories/recommendation.repository.js";
import { stockRepository } from "../repositories/stock.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { toObjectId } from "../utils/objectId.js";
import { escapeRegex } from "../utils/regex.js";

const cents = (n) => Math.round(n * 100);
const NOT_FOUND = "Order not found.";
const newOrderNumber = () => `SS-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;

const requireOid = (id) => {
  const oid = toObjectId(id);
  if (!oid) throw ApiError.notFound(NOT_FOUND);
  return oid;
};

const restockItems = (items) => Promise.all(items.map((i) => stockRepository.restore(i.product, i.quantity)));

const pageOf = (items, total, page, limit) => ({ items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });

export const orderService = {
  /**
   * Prices and names come from the DATABASE, never from the client.
   * Stock is taken with a guarded atomic decrement per item. If any item fails
   * (someone else bought the last unit) everything already taken is given back.
   */
  async placeOrder(user, { items, shippingAddress, paymentMethod, clientRequestId }) {
    // Double-submit protection: same request id -> same order
    if (clientRequestId) {
      const existing = await orderRepository.findByClientRequest(user._id, clientRequestId);
      if (existing) return existing;
    }

    // Merge duplicate lines
    const merged = new Map();
    for (const line of items) {
      const cur = merged.get(line.productId) ?? { productId: line.productId, quantity: 0, substitutedForId: undefined };
      cur.quantity += line.quantity;
      cur.substitutedForId ??= line.substitutedForId;
      merged.set(line.productId, cur);
    }
    const lines = [...merged.values()];
    if (lines.some((l) => l.quantity > 99)) throw ApiError.badRequest("You can order at most 99 of one item.");

    const oids = lines.map((l) => toObjectId(l.productId));
    const docs = await productRepository.list({ match: { _id: { $in: oids } }, limit: oids.length });
    const byId = new Map(docs.map((d) => [String(d._id), d]));

    // Everything must be purchasable right now
    const problems = [];
    for (const l of lines) {
      const p = byId.get(l.productId);
      if (!p || !p.isActive) problems.push({ productId: l.productId, name: p?.name ?? "Unknown product", reason: "unavailable", requested: l.quantity, available: 0 });
      else if (p.stock < l.quantity) problems.push({ productId: l.productId, name: p.name, reason: p.stock === 0 ? "out_of_stock" : "insufficient_stock", requested: l.quantity, available: p.stock });
    }
    if (problems.length) throw ApiError.conflict("Some items are no longer available in the requested quantity.", problems);

    // Take stock atomically; roll back on any failure
    const taken = [];
    try {
      for (const l of lines) {
        const result = await stockRepository.adjust(toObjectId(l.productId), -l.quantity);
        if (!result) {
          const p = byId.get(l.productId);
          throw ApiError.conflict("Some items are no longer available in the requested quantity.", [
            { productId: l.productId, name: p.name, reason: "out_of_stock", requested: l.quantity, available: 0 },
          ]);
        }
        taken.push({ product: toObjectId(l.productId), quantity: l.quantity });
      }

      // A substitution is recorded only if the server really offered it to this user
      const orderItems = [];
      for (const l of lines) {
        const p = byId.get(l.productId);
        const item = { product: p._id, name: p.name, brand: p.brand, category: p.category, price: p.price, quantity: l.quantity };
        const origId = toObjectId(l.substitutedForId);
        if (origId && String(origId) !== l.productId) {
          const offered = await recommendationRepository.findLatestOffering({ user: user._id, originalProduct: origId, substituteProduct: p._id });
          const original = offered && (await productRepository.findById(origId));
          if (original) item.substitutedFor = { product: original._id, name: original.name };
        }
        orderItems.push(item);
      }

      const total = orderItems.reduce((sum, i) => sum + cents(i.price) * i.quantity, 0) / 100;
      const now = new Date();
      const order = await orderRepository.create({
        orderNumber: newOrderNumber(),
        user: user._id,
        ...(clientRequestId && { clientRequestId }),
        items: orderItems,
        total,
        status: "placed",
        statusHistory: [{ status: "placed", at: now }],
        paymentMethod,
        paymentStatus: paymentMethod === "demo-card" ? "paid" : "pending",
        shippingAddress,
      });
      return order.toObject();
    } catch (err) {
      await restockItems(taken); // give everything back
      if (err.code === 11000 && clientRequestId) {
        // Lost a race with the same request id: return the winner
        const winner = await orderRepository.findByClientRequest(user._id, clientRequestId);
        if (winner) return winner;
      }
      throw err;
    }
  },

  async listMine(user, { page, limit }) {
    const [items, total] = await Promise.all([orderRepository.pageMine({ user: user._id, skip: (page - 1) * limit, limit }), orderRepository.countMine(user._id)]);
    return pageOf(items, total, page, limit);
  },

  async getMine(user, id) {
    const found = await orderRepository.findMine(user._id, requireOid(id));
    if (!found) throw ApiError.notFound(NOT_FOUND);
    return found;
  },

  // Customers may cancel only while the order is still "placed"
  async cancelMine(user, id) {
    const oid = requireOid(id);
    const updated = await orderRepository.transition({
      filter: { _id: oid, user: user._id },
      from: ["placed"],
      to: "cancelled",
      extra: { cancelledAt: new Date() },
    });
    if (!updated) {
      const exists = await orderRepository.findMine(user._id, oid);
      if (!exists) throw ApiError.notFound(NOT_FOUND);
      throw ApiError.conflict("This order can no longer be cancelled.");
    }
    await restockItems(updated.items);
    return updated;
  },

  async adminList({ status, search, page, limit }) {
    const match = {};
    if (status !== "all") match.status = status;
    if (search) match.orderNumber = { $regex: escapeRegex(search), $options: "i" };
    const [items, total] = await Promise.all([orderRepository.adminPage({ match, skip: (page - 1) * limit, limit }), orderRepository.adminCount(match)]);
    return pageOf(items, total, page, limit);
  },

  async adminUpdateStatus(id, to) {
    const oid = requireOid(id);
    const current = await orderRepository.findById(oid);
    if (!current) throw ApiError.notFound(NOT_FOUND);
    if (!ORDER_TRANSITIONS[current.status].includes(to)) {
      throw ApiError.conflict(`An order that is "${current.status}" cannot move to "${to}".`);
    }
    const from = Object.entries(ORDER_TRANSITIONS).filter(([, tos]) => tos.includes(to)).map(([f]) => f);
    const updated = await orderRepository.transition({
      filter: { _id: oid },
      from,
      to,
      extra: to === "cancelled" ? { cancelledAt: new Date(), paymentStatus: current.paymentStatus === "paid" ? "refunded" : current.paymentStatus } : {},
    });
    if (!updated) throw ApiError.conflict("The order was changed by someone else. Reload and try again.");
    if (to === "cancelled") await restockItems(updated.items);
    return updated;
  },
};
