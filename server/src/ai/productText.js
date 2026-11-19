import { createHash } from "node:crypto";

// Text used to embed a product: type words, category and dietary tags.
// The brand is removed so "same product from another brand" stays close.
export const productText = (p) => {
  const brand = new Set(String(p.brand ?? "").toLowerCase().split(/\s+/).filter(Boolean));
  const name = String(p.name ?? "")
    .split(/\s+/)
    .filter((w) => !brand.has(w.toLowerCase()))
    .join(" ");
  return [name, p.category, ...(p.dietaryTags ?? [])].filter(Boolean).join(" | ");
};

export const textHash = (text) => createHash("sha256").update(text).digest("hex").slice(0, 32);
