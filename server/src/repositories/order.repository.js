import { Order } from "../models/index.js";

export const orderRepository = {
  create: (data) => Order.create(data),
  findByClientRequest: (user, clientRequestId) => Order.findOne({ user, clientRequestId }).lean(),
  findMine: (user, id) => Order.findOne({ _id: id, user }).lean(),
  pageMine: ({ user, skip, limit }) => Order.find({ user }).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
  countMine: (user) => Order.countDocuments({ user }),

  // Moves status only if the order is still in `from` (atomic: two admins can't both cancel and double-restock)
  transition: ({ filter, from, to, extra = {} }) =>
    Order.findOneAndUpdate(
      { ...filter, status: { $in: from } },
      { $set: { status: to, ...extra }, $push: { statusHistory: { status: to, at: new Date() } } },
      { new: true }
    ).lean(),

  adminPage: ({ match, skip, limit }) =>
    Order.find(match).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).populate({ path: "user", select: "name email" }).lean(),
  adminCount: (match) => Order.countDocuments(match),
  findById: (id) => Order.findById(id).lean(),

  async analytics() {
    const [totals] = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: "$total" } } },
    ]);
    const [subs] = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      { $match: { "items.substitutedFor.product": { $exists: true } } },
      { $group: { _id: null, units: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }, orders: { $addToSet: "$_id" } } },
    ]);
    const byStatus = await Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    return {
      orders: totals?.orders ?? 0,
      revenue: Math.round((totals?.revenue ?? 0) * 100) / 100,
      substitutedUnits: subs?.units ?? 0,
      substitutedRevenue: Math.round((subs?.revenue ?? 0) * 100) / 100,
      ordersWithSubstitutes: subs?.orders?.length ?? 0,
      byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    };
  },
};
