import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { EmptyState, ProductImage, Stepper, SubstitutePanel } from "../components/common";
import { useCart } from "../hooks/useCart";
import { productService } from "../services";
import { ROUTES } from "../utils/constants";
import { money } from "../utils/format";

const CartPage = () => {
  const { items, totalPrice, totalItems, hasUnavailable, updateQuantity, removeItem, clearCart, replaceItem, syncItems } = useCart();
  const [open, setOpen] = useState(null); // id of the item whose substitute panel is open

  // The cart stores a snapshot, so refresh price and stock whenever the cart page opens
  const idsKey = useMemo(() => items.map((i) => i.product._id).sort().join(","), [items]);
  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    Promise.all(
      idsKey.split(",").map((id) =>
        productService.getById(id).then((p) => [id, p]).catch((err) => (err.status === 404 ? [id, null] : undefined))
      )
    ).then((rows) => {
      if (cancelled) return;
      const fresh = Object.fromEntries(rows.filter(Boolean));
      if (Object.keys(fresh).length) syncItems(fresh);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  if (items.length === 0) {
    return (
      <EmptyState icon="🛒" title="Your cart is empty">
        <p className="muted">Add something tasty, or find a substitute for something that ran out.</p>
        <Link to={ROUTES.PRODUCTS} className="btn btn-primary">Browse products</Link>
      </EmptyState>
    );
  }

  const swap = (item) => async (substitute) => {
    replaceItem(item.product._id, substitute, { _id: item.product._id, name: item.product.name });
    setOpen(null);
    toast.success(`Swapped for ${substitute.name}`);
  };

  return (
    <div>
      <Stepper steps={["Cart", "Checkout", "Confirmation"]} current={0} />
      <h1>Your cart <span className="muted count">({totalItems} item{totalItems === 1 ? "" : "s"})</span></h1>

      <div className="cart-layout">
        <div className="cart-list">
          {items.map((item) => {
            const { product, quantity, substitutedFor } = item;
            const out = product.stock <= 0;
            const atMax = !out && quantity >= product.stock;
            return (
              <div key={product._id} className={`cart-item ${out ? "is-out" : ""}`}>
                <div className="cart-row">
                  <ProductImage product={product} size="md" />
                  <div className="cart-info">
                    <Link to={`/products/${product._id}`} className="cart-name">{product.name}</Link>
                    <span className="muted">{product.brand} · {money(product.price)} each</span>
                    {substitutedFor && <span className="badge badge-ai">Substitute for {substitutedFor.name}</span>}
                    {out && <span className="badge badge-danger">No longer available</span>}
                    {atMax && <span className="muted">Maximum available quantity</span>}
                  </div>
                  {!out && (
                    <div className="qty-controls">
                      <button className="btn btn-outline btn-sm" onClick={() => updateQuantity(product._id, quantity - 1)} aria-label="Decrease">−</button>
                      <span>{quantity}</span>
                      <button className="btn btn-outline btn-sm" onClick={() => updateQuantity(product._id, quantity + 1)} disabled={atMax} aria-label="Increase">+</button>
                    </div>
                  )}
                  <strong className="line-total">{out ? "–" : money(product.price * quantity)}</strong>
                  <button className="icon-btn" onClick={() => removeItem(product._id)} aria-label={`Remove ${product.name}`}>✕</button>
                </div>
                {out && (
                  <div className="swap-box">
                    {open === product._id ? (
                      <SubstitutePanel original={product} quantity={quantity} actionLabel="Swap in" onPick={swap(item)} />
                    ) : (
                      <button className="btn btn-accent btn-sm" onClick={() => setOpen(product._id)}>Find a substitute that fits my rules</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <button className="link-button" onClick={clearCart}>Clear cart</button>
        </div>

        <aside className="summary">
          <h3>Order summary</h3>
          <div className="summary-row"><span>Items</span><span>{totalItems}</span></div>
          <div className="summary-row"><span>Delivery</span><span className="in-stock">Free</span></div>
          <div className="summary-row summary-total"><span>Total</span><span>{money(totalPrice)}</span></div>
          {hasUnavailable && <p className="notice notice-danger">Remove or swap the unavailable item(s) to continue.</p>}
          {hasUnavailable || totalItems === 0
            ? <button className="btn btn-primary btn-block" disabled>Proceed to checkout</button>
            : <Link to={ROUTES.CHECKOUT} className="btn btn-primary btn-block">Proceed to checkout</Link>}
          <Link to={ROUTES.PRODUCTS} className="btn btn-ghost btn-block">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
};
export default CartPage;
