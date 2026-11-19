import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { EmptyState, ErrorMessage, FeedbackForm, Loader, ProductImage, StatusBadge } from "../components/common";
import { useAsync } from "../hooks/useAsync";
import { feedbackService, orderService } from "../services";
import { ROUTES } from "../utils/constants";
import { dateTime, money } from "../utils/format";

const FLOW = ["placed", "shipped", "delivered"];

const Timeline = ({ order }) => {
  const at = Object.fromEntries(order.statusHistory.map((h) => [h.status, h.at]));
  if (order.status === "cancelled") {
    return <ol className="timeline"><li className="done"><span className="dot" />Placed<small>{at.placed && dateTime(at.placed)}</small></li><li className="cancelled"><span className="dot" />Cancelled<small>{at.cancelled && dateTime(at.cancelled)}</small></li></ol>;
  }
  const idx = FLOW.indexOf(order.status);
  return (
    <ol className="timeline">
      {FLOW.map((s, i) => (
        <li key={s} className={i <= idx ? "done" : ""}><span className="dot" />{s[0].toUpperCase() + s.slice(1)}<small>{at[s] ? dateTime(at[s]) : "Pending"}</small></li>
      ))}
    </ol>
  );
};

const OrderDetailsPage = () => {
  const { id } = useParams();
  const { state } = useLocation();
  const { data: order, loading, error, reload } = useAsync(() => orderService.get(id), [id]);
  const [cancelling, setCancelling] = useState(false);

  if (loading && !order) return <Loader label="Loading order..." />;
  if (error?.status === 404) return <EmptyState icon="🤷" title="Order not found"><Link to={ROUTES.ORDERS} className="btn btn-outline">My orders</Link></EmptyState>;
  if (error) return <ErrorMessage message={error.message} onRetry={reload} />;

  const cancel = async () => {
    if (!window.confirm("Cancel this order? The items will go back into stock.")) return;
    setCancelling(true);
    try { await orderService.cancel(order._id); toast.success("Order cancelled"); reload(); }
    catch (err) { toast.error(err.message); }
    finally { setCancelling(false); }
  };

  const rate = (item) => async ({ rating, comment }) => {
    try {
      await feedbackService.submit({ originalProductId: item.substitutedFor.product, substituteProductId: item.product, rating, comment });
      toast.success("Thanks for rating this substitute");
    } catch (err) { toast.error(err.message); throw err; }
  };

  const a = order.shippingAddress;
  return (
    <div>
      {state?.placed && (
        <div className="success-banner"><span>🎉</span><div><strong>Thank you! Your order is confirmed.</strong><p>We saved the details below. You can track it from My orders.</p></div></div>
      )}
      <div className="page-head">
        <div><h1>Order {order.orderNumber}</h1><p className="muted">Placed {dateTime(order.createdAt)}</p></div>
        <StatusBadge status={order.status} />
      </div>

      <div className="card"><Timeline order={order} /></div>

      <div className="cart-layout">
        <div className="cart-list">
          {order.items.map((i) => (
            <div key={i.product} className="cart-item">
              <div className="cart-row">
                <ProductImage product={i} size="md" />
                <div className="cart-info">
                  <Link to={`/products/${i.product}`} className="cart-name">{i.name}</Link>
                  <span className="muted">{i.brand} · {money(i.price)} × {i.quantity}</span>
                  {i.substitutedFor && <span className="badge badge-ai">Smart swap for {i.substitutedFor.name}</span>}
                </div>
                <strong className="line-total">{money(i.price * i.quantity)}</strong>
              </div>
              {i.substitutedFor && order.status !== "cancelled" && (
                <div className="swap-box"><FeedbackForm title={`How is ${i.name} as a substitute for ${i.substitutedFor.name}?`} onSubmit={rate(i)} /></div>
              )}
            </div>
          ))}
        </div>

        <aside className="summary">
          <h3>Summary</h3>
          <div className="summary-row"><span>Delivery</span><span className="in-stock">Free</span></div>
          <div className="summary-row summary-total"><span>Total</span><span>{money(order.total)}</span></div>
          <div className="summary-row"><span>Payment</span><span>{order.paymentMethod === "cod" ? "Cash on delivery" : "Card (demo)"} · {order.paymentStatus}</span></div>
          <h3 className="summary-sub">Deliver to</h3>
          <address>{a.fullName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}{a.state ? `, ${a.state}` : ""} {a.postalCode}<br />{a.phone}</address>
          {order.status === "placed" && <button className="btn btn-outline btn-block" onClick={cancel} disabled={cancelling}>{cancelling ? "Cancelling..." : "Cancel order"}</button>}
          <Link to={ROUTES.PRODUCTS} className="btn btn-ghost btn-block">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
};
export default OrderDetailsPage;
