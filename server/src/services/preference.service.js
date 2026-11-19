import { requirementRepository } from "../repositories/requirement.repository.js";

const toView = (doc) => ({
  maxBudget: doc.maxBudget ?? null,
  sameCategoryOnly: doc.sameCategoryOnly,
  organicOnly: doc.organicOnly,
  dietaryRestrictions: doc.dietaryRestrictions ?? [],
  preferredBrands: doc.preferredBrands ?? [],
});

export const preferenceService = {
  async get(userId) {
    const doc = await requirementRepository.findByUser(userId);
    return doc ? toView(doc) : null;
  },
  async save(userId, data) {
    return toView(await requirementRepository.upsert(userId, data));
  },
};
