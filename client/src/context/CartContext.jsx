import { createContext, useCallback, useEffect, useMemo, useReducer } from "react";
import { storage } from "../utils/storage";
import { STORAGE_KEYS } from "../utils/constants";

export const CartContext = createContext(null);
const clamp = (quantity, stock) => (stock > 0 ? Math.min(quantity, stock) : quantity);
const slim = ({ _id, name, brand, category, price, stock, dietaryTags, attributes }) => ({ _id, name, brand, category, price, stock, dietaryTags, attributes });

// item: { product, quantity, substitutedFor?: { _id, name } }
const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD": {
      const { product, quantity, substitutedFor } = action.payload;
      if (product.stock <= 0) return state;
      const existing = state.find((i) => i.product._id === product._id);
      if (existing) {
        return state.map((i) =>
          i.product._id === product._id
            ? { ...i, product: slim(product), quantity: clamp(i.quantity + quantity, product.stock), substitutedFor: substitutedFor ?? i.substitutedFor }
            : i
        );
      }
      return [...state, { product: slim(product), quantity: clamp(quantity, product.stock), ...(substitutedFor && { substitutedFor }) }];
    }
    case "REPLACE": {
      // Swap an unavailable item for its substitute, in the same position, keeping the quantity (capped by stock)
      const { oldId, product, substitutedFor } = action.payload;
      const old = state.find((i) => i.product._id === oldId);
      if (!old || product.stock <= 0) return state;
      const without = state.filter((i) => i.product._id !== oldId);
      const dup = without.find((i) => i.product._id === product._id);
      if (dup) {
        return without.map((i) => (i.product._id === product._id ? { ...i, quantity: clamp(i.quantity + old.quantity, product.stock), substitutedFor } : i));
      }
      const idx = state.findIndex((i) => i.product._id === oldId);
      const next = { product: slim(product), quantity: clamp(old.quantity, product.stock), substitutedFor };
      return [...without.slice(0, idx), next, ...without.slice(idx)];
    }
    case "SYNC": {
      // fresh = { [id]: product | null }. null means the product is gone: keep it visible but unavailable.
      const fresh = action.payload;
      return state.map((i) => {
        if (!(i.product._id in fresh)) return i;
        const p = fresh[i.product._id];
        if (!p) return { ...i, product: { ...i.product, stock: 0 } };
        return { ...i, product: slim(p), quantity: p.stock > 0 ? Math.min(i.quantity, p.stock) : i.quantity };
      });
    }
    case "SET_QTY": {
      const { id, quantity } = action.payload;
      if (quantity <= 0) return state.filter((i) => i.product._id !== id);
      return state.map((i) => (i.product._id === id ? { ...i, quantity: clamp(quantity, i.product.stock) } : i));
    }
    case "REMOVE": return state.filter((i) => i.product._id !== action.payload);
    case "CLEAR": return [];
    default: return state;
  }
};

export const CartProvider = ({ children }) => {
  const [items, dispatch] = useReducer(cartReducer, [], () => storage.get(STORAGE_KEYS.CART, []));
  useEffect(() => { storage.set(STORAGE_KEYS.CART, items); }, [items]);

  const addItem = useCallback((product, quantity = 1, { substitutedFor } = {}) => {
    if (product.stock <= 0) return false;
    dispatch({ type: "ADD", payload: { product, quantity, substitutedFor } });
    return true;
  }, []);
  const replaceItem = useCallback((oldId, product, substitutedFor) => dispatch({ type: "REPLACE", payload: { oldId, product, substitutedFor } }), []);
  const syncItems = useCallback((fresh) => dispatch({ type: "SYNC", payload: fresh }), []);
  const updateQuantity = useCallback((id, quantity) => dispatch({ type: "SET_QTY", payload: { id, quantity } }), []);
  const removeItem = useCallback((id) => dispatch({ type: "REMOVE", payload: id }), []);
  const clearCart = useCallback(() => dispatch({ type: "CLEAR" }), []);

  const value = useMemo(() => {
    const available = items.filter((i) => i.product.stock > 0);
    return {
      items,
      totalItems: items.reduce((s, i) => s + i.quantity, 0),
      totalPrice: available.reduce((s, i) => s + i.product.price * i.quantity, 0),
      hasUnavailable: items.some((i) => i.product.stock <= 0),
      addItem, replaceItem, syncItems, updateQuantity, removeItem, clearCart,
    };
  }, [items, addItem, replaceItem, syncItems, updateQuantity, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
