export const APP_NAME = "Replix";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const ROUTES = {
  HOME: "/", LOGIN: "/login", REGISTER: "/register", PRODUCTS: "/products", PRODUCT_DETAILS: "/products/:id",
  CART: "/cart", PREFERENCES: "/preferences", RECOMMENDATIONS: "/recommendations",
  ADMIN: "/admin", ADMIN_PRODUCTS: "/admin/products", ADMIN_LABELS: "/admin/labels", ADMIN_FEEDBACK: "/admin/feedback",
};

export const STORAGE_KEYS = { USER: "ss_user", TOKEN: "ss_token", CART: "ss_cart", PREFERENCES: "ss_preferences" };
export const AUTH_EVENTS = { UNAUTHORIZED: "auth:unauthorized" };
export const DIETARY_OPTIONS = ["vegan", "vegetarian", "gluten-free", "lactose-free", "nut-free"];

export const ROUTE_PATHS = {
  CHECKOUT: "/checkout",
  ORDERS: "/orders",
  ORDER_DETAILS: "/orders/:id",
  ADMIN_ORDERS: "/admin/orders",
};
ROUTES.CHECKOUT = ROUTE_PATHS.CHECKOUT;
ROUTES.ORDERS = ROUTE_PATHS.ORDERS;
ROUTES.ORDER_DETAILS = ROUTE_PATHS.ORDER_DETAILS;
ROUTES.ADMIN_ORDERS = ROUTE_PATHS.ADMIN_ORDERS;
STORAGE_KEYS.ADDRESS = "ss_address";
