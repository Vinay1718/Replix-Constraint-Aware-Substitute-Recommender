import { CustomerRequirement } from "../models/index.js";
export const requirementRepository = {
  findByUser: (userId) => CustomerRequirement.findOne({ user: userId }).lean(),
  async upsert(userId, data) {
    const run = () =>
      CustomerRequirement.findOneAndUpdate({ user: userId }, { $set: data }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).lean();
    try { return await run(); } catch (err) { if (err.code === 11000) return run(); throw err; }
  },
};
