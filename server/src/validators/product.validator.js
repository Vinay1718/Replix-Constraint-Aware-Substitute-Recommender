import { z } from "zod";
import { DIETARY_TAGS, STOCK_FILTERS } from "../constants/index.js";

const MAX_STOCK = 1_000_000;
const bool = z.enum(["true", "false"]).transform((v) => v === "true");

export const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  inStockOnly: bool.optional(),
});
export const adminListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  stockStatus: z.enum(STOCK_FILTERS).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const attributes = z
  .record(
    z.string().regex(/^[A-Za-z][A-Za-z0-9_ -]{0,39}$/, "Attribute names may only use letters, numbers, spaces, - and _"),
    z.union([z.string().trim().max(100), z.number(), z.boolean()])
  )
  .refine((a) => Object.keys(a).length <= 20, "At most 20 attributes are allowed")
  .refine((a) => a.organic === undefined || typeof a.organic === "boolean", "attributes.organic must be true or false");

const dietaryTags = z.array(z.enum(DIETARY_TAGS)).transform((tags) => [...new Set(tags)]);
const imageUrl = z.union([
  z.literal(""),
  z.string().trim().max(500).url("Image URL is invalid").refine((u) => /^https?:\/\//i.test(u), "Image URL must start with http:// or https://"),
]);

const productFields = z.object({
  name: z.string().trim().min(1, "Name is required").max(150, "Name must be at most 150 characters"),
  description: z.string().trim().max(1000, "Description must be at most 1000 characters"),
  category: z.string().trim().min(1, "Category is required").max(60),
  brand: z.string().trim().min(1, "Brand is required").max(80),
  price: z.number().min(0, "Price cannot be negative").max(100000, "Price is too high"),
  attributes,
  dietaryTags,
  imageUrl,
  isActive: z.boolean(),
});

export const createProductSchema = productFields
  .partial({ description: true, attributes: true, dietaryTags: true, imageUrl: true, isActive: true })
  .extend({ stock: z.number().int("Stock must be a whole number").min(0).max(MAX_STOCK).optional() });

export const updateProductSchema = productFields.partial().refine((d) => Object.keys(d).length > 0, "Provide at least one field to update");

export const inventoryUpdateSchema = z
  .object({
    quantity: z.number().int("Quantity must be a whole number").min(0).max(MAX_STOCK).optional(),
    delta: z.number().int("Delta must be a whole number").min(-MAX_STOCK).max(MAX_STOCK).refine((n) => n !== 0, "Delta cannot be 0").optional(),
    lowStockThreshold: z.number().int().min(0).max(MAX_STOCK).optional(),
  })
  .refine((d) => !(d.quantity !== undefined && d.delta !== undefined), { message: "Send either quantity or delta, not both" })
  .refine((d) => d.quantity !== undefined || d.delta !== undefined || d.lowStockThreshold !== undefined, { message: "Nothing to update" });
