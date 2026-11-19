// Types that can stand in for each other (names match seed/catalog.js).
export const GROUPS = [
  ["Almond Milk", "Soy Milk", "Oat Milk", "Coconut Drink", "Rice Milk", "Whole Dairy Milk", "Lactose-Free Dairy Milk"],
  ["Orange Juice", "Apple Juice"],
  ["Whole Wheat Bread", "White Sandwich Bread", "Gluten-Free Bread", "Multigrain Bread"],
  ["Tortilla Wraps", "Gluten-Free Wraps"],
  ["Greek Yogurt", "Soy Yogurt", "Coconut Yogurt"],
  ["Salted Butter", "Vegan Butter"],
  ["Cheddar Cheese", "Vegan Cheese Slices", "Cream Cheese"],
  ["Peanut Butter", "Almond Butter", "Sunflower Seed Butter"],
  ["Wheat Pasta", "Gluten-Free Pasta"],
  ["Rolled Oats", "Gluten-Free Oats", "Muesli", "Granola", "Corn Flakes"],
  ["Dark Chocolate", "Milk Chocolate"],
];

const GROUP_OF = new Map();
GROUPS.forEach((group, i) => group.forEach((type) => GROUP_OF.set(type, i)));
export const groupIndexOf = (type) => GROUP_OF.get(type);

// "<brand> [Organic ]<type> <size>" -> "<type>" (null when the name doesn't follow the pattern)
export const typeOf = (p) => {
  const size = p.attributes?.size;
  if (!size || !p.name.startsWith(`${p.brand} `)) return null;
  let rest = p.name.slice(p.brand.length + 1);
  if (rest.startsWith("Organic ")) rest = rest.slice("Organic ".length);
  return rest.endsWith(` ${size}`) ? rest.slice(0, -(size.length + 1)) : null;
};

const isOrganic = (p) => p.attributes?.organic === true;
const clamp01 = (n) => Math.max(0, Math.min(1, Math.round(n * 100) / 100));

export const buildLabels = (products, { maxCrossPerProduct = 6 } = {}) => {
  const items = products.filter((p) => p.isActive !== false).map((p) => ({ p, type: typeOf(p) })).filter((x) => x.type);

  const byExact = new Map();
  const byType = new Map();
  for (const it of items) {
    const exactKey = `${it.type}|${it.p.attributes.size}`;
    byExact.set(exactKey, [...(byExact.get(exactKey) ?? []), it]);
    byType.set(it.type, [...(byType.get(it.type) ?? []), it]);
  }

  const labels = [];
  const add = (a, b, relationType, base, notes) => {
    const penalty = isOrganic(a.p) !== isOrganic(b.p) ? 0.1 : 0;
    labels.push({ originalProduct: a.p._id, substituteProduct: b.p._id, relationType, similarityScore: clamp01(base - penalty), source: "system", notes, isActive: true });
  };

  for (const a of items) {
    for (const b of byExact.get(`${a.type}|${a.p.attributes.size}`)) {
      if (b !== a) add(a, b, "exact", 0.95, "Auto-generated: same product type");
    }
    const groupIdx = GROUP_OF.get(a.type);
    if (groupIdx === undefined) continue;

    const candidates = [];
    for (const type of GROUPS[groupIdx]) if (type !== a.type) candidates.push(...(byType.get(type) ?? []));
    candidates.sort((x, y) => Math.abs(x.p.price - a.p.price) - Math.abs(y.p.price - a.p.price) || x.p.name.localeCompare(y.p.name));

    for (const b of candidates.slice(0, maxCrossPerProduct)) {
      const keepsDiet = a.p.dietaryTags.every((t) => b.p.dietaryTags.includes(t));
      add(a, b, keepsDiet ? "close" : "partial", keepsDiet ? 0.75 : 0.55, "Auto-generated: similar product group");
    }
  }
  return labels;
};
