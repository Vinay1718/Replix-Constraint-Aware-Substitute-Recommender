import { useState } from "react";
import toast from "react-hot-toast";
import { ErrorMessage, Loader } from "../../components/common";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import { adminService } from "../../services";
import { DIETARY_OPTIONS } from "../../utils/constants";
import Pager from "./Pager";

const BLANK = { name: "", category: "", brand: "", price: "", description: "", size: "", organic: false, dietaryTags: [], stock: "0" };

const toForm = (p) => ({
  name: p.name, category: p.category, brand: p.brand, price: String(p.price), description: p.description ?? "",
  size: p.attributes?.size ?? "", organic: p.attributes?.organic === true, dietaryTags: p.dietaryTags ?? [], stock: String(p.stock ?? 0),
});

const toPayload = (f, isCreate) => {
  const attributes = { organic: f.organic, ...(f.size.trim() && { size: f.size.trim() }) };
  return {
    name: f.name.trim(), category: f.category.trim(), brand: f.brand.trim(), price: Number(f.price),
    description: f.description.trim(), attributes, dietaryTags: f.dietaryTags,
    ...(isCreate && { stock: Number(f.stock) || 0 }),
  };
};

const ProductForm = ({ initial, isCreate, categories, onSaved, onCancel }) => {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleTag = (t) => set("dietaryTags", form.dietaryTags.includes(t) ? form.dietaryTags.filter((x) => x !== t) : [...form.dietaryTags, t]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.price === "" || Number.isNaN(Number(form.price))) { setError("Price is required."); return; }
    setSaving(true);
    setError("");
    try {
      await onSaved(toPayload(form, isCreate));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card admin-form" onSubmit={submit}>
      <h3>{isCreate ? "New product" : "Edit product"}</h3>
      {error && <p className="form-error">{error}</p>}
      <div className="form-grid">
        <label className="form-field">Name<input value={form.name} onChange={(e) => set("name", e.target.value)} required /></label>
        <label className="form-field">Brand<input value={form.brand} onChange={(e) => set("brand", e.target.value)} required /></label>
        <label className="form-field">Category
          <input list="categories" value={form.category} onChange={(e) => set("category", e.target.value)} required />
          <datalist id="categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <label className="form-field">Price ($)<input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} required /></label>
        <label className="form-field">Size (e.g. 1L, 400g)<input value={form.size} onChange={(e) => set("size", e.target.value)} /></label>
        {isCreate && <label className="form-field">Initial stock<input type="number" min="0" step="1" value={form.stock} onChange={(e) => set("stock", e.target.value)} /></label>}
      </div>
      <label className="form-field">Description<input value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
      <label className="checkbox-field"><input type="checkbox" checked={form.organic} onChange={(e) => set("organic", e.target.checked)} />Organic</label>
      <fieldset className="form-field">
        <legend>Dietary tags (only tick what is certain: a missing tag means "unknown" and is treated as not satisfied)</legend>
        <div className="tag-row">
          {DIETARY_OPTIONS.map((t) => (
            <label key={t} className="checkbox-field"><input type="checkbox" checked={form.dietaryTags.includes(t)} onChange={() => toggleTag(t)} />{t}</label>
          ))}
        </div>
      </fieldset>
      <div className="hero-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

const StockCell = ({ product, onChanged }) => {
  const [value, setValue] = useState("");
  const apply = async (data) => {
    try { await adminService.updateInventory(product._id, data); setValue(""); onChanged(); toast.success("Stock updated"); }
    catch (err) { toast.error(err.message); }
  };
  const status = product.stock === 0 ? "out-of-stock" : product.stock <= product.lowStockThreshold ? "low-stock" : "in-stock";
  return (
    <div className="stock-cell">
      <strong className={status}>{product.stock}</strong>
      <input type="number" min="0" step="1" placeholder="set" value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="btn btn-outline btn-sm" disabled={value === ""} onClick={() => apply({ quantity: Number(value) })}>Set</button>
      <button className="btn btn-outline btn-sm" onClick={() => apply({ delta: 10 })}>+10</button>
    </div>
  );
};

const AdminProductsPage = () => {
  const [filters, setFilters] = useState({ search: "", status: "all", stockStatus: "all", page: 1 });
  const debounced = useDebounce(filters.search, 300);
  const [editing, setEditing] = useState(null); // null | "new" | product

  const { data, loading, error, reload } = useAsync(
    () => adminService.listProducts({ search: debounced, status: filters.status, stockStatus: filters.stockStatus, page: filters.page, limit: 15 }),
    [debounced, filters.status, filters.stockStatus, filters.page]
  );
  const { data: cats } = useAsync(async () => [...new Set((await adminService.listProducts({ limit: 100 })).items.map((p) => p.category))], []);

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v, page: 1 }));

  const save = async (payload) => {
    if (editing === "new") await adminService.createProduct(payload);
    else await adminService.updateProduct(editing._id, payload);
    toast.success("Product saved");
    setEditing(null);
    reload();
  };
  const setActive = async (p, isActive) => {
    try {
      if (isActive) await adminService.updateProduct(p._id, { isActive: true });
      else await adminService.deactivateProduct(p._id);
      toast.success(isActive ? "Product reactivated" : "Product deactivated");
      reload();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="admin-head">
        <h1>Products &amp; Inventory</h1>
        <button className="btn btn-primary" onClick={() => setEditing("new")}>New product</button>
      </div>

      {editing && (
        <ProductForm
          key={editing === "new" ? "new" : editing._id}
          initial={editing === "new" ? BLANK : toForm(editing)}
          isCreate={editing === "new"}
          categories={cats ?? []}
          onSaved={save}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="filter-row">
        <input type="text" placeholder="Search name or brand..." value={filters.search} onChange={(e) => setFilter("search", e.target.value)} />
        <select value={filters.stockStatus} onChange={(e) => setFilter("stockStatus", e.target.value)}>
          <option value="all">All stock levels</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="all">Active &amp; inactive</option><option value="active">Active</option><option value="inactive">Inactive</option>
        </select>
      </div>

      {error ? <ErrorMessage message={error.message} onRetry={reload} /> : loading && !data ? <Loader /> : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th /></tr></thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p._id} className={p.isActive ? "" : "row-inactive"}>
                    <td>{p.name}<br /><span className="muted">{p.brand}{p.dietaryTags.length ? ` · ${p.dietaryTags.join(", ")}` : ""}</span></td>
                    <td>{p.category}</td>
                    <td>${p.price.toFixed(2)}</td>
                    <td><StockCell product={p} onChanged={reload} /></td>
                    <td>{p.isActive ? "Active" : "Inactive"}</td>
                    <td className="row-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => setEditing(p)}>Edit</button>
                      {p.isActive
                        ? <button className="btn btn-outline btn-sm" onClick={() => setActive(p, false)}>Deactivate</button>
                        : <button className="btn btn-outline btn-sm" onClick={() => setActive(p, true)}>Reactivate</button>}
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 && <tr><td colSpan="6" className="muted">No products match.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="muted">{data.total} products</p>
          <Pager page={data.page} pages={data.pages} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
        </>
      )}
    </div>
  );
};
export default AdminProductsPage;
