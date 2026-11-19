export const money = (n) => `$${Number(n ?? 0).toFixed(2)}`;
export const dateTime = (d) => new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
export const dateOnly = (d) => new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" });
export const percent = (n) => `${Math.round((n ?? 0) * 100)}%`;

// Emoji for a product, picked from words in its name (falls back to the category)
const PHRASES = [["almond butter", "🥜"]];
const WORDS = new Map([
  ["peanut", "🥜"], ["sunflower", "🌻"], ["coconut", "🥥"], ["milk", "🥛"], ["juice", "🧃"], ["tea", "🍵"], ["drink", "🥤"],
  ["bread", "🍞"], ["bagels", "🥯"], ["croissants", "🥐"], ["wraps", "🌯"], ["cheese", "🧀"], ["yogurt", "🥣"], ["butter", "🧈"],
  ["chips", "🥔"], ["bars", "🍫"], ["nuts", "🥜"], ["popcorn", "🍿"], ["chocolate", "🍫"], ["pasta", "🍝"], ["rice", "🍚"],
  ["quinoa", "🌾"], ["oil", "🫒"], ["flakes", "🥣"], ["oats", "🌾"], ["granola", "🥣"], ["muesli", "🥣"],
]);
const CATEGORY_EMOJI = { Beverages: "🥤", Bakery: "🍞", "Dairy & Alternatives": "🧀", Snacks: "🍿", Pantry: "🫙", Breakfast: "🥣" };

export const categoryEmoji = (category) => CATEGORY_EMOJI[category] ?? "🛒";
export const productEmoji = (product) => {
  const name = String(product?.name ?? "").toLowerCase();
  for (const [phrase, emoji] of PHRASES) if (name.includes(phrase)) return emoji;
  // Last matching word wins: it is the head noun ("Rice Milk" is a drink, not rice)
  for (const word of name.split(/[^a-z]+/).reverse()) if (WORDS.has(word)) return WORDS.get(word);
  return categoryEmoji(product?.category);
};
export const categoryHue = (category) => [...String(category ?? "")].reduce((h, c) => (h + c.charCodeAt(0) * 7) % 360, 17);

// Idempotency key for one checkout attempt
export const newRequestId = () =>
  globalThis.crypto?.randomUUID?.() ?? `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
