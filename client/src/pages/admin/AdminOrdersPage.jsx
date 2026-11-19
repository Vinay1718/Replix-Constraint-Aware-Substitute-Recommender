import { useState } from "react";
import toast from "react-hot-toast";
import { ErrorMessage, Loader, StatusBadge } from "../../components/common";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import { adminService } from "../../services";
import { dateTime, money } from "../../utils/format";
import Pager from "./Pager";

// Mirrors the server's allowed transitions (the server enforces them)
const NEXT = {
  placed: [["shipped", "Mark shipped"], ["cancelled", "Cancel & restock"]],
  shipped: [["delivered", "Mark delivered"], ["cancelled", "Cancel & restock"]],
  delivered: [],
  cancelled: [],
};

const AdminOrdersPage = () => {
  const [filters, setFilters] = useState({ status: "all", search: "", page: 1 });
  const debounced = useDebounce(filters.search, 300);
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(null);

  const { data, loading, error, reload } = useAsync(
    () => adminService.listOrders({ status: filters.status, search: debounced, page: filters.page, limit: 12 }),
    [filters.status, debounced, filters.page]
  );

  const move = async (order, status) => {
    if (status === "cancelled" && !window.confirm(`Cancel ${order.orderNumber}? Items go back into stock${order.paymentStatus === "paid" ? " and the payment is marked refunded" : ""}.`)) return;
    setBusy(order._id);
    try { await adminService.updateOrderStatus(order._id, status); toast.success(`Order ${status}`); reload(); }
    catch (err) { toast.error(err.message); }
    finally { setBusy(null); }
  };

  return (
    <div>
      <h1>Orders</h1>
      <div className="filter-row">
        <input type="search" placeholder="Search order number..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })} />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
          <option value="all">All statuses</option><option value="placed">Placed</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error ? <ErrorMessage message={error.message} onRetry={reload} /> : loading && !data ? <Loader /> : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th /></tr></thead>
              <tbody>
                {data.items.map((o) => (
                  <>
                    <tr key={o._id}>
                      <td><button className="link-button" onClick={() => setExpanded(expanded === o._id ? null : o._id)}>{o.orderNumber}</button>{o.items.some((i) => i.substitutedFor) && <><br /><span className="badge badge-ai">swap</span></>}</td>
                      <td>{o.user?.name ?? "(deleted)"}<br /><span className="muted">{o.user?.email}</span></td>
                      <td>{dateTime(o.createdAt)}</td>
                      <td>{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                      <td>{money(o.total)}</td>
                      <td>{o.paymentMethod === "cod" ? "COD" : "Card (demo)"}<br /><span className="muted">{o.paymentStatus}</span></td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="row-actions">
                        {NEXT[o.status].map(([to, label]) => (
                          <button key={to} className="btn btn-outline btn-sm" disabled={busy === o._id} onClick={() => move(o, to)}>{label}</button>
                        ))}
                      </td>
                    </tr>
                    {expanded === o._id && (
                      <tr key={`${o._id}-d`} className="row-detail"><td colSpan="8">
                        <div className="detail-grid">
                          <div>
                            <strong>Items</strong>
                            <ul className="plain-list">{o.items.map((i) => <li key={i.product}>{i.quantity} × {i.name} ({money(i.price)}){i.substitutedFor && <span className="badge badge-ai">swap for {i.substitutedFor.name}</span>}</li>)}</ul>
                          </div>
                          <div>
                            <strong>Deliver to</strong>
                            <address>{o.shippingAddress.fullName}, {o.shippingAddress.phone}<br />{o.shippingAddress.line1}{o.shippingAddress.line2 ? `, ${o.shippingAddress.line2}` : ""}<br />{o.shippingAddress.city} {o.shippingAddress.postalCode}</address>
                          </div>
                        </div>
                      </td></tr>
                    )}
                  </>
                ))}
                {data.items.length === 0 && <tr><td colSpan="8" className="muted">No orders match.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="muted">{data.total} orders</p>
          <Pager page={data.page} pages={data.pages} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
        </>
      )}
    </div>
  );
};
export default AdminOrdersPage;
