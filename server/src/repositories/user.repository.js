import { User } from "../models/index.js";
export const userRepository = {
  create: (data) => User.create(data),
  findById: (id) => User.findById(id).lean(),
  findByEmail: (email, { withPassword = false } = {}) => {
    const query = User.findOne({ email });
    return (withPassword ? query.select("+passwordHash") : query).lean();
  },
};
