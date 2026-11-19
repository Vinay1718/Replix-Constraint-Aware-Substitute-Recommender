import { useState } from "react";
import toast from "react-hot-toast";
import { ErrorMessage, Loader } from "../../components/common";
import { useAsync } from "../../hooks/useAsync";
import { adminService } from "../../services";
import Pager from "./Pager";
import ProductPicker from "./ProductPicker";

const AdminLabelsPage = () => {
  const [filters, setFilters] = useState({ originalProductId: "", source: "all", status: "all", page: 1 });
  const [form, setForm] = useState({ originalProductId: "", substituteProductId: "", relationType: "close", similarityScore: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useAsync(
    () => adminService.listLabels({ ...filters, limit: 15 }),
    [filters.originalProductId, filters.source, filters.status, filters.page]
  );

  const create = async (e) => {
    e.preventDefault();
    if (!form.originalProductId || !form.substituteProductId) { toast.error("Pick both products"); return; }
    setSaving(true);
    try {
      await adminService.createLabel({
        originalProductId: form.originalProductId, substituteProductId: form.substituteProductId, relationType: form.relationType,
        similarityScore: form.similarityScore === "" ? null : Number(form.similarityScore), notes: form.notes,
      });
      toast.success("Relationship created");
      setForm({ ...form, substituteProductId: "", similarityScore: "", notes: "" });
      reload();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const toggle = async (l) => {
    try { await adminService.updateLabel(l._id, { isActive: !l.isActive }); reload(); } catch (err) { toast.error(err.message); }
  };
  const remove = async (l) => {
    if (!window.confirm("Delete this relationship?")) return;
    try { await adminService.deleteLabel(l._id); toast.success("Deleted"); reload(); } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <h1>Substitute Relationships</h1>
      <p className="muted">Directional: "B substitutes A" does not imply the reverse. A curated similarity (0–1) overrides the computed one when ranking. Constraints still apply.</p>

      <form className="card admin-form" onSubmit={create}>
        <h3>New relationship</h3>
        <div className="form-grid">
          <ProductPicker label="When this is out of stock" value={form.originalProductId} onChange={(v) => setForm((f) => ({ ...f, originalProductId: v }))} />
          <ProductPicker label="Suggest this instead" value={form.substituteProductId} onChange={(v) => setForm((f) => ({ ...f, substituteProductId: v }))} />
          <label className="form-field">Relation
            <select value={form.relationType} onChange={(e) => setForm({ ...form, relationType: e.target.value })}>
              <option value="exact">exact</option><option value="close">close</option><option value="partial">partial</option>
            </select>
          </label>
          <label className="form-field">Similarity (0–1, optional)
            <input type="number" min="0" max="1" step="0.01" value={form.similarityScore} onChange={(e) => setForm({ ...form, similarityScore: e.target.value })} />
          </label>
        </div>
        <label className="form-field">Notes<input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Create"}</button>
      </form>

      <div className="filter-row">
        <select value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value, page: 1 })}>
          <option value="all">All sources</option><option value="admin">admin</option><option value="system">system</option><option value="ai">ai</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
          <option value="all">Active &amp; inactive</option><option value="active">Active</option><option value="inactive">Inactive</option>
        </select>
        {filters.originalProductId && <button className="btn btn-outline" onClick={() => setFilters({ ...filters, originalProductId: "", page: 1 })}>Clear product filter</button>}
      </div>

      {error ? <ErrorMessage message={error.message} onRetry={reload} /> : loading && !data ? <Loader /> : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>If out of stock</th><th>Suggest</th><th>Relation</th><th>Score</th><th>Source</th><th>Active</th><th /></tr></thead>
              <tbody>
                {data.items.map((l) => (
                  <tr key={l._id} className={l.isActive ? "" : "row-inactive"}>
                    <td><button className="link-button" onClick={() => setFilters({ ...filters, originalProductId: l.originalProduct._id, page: 1 })}>{l.originalProduct.name}</button></td>
                    <td>{l.substituteProduct.name}</td>
                    <td>{l.relationType}</td>
                    <td>{l.similarityScore ?? "–"}</td>
                    <td>{l.source}</td>
                    <td>{l.isActive ? "Yes" : "No"}</td>
                    <td className="row-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => toggle(l)}>{l.isActive ? "Disable" : "Enable"}</button>
                      <button className="btn btn-outline btn-sm" onClick={() => remove(l)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 && <tr><td colSpan="7" className="muted">No relationships match.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="muted">{data.total} relationships</p>
          <Pager page={data.page} pages={data.pages} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
        </>
      )}
    </div>
  );
};
export default AdminLabelsPage;
