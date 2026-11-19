import { useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorMessage, Loader, StatusBadge } from "../components/common";
import { useAsync } from "../hooks/useAsync";
import { orderService } from "../services";
import { ROUTES } from "../utils/constants";
import { dateOnly, money } from "../utils/format";

const OrdersPage = () => {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => orderService.list({ page, limit: 10 }), [page]);

  if (error) return <ErrorMessage message={error.message} onRetry={reload} />;
  if (loading && !data) return <Loader label="Loading your orders..." />;

  if (data.total === 0) {
    return (
      <EmptyState icon="📦" title="No orders yet">
        <p className="muted">When you check out, your orders and their tracking show up here.</p>
        <Link to={ROUTES.PRODUCTS} className="btn btn-primary">Start shopping</Link>
      </EmptyState>
    );
  }

  return (
    <div>
      <h1>My orders</h1>
      <div className="order-list">
        {data.items.map((o) => {
          const swaps = o.items.filter((i) => i.substitutedFor).length;
          return (
            <Link key={o._id} to={`/orders/${o._id}`} className="order-card">
              <div className="order-top"><strong>{o.orderNumber}</strong><StatusBadge status={o.status} /></div>
              <p className="muted">{dateOnly(o.createdAt)} · {o.items.reduce((s, i) => s + i.quantity, 0)} item(s)</p>
              <p className="order-names">{o.items.map((i) => i.name).join(", ")}</p>
              <div className="order-bottom">
                <span>{swaps > 0 && <span className="badge badge-ai">{swaps} smart swap{swaps > 1 ? "s" : ""}</span>}</span>
                <strong>{money(o.total)}</strong>
              </div>
            </Link>
          );
        })}
      </div>
      {data.pages > 1 && (
        <div className="pager">
          <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {data.page} of {data.pages}</span>
          <button className="btn btn-outline" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
};
export default OrdersPage;
