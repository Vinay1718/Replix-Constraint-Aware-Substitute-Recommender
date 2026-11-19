import { z } from "zod";
import { ORDER_STATUSES, PAYMENT_METHODS } from "../constants/index.js";
import { objectIdString, pagination } from "./common.js";

const address = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(80),
  phone: z.string().trim().regex(/^[0-9+()\-\s]{7,20}$/, "Enter a valid phone number"),
  line1: z.string().trim().min(3, "Address line 1 is required").max(120),
  line2: z.string().trim().max(120).default(""),
  city: z.string().trim().min(2, "City is required").max(60),
  state: z.string().trim().max(60).default(""),
  postalCode: z.string().trim().min(3, "Postal code is required").max(12),
});

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: objectIdString,
        quantity: z.number().int("Quantity must be a whole number").min(1).max(99),
        substitutedForId: objectIdString.optional(),
      })
    )
    .min(1, "Your cart is empty")
    .max(30, "Too many different items in one order"),
  shippingAddress: address,
  paymentMethod: z.enum(PAYMENT_METHODS),
  clientRequestId: z.string().trim().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/).optional(),
});

export const orderListQuerySchema = z.object({ ...pagination });
export const adminOrderListQuerySchema = z.object({
  status: z.enum(["all", ...ORDER_STATUSES]).default("all"),
  search: z.string().trim().max(40).optional(),
  ...pagination,
});
export const orderStatusSchema = z.object({ status: z.enum(ORDER_STATUSES) });
