import { z } from "zod";
import { DECISIONS } from "../constants/index.js";
import { objectIdString } from "./common.js";
import { preferenceSchema } from "./preference.validator.js";

export const recommendSchema = z.object({
  productId: objectIdString,
  // Optional: when omitted the user's saved preferences are used
  requirements: preferenceSchema.optional(),
  quantity: z.number().int("Quantity must be a whole number").min(1).max(1000).default(1),
  topN: z.number().int().min(1).max(50).optional(),
});

export const decisionSchema = z.object({
  originalProductId: objectIdString,
  substituteProductId: objectIdString,
  decision: z.enum([DECISIONS.ACCEPTED, DECISIONS.REJECTED]),
});
