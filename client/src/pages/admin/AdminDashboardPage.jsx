import { useState } from "react";
import toast from "react-hot-toast";
import { ErrorMessage, Loader } from "../../components/common";
import { useAsync } from "../../hooks/useAsync";
import { adminService } from "../../services";
import { money } from "../../utils/format";

const pct = (n) => (n === null || n === undefined ? "–" : `${Math.round(n * 100)}%`);

const Stat = ({ label, value, hint }) => (
  <div className="card stat">
    <span className="stat-value">{value}</span>
    <span className="stat-label">{label}</span>
    {hint && <span className="muted stat-hint">{hint}</span>}
  </div>
);

const RULE_LABELS = { stock: "Out of stock", category: "Different category", budget: "Over budget", dietary: "Dietary", organic: "Not organic", attributes: "Attributes" };

const AdminDashboardPage = () => {
  const { data, loading, error, reload } = useAsync(() => adminService.analytics(), []);
  const [embedding, setEmbedding] = useState(false);

  const buildEmbeddings = async () => {
    setEmbedding(true);
    try {
      const r = await adminService.refreshEmbeddings();
      toast.success(`Embedded ${r.embedded} of ${r.total} products (${r.provider})`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEmbedding(false);
    }
  };

  if (loading && !data) return <Loader label="Loading analytics..." />;
  if (error) return <ErrorMessage message={error.message} onRetry={reload} />;

  const { products, users, recommendations: rec, constraints, topSubstitutes, mostRequested, feedback, orders } = data;
  const maxRejected = Math.max(1, ...Object.keys(RULE_LABELS).map((k) => constraints[k]));

  return (
    <div>
      <div className="admin-head">
        <h1>Dashboard</h1>
        <button className="btn btn-outline" onClick={reload}>Refresh</button>
      </div>

      <div className="stat-grid">
        <Stat label="Active products" value={products.active} hint={`${products.inactive} inactive`} />
        <Stat label="Out of stock" value={products.outOfStock} />
        <Stat label="Low stock" value={products.lowStock} />
        <Stat label="Customers" value={users} />
        <Stat label="Recommendation runs" value={rec.runs} hint={`${rec.runsWithNoResults} with no result (${pct(rec.noResultRate)})`} />
        <Stat label="Acceptance rate" value={pct(rec.acceptanceRate)} hint={`${rec.decisions.accepted} accepted · ${rec.decisions.rejected} rejected`} />
        <Stat label="Avg. feedback rating" value={feedback.averageRating ?? "–"} hint={`${feedback.count} rating${feedback.count === 1 ? "" : "s"}`} />
        <Stat label="Orders" value={orders.orders} hint={`${orders.byStatus.placed ?? 0} placed · ${orders.byStatus.shipped ?? 0} shipped · ${orders.byStatus.delivered ?? 0} delivered · ${orders.byStatus.cancelled ?? 0} cancelled`} />
        <Stat label="Revenue" value={money(orders.revenue)} hint="excludes cancelled orders" />
        <Stat label="Sold via substitutes" value={orders.substitutedUnits} hint={`${money(orders.substitutedRevenue)} across ${orders.ordersWithSubstitutes} orders`} />
      </div>

      <div className="two-col">
        <div className="card">
          <h3>Why candidates were rejected</h3>
          <p className="muted">First failing constraint per candidate ({constraints.rejected} of {constraints.evaluated} evaluated).</p>
          {Object.entries(RULE_LABELS).map(([key, label]) => (
            <div key={key} className="bar-row">
              <span className="bar-label">{label}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(constraints[key] / maxRejected) * 100}%` }} /></div>
              <span className="bar-num">{constraints[key]}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>Engine &amp; AI</h3>
          {rec.engineVersions.length === 0 ? <p className="muted">No runs yet.</p> : (
            <ul className="plain-list">
              {rec.engineVersions.map((v) => <li key={v.version}><strong>{v.version}</strong>: {v.runs} runs</li>)}
            </ul>
          )}
          <p className="muted">Embeddings power the AI similarity score when <code>AI_ENABLED=true</code> on the server.</p>
          <button className="btn btn-outline" onClick={buildEmbeddings} disabled={embedding}>{embedding ? "Working..." : "Build / refresh embeddings"}</button>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3>Top accepted substitutes</h3>
          {topSubstitutes.length === 0 ? <p className="muted">No decisions yet.</p> : (
            <table className="table">
              <thead><tr><th>Product</th><th>Accepted</th><th>Rejected</th></tr></thead>
              <tbody>{topSubstitutes.map((s) => <tr key={s.productId}><td>{s.name}<br /><span className="muted">{s.brand}</span></td><td>{s.accepted}</td><td>{s.rejected}</td></tr>)}</tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3>Most requested substitutions</h3>
          {mostRequested.length === 0 ? <p className="muted">No requests yet.</p> : (
            <table className="table">
              <thead><tr><th>Original product</th><th>Requests</th></tr></thead>
              <tbody>{mostRequested.map((s) => <tr key={s.productId}><td>{s.name}<br /><span className="muted">{s.brand}</span></td><td>{s.requests}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
export default AdminDashboardPage;
