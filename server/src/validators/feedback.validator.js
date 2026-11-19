import { z } from "zod";
import { objectIdString, pagination } from "./common.js";

export const feedbackSchema = z.object({
  originalProductId: objectIdString,
  substituteProductId: objectIdString,
  rating: z.number().int("Rating must be a whole number").min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
  comment: z.string().trim().max(500, "Comment must be at most 500 characters").default(""),
});
export const feedbackListQuerySchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  productId: objectIdString.optional(),
  ...pagination,
});
