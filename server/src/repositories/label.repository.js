import { SubstituteLabel } from "../models/index.js";

const populateAll = [
  { path: "originalProduct", select: "name brand category price isActive" },
  { path: "substituteProduct", select: "name brand category price isActive" },
];

export const labelRepository = {
  create: (data) => SubstituteLabel.create(data),
  findById: (id) => SubstituteLabel.findById(id).populate(populateAll).lean(),
  page: ({ match, skip, limit }) => SubstituteLabel.find(match).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).populate(populateAll).lean(),
  count: (match) => SubstituteLabel.countDocuments(match),
  updateById: (id, data) => SubstituteLabel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).populate(populateAll).lean(),
  deleteById: (id) => SubstituteLabel.findByIdAndDelete(id).lean(),
  findActiveForOriginal: (originalId) =>
    SubstituteLabel.find({ originalProduct: originalId, isActive: true }).select("substituteProduct relationType similarityScore source").lean(),
};
