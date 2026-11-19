import { useState } from "react";
import { ErrorMessage, Loader } from "../../components/common";
import { useAsync } from "../../hooks/useAsync";
import { adminService } from "../../services";
import Pager from "./Pager";

const Stars = ({ n }) => <span className="stars" aria-label={`${n} of 5`}>{"★".repeat(n)}<span className="stars-off">{"★".repeat(5 - n)}</span></span>;

const AdminFeedbackPage = () => {
  const [filters, setFilters] = useState({ rating: "all", page: 1 });
  const { data, loading, error, reload } = useAsync(() => adminService.listFeedback({ rating: filters.rating, page: filters.page, limit: 15 }), [filters.rating, filters.page]);

  if (error) return <ErrorMessage message={error.message} onRetry={reload} />;
  if (loading && !data) return <Loader />;
  const { summary } = data;
  const max = Math.max(1, ...Object.values(summary.distribution));

  return (
    <div>
      <h1>Feedback</h1>
      <div className="two-col">
        <div className="card stat">
          <span className="stat-value">{summary.averageRating ?? "–"}</span>
          <span className="stat-label">Average rating</span>
          <span className="muted stat-hint">{summary.total} ratings{filters.rating !== "all" ? ` (filtered to ${filters.rating}★)` : ""}</span>
        </div>
        <div className="card">
          {[5, 4, 3, 2, 1].map((r) => (
            <div key={r} className="bar-row">
              <span className="bar-label">{r}★</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(summary.distribution[r] / max) * 100}%` }} /></div>
              <span className="bar-num">{summary.distribution[r]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="filter-row">
        <select value={filters.rating} onChange={(e) => setFilters({ rating: e.target.value, page: 1 })}>
          <option value="all">All ratings</option>
          {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} stars</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>When</th><th>Customer</th><th>Out of stock</th><th>Substitute</th><th>Rating</th><th>Comment</th></tr></thead>
          <tbody>
            {data.items.map((f) => (
              <tr key={f._id}>
                <td>{new Date(f.createdAt).toLocaleDateString()}</td>
                <td>{f.user?.name ?? "(deleted)"}<br /><span className="muted">{f.user?.email}</span></td>
                <td>{f.originalProduct?.name ?? "(deleted)"}</td>
                <td>{f.substituteProduct?.name ?? "(deleted)"}</td>
                <td><Stars n={f.rating} /></td>
                <td>{f.comment || <span className="muted">–</span>}</td>
              </tr>
            ))}
            {data.items.length === 0 && <tr><td colSpan="6" className="muted">No feedback yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager page={data.page} pages={data.pages} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
    </div>
  );
};
export default AdminFeedbackPage;
