import { Feedback } from "../models/index.js";

const populateAll = [
  { path: "user", select: "name email" },
  { path: "originalProduct", select: "name brand category" },
  { path: "substituteProduct", select: "name brand category" },
];

export const feedbackRepository = {
  async upsert(filter, fields) {
    const run = () =>
      Feedback.findOneAndUpdate(filter, { $set: fields }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).lean();
    try { return await run(); } catch (err) { if (err.code === 11000) return run(); throw err; }
  },
  page: ({ match, skip, limit }) => Feedback.find(match).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).populate(populateAll).lean(),
  count: (match) => Feedback.countDocuments(match),
  distribution: (match) => Feedback.aggregate([{ $match: match }, { $group: { _id: "$rating", count: { $sum: 1 } } }]),
};
