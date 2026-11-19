import { z } from "zod";
import { LABEL_SOURCES, RELATION_TYPES } from "../constants/index.js";
import { objectIdString, pagination } from "./common.js";

const labelFields = z.object({
  relationType: z.enum(RELATION_TYPES),
  similarityScore: z.number().min(0, "Similarity must be between 0 and 1").max(1, "Similarity must be between 0 and 1").nullable(),
  notes: z.string().trim().max(300, "Notes must be at most 300 characters"),
  isActive: z.boolean(),
});
export const createLabelSchema = labelFields.partial().extend({ originalProductId: objectIdString, substituteProductId: objectIdString });
export const updateLabelSchema = labelFields.partial().refine((d) => Object.keys(d).length > 0, "Provide at least one field to update");
export const labelListQuerySchema = z.object({
  originalProductId: objectIdString.optional(),
  substituteProductId: objectIdString.optional(),
  source: z.enum(LABEL_SOURCES).optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  ...pagination,
});
