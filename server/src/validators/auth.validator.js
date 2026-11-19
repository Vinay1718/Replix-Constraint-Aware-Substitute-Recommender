import { z } from "zod";

const email = z.string().trim().toLowerCase().min(1, "Email is required").max(254, "Email is too long").email("Email is invalid");
const newPassword = z.string().min(8, "Password must be at least 8 characters")
  .refine((p) => Buffer.byteLength(p, "utf8") <= 72, "Password is too long (max 72 bytes)");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name must be at most 80 characters"),
  email,
  password: newPassword,
});
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(200, "Password is too long"),
});
