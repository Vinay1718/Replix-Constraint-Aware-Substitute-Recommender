import { z } from "zod";
export const objectIdString = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
export const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
