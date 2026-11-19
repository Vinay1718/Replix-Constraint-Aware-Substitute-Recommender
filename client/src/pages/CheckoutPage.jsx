import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { EmptyState, ProductImage, Stepper } from "../components/common";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { orderService } from "../services";
import { ROUTES, STORAGE_KEYS } from "../utils/constants";
import { money, newRequestId } from "../utils/format";
import { storage } from "../utils/storage";

const REASONS = { out_of_stock: "is now out of stock", insufficient_stock: "doesn't have enough stock", unavailable: "is no longer available" };

const CheckoutPage = () => {
  const { user } = useAuth();
  const { items, totalPrice, totalItems, hasUnavailable, clearCart } = useCart();
  const navigate = useNavigate();
  const requestId = useRef(newRequestId()); // same id on retries, so a double submit makes ONE order

  const [form, setForm] = useState(() => ({
    fullName: user?.name ?? "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "",
    ...storage.get(STORAGE_KEYS.ADDRESS, {}),
  }));
  const [payment, setPayment] = useState("cod");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [problems, setProblems] = useState([]);

  if (items.length === 0) {
    return (
      <EmptyState icon="🛒" title="Nothing to check out">
        <p className="muted">Your cart is empty.</p>
        <Link to={ROUTES.PRODUCTS} className="btn btn-primary">Browse products</Link>
      </EmptyState>
    );
  }

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (placing) return;
    setError("");
    setProblems([]);
    setPlacing(true);
    try {
      const order = await orderService.place({
        items: items.map((i) => ({ productId: i.product._id, quantity: i.quantity, ...(i.substitutedFor && { substitutedForId: i.substitutedFor._id }) })),
        shippingAddress: form,
        paymentMethod: payment,
        clientRequestId: requestId.current,
      });
      storage.set(STORAGE_KEYS.ADDRESS, form);
      clearCart();
      toast.success("Order placed!");
      navigate(`/orders/${order._id}`, { replace: true, state: { placed: true } });
    } catch (err) {
      setError(err.message);
      if (Array.isArray(err.details) && err.details[0]?.productId) setProblems(err.details);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div>
      <Stepper steps={["Cart", "Checkout", "Confirmation"]} current={1} />
      <h1>Checkout</h1>

      {hasUnavailable && (
        <div className="notice notice-danger">Some items in your cart are unavailable. <Link to={ROUTES.CART}>Go to your cart</Link> to swap or remove them.</div>
      )}

      <form className="cart-layout" onSubmit={submit}>
        <div className="checkout-main">
          <section className="card">
            <h3>Delivery address</h3>
            <div className="form-grid">
              <label className="form-field">Full name<input name="fullName" value={form.fullName} onChange={set} required /></label>
              <label className="form-field">Phone<input name="phone" value={form.phone} onChange={set} placeholder="+91 98765 43210" required /></label>
              <label className="form-field span-2">Address line 1<input name="line1" value={form.line1} onChange={set} required /></label>
              <label className="form-field span-2">Address line 2 (optional)<input name="line2" value={form.line2} onChange={set} /></label>
              <label className="form-field">City<input name="city" value={form.city} onChange={set} required /></label>
              <label className="form-field">State<input name="state" value={form.state} onChange={set} /></label>
              <label className="form-field">Postal code<input name="postalCode" value={form.postalCode} onChange={set} required /></label>
            </div>
          </section>

          <section className="card">
            <h3>Payment</h3>
            <label className={`pay-option ${payment === "cod" ? "selected" : ""}`}>
              <input type="radio" name="payment" checked={payment === "cod"} onChange={() => setPayment("cod")} />
              <span><strong>Cash on delivery</strong><br /><span className="muted">Pay when your order arrives.</span></span>
            </label>
            <label className={`pay-option ${payment === "demo-card" ? "selected" : ""}`}>
              <input type="radio" name="payment" checked={payment === "demo-card"} onChange={() => setPayment("demo-card")} />
              <span><strong>Card (demo)</strong><br /><span className="muted">Simulated. No card details are collected and nothing is charged.</span></span>
            </label>
          </section>
        </div>

        <aside className="summary">
          <h3>Order summary</h3>
          <ul className="mini-items">
            {items.map(({ product, quantity, substitutedFor }) => (
              <li key={product._id}>
                <ProductImage product={product} size="xs" />
                <span className="mini-name">{product.name}{substitutedFor && <em className="muted"> (swap for {substitutedFor.name})</em>}<br /><span className="muted">Qty {quantity}</span></span>
                <strong>{product.stock > 0 ? money(product.price * quantity) : "–"}</strong>
              </li>
            ))}
          </ul>
          <div className="summary-row"><span>Delivery</span><span className="in-stock">Free</span></div>
          <div className="summary-row summary-total"><span>Total ({totalItems})</span><span>{money(totalPrice)}</span></div>

          {error && (
            <div className="notice notice-danger" role="alert">
              <strong>{error}</strong>
              {problems.length > 0 && (
                <ul>{problems.map((p) => <li key={p.productId}>{p.name} {REASONS[p.reason] ?? "is unavailable"}{p.reason === "insufficient_stock" ? ` (only ${p.available} left)` : ""}</li>)}</ul>
              )}
              {problems.length > 0 && <Link to={ROUTES.CART}>Review your cart</Link>}
            </div>
          )}
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={placing || hasUnavailable}>{placing ? "Placing order..." : `Place order · ${money(totalPrice)}`}</button>
        </aside>
      </form>
    </div>
  );
};
export default CheckoutPage;
