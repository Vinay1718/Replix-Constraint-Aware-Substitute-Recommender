import { z } from "zod";
import { DIETARY_TAGS } from "../constants/index.js";

const dedupeBrands = (brands) => {
  const seen = new Map();
  for (const b of brands) if (b && !seen.has(b.toLowerCase())) seen.set(b.toLowerCase(), b);
  return [...seen.values()];
};

export const preferenceSchema = z.object({
  maxBudget: z.number().min(0, "Budget cannot be negative").max(100000, "Budget is too high").nullable().default(null),
  sameCategoryOnly: z.boolean().default(true),
  organicOnly: z.boolean().default(false),
  dietaryRestrictions: z.array(z.enum(DIETARY_TAGS)).default([]).transform((t) => [...new Set(t)]),
  preferredBrands: z.array(z.string().trim().max(80, "Brand names must be at most 80 characters")).max(20, "At most 20 preferred brands are allowed").default([]).transform(dedupeBrands),
});
