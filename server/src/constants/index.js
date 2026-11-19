export const ROLES = Object.freeze({ USER: "user", ADMIN: "admin" });
export const DIETARY_TAGS = Object.freeze(["vegan", "vegetarian", "gluten-free", "lactose-free", "nut-free"]);
export const DECISIONS = Object.freeze({ PENDING: "pending", ACCEPTED: "accepted", REJECTED: "rejected" });
export const RELATION_TYPES = Object.freeze(["exact", "close", "partial"]);
export const LABEL_SOURCES = Object.freeze(["admin", "system", "ai"]);
export const ENGINE_VERSIONS = Object.freeze({ RULE_BASED: "rule-based-v1", HYBRID: "hybrid-v1" });
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;
export const STOCK_FILTERS = Object.freeze(["all", "in", "low", "out"]);
export const PUBLIC_LIST_LIMIT = 500;

export const ORDER_STATUSES = Object.freeze(["placed", "shipped", "delivered", "cancelled"]);
// Allowed admin transitions. Cancelling restocks the items.
export const ORDER_TRANSITIONS = Object.freeze({
  placed: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
});
export const PAYMENT_METHODS = Object.freeze(["cod", "demo-card"]);
