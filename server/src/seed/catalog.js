// Deterministic PRNG (mulberry32): the same seed always yields the same catalog
const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Plant-based products carry both "vegan" and "vegetarian" so results don't depend on implication rules.
const PLANT = ["vegan", "vegetarian", "lactose-free"];
const GF = "gluten-free";
const NF = "nut-free";
const ALL = [...PLANT, GF, NF];

// [name, category, size, minPrice, maxPrice, dietaryTags]
const TYPES = [
  ["Almond Milk", "Beverages", "1L", 3.5, 5.5, [...PLANT, GF]],
  ["Soy Milk", "Beverages", "1L", 3.0, 4.5, [...PLANT, NF]],
  ["Oat Milk", "Beverages", "1L", 3.5, 5.0, [...PLANT, NF]],
  ["Coconut Drink", "Beverages", "1L", 3.5, 5.0, ALL],
  ["Rice Milk", "Beverages", "1L", 3.0, 4.0, ALL],
  ["Whole Dairy Milk", "Beverages", "1L", 2.5, 3.5, ["vegetarian", GF, NF]],
  ["Lactose-Free Dairy Milk", "Beverages", "1L", 3.0, 4.0, ["vegetarian", "lactose-free", GF, NF]],
  ["Orange Juice", "Beverages", "1L", 2.5, 4.5, ALL],
  ["Apple Juice", "Beverages", "1L", 2.0, 3.5, ALL],
  ["Green Tea", "Beverages", "20 bags", 2.5, 5.0, ALL],
  ["Whole Wheat Bread", "Bakery", "400g", 2.0, 3.5, ["vegetarian", NF]],
  ["White Sandwich Bread", "Bakery", "450g", 1.8, 3.0, [...PLANT, NF]],
  ["Gluten-Free Bread", "Bakery", "350g", 4.0, 6.0, [...PLANT, GF, NF]],
  ["Multigrain Bread", "Bakery", "400g", 2.5, 4.0, ["vegetarian", NF]],
  ["Plain Bagels", "Bakery", "4 pack", 2.5, 4.0, [...PLANT, NF]],
  ["Butter Croissants", "Bakery", "4 pack", 3.0, 5.0, ["vegetarian", NF]],
  ["Tortilla Wraps", "Bakery", "8 pack", 2.5, 4.0, [...PLANT, NF]],
  ["Gluten-Free Wraps", "Bakery", "6 pack", 3.5, 5.5, [...PLANT, GF, NF]],
  ["Cheddar Cheese", "Dairy & Alternatives", "200g", 2.8, 4.5, ["vegetarian", GF, NF]],
  ["Vegan Cheese Slices", "Dairy & Alternatives", "150g", 3.0, 5.0, [...PLANT, GF]],
  ["Greek Yogurt", "Dairy & Alternatives", "500g", 2.5, 4.0, ["vegetarian", GF, NF]],
  ["Soy Yogurt", "Dairy & Alternatives", "400g", 2.2, 3.8, [...PLANT, GF, NF]],
  ["Coconut Yogurt", "Dairy & Alternatives", "400g", 2.8, 4.5, ALL],
  ["Salted Butter", "Dairy & Alternatives", "250g", 2.5, 4.0, ["vegetarian", GF, NF]],
  ["Vegan Butter", "Dairy & Alternatives", "250g", 2.8, 4.2, ALL],
  ["Cream Cheese", "Dairy & Alternatives", "200g", 2.0, 3.5, ["vegetarian", GF, NF]],
  ["Potato Chips", "Snacks", "150g", 1.5, 3.0, ALL],
  ["Granola Bars", "Snacks", "6 pack", 2.5, 4.5, ["vegetarian"]],
  ["Mixed Nuts", "Snacks", "200g", 3.5, 6.0, [...PLANT, GF]],
  ["Rice Cakes", "Snacks", "120g", 1.5, 2.8, ALL],
  ["Popcorn", "Snacks", "100g", 1.2, 2.5, ALL],
  ["Dark Chocolate", "Snacks", "100g", 2.0, 4.0, [...PLANT, GF]],
  ["Milk Chocolate", "Snacks", "100g", 1.5, 3.0, ["vegetarian", GF]],
  ["Wheat Pasta", "Pantry", "500g", 1.2, 2.5, [...PLANT, NF]],
  ["Gluten-Free Pasta", "Pantry", "400g", 2.5, 4.0, [...PLANT, GF, NF]],
  ["Basmati Rice", "Pantry", "1kg", 2.5, 4.5, ALL],
  ["Quinoa", "Pantry", "500g", 3.5, 6.0, ALL],
  ["Peanut Butter", "Pantry", "340g", 2.5, 4.5, [...PLANT, GF]],
  ["Almond Butter", "Pantry", "280g", 5.0, 8.0, [...PLANT, GF]],
  ["Sunflower Seed Butter", "Pantry", "300g", 4.0, 6.5, ALL],
  ["Extra Virgin Olive Oil", "Pantry", "500ml", 5.0, 9.0, ALL],
  ["Corn Flakes", "Breakfast", "500g", 2.0, 3.8, [...PLANT, NF]],
  ["Muesli", "Breakfast", "500g", 3.0, 5.0, PLANT],
  ["Rolled Oats", "Breakfast", "1kg", 1.8, 3.2, [...PLANT, NF]],
  ["Gluten-Free Oats", "Breakfast", "500g", 3.0, 4.8, ALL],
  ["Granola", "Breakfast", "400g", 3.5, 5.5, ["vegetarian"]],
];

const BRANDS = ["NutriPure", "GreenFarm", "OatLand", "FarmFresh", "DailyBake", "PureCrumb", "SunHarvest", "Willowbrook", "GoldenField", "BluePeak", "NatureNest", "FreshLeaf", "MillStone", "Hearthside"];
const BRANDS_PER_TYPE = 4;

/** Returns [{ product, quantity }]. ~20% out of stock, ~12% low stock, ~60% of brand/type pairs have an organic variant. */
export const generateCatalog = ({ seed = 42 } = {}) => {
  const rand = mulberry32(seed);
  const between = (min, max) => min + rand() * (max - min);
  const round2 = (n) => Math.round(n * 100) / 100;
  const items = [];

  TYPES.forEach(([type, category, size, minPrice, maxPrice, tags], typeIdx) => {
    for (let b = 0; b < BRANDS_PER_TYPE; b++) {
      const brand = BRANDS[(typeIdx * 3 + b) % BRANDS.length];
      const basePrice = between(minPrice, maxPrice);
      const variants = rand() < 0.6 ? [false, true] : [false];
      for (const organic of variants) {
        const roll = rand();
        const quantity = roll < 0.2 ? 0 : roll < 0.32 ? 1 + Math.floor(rand() * 5) : 6 + Math.floor(rand() * 115);
        items.push({
          quantity,
          product: {
            name: `${brand} ${organic ? "Organic " : ""}${type} ${size}`,
            description: `${type} (${size}) from ${brand}.${organic ? " Certified organic." : ""}`,
            category, brand,
            price: round2(basePrice * (organic ? between(1.15, 1.4) : 1)),
            attributes: { size, organic },
            dietaryTags: [...tags],
            imageUrl: "",
            isActive: true,
          },
        });
      }
    }
  });
  return items;
};
