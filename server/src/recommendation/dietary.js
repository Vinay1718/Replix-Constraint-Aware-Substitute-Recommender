// Only "vegan" implies other tags. A Map avoids prototype keys such as "constructor".
export const IMPLIED_TAGS = new Map([["vegan", ["vegetarian", "lactose-free"]]]);
export const normalizeTag = (tag) => String(tag).trim().toLowerCase();

export const effectiveTags = (tags) => {
  const set = new Set();
  for (const raw of tags ?? []) {
    const tag = normalizeTag(raw);
    if (!tag) continue;
    set.add(tag);
    for (const implied of IMPLIED_TAGS.get(tag) ?? []) set.add(implied);
  }
  return set;
};

// Restrictions the product does NOT satisfy. A tag it doesn't declare counts as not satisfied.
export const missingRestrictions = (product, restrictions) => {
  const have = effectiveTags(product.dietaryTags);
  return restrictions.filter((r) => !have.has(normalizeTag(r)));
};
