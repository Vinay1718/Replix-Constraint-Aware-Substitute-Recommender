import { useState } from "react";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import { adminService } from "../../services";

// Search box + dropdown of matching ACTIVE products. onChange receives the product _id (or "").
const ProductPicker = ({ label, value, onChange }) => {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const { data } = useAsync(() => adminService.listProducts({ search: debounced, status: "active", limit: 30 }), [debounced]);
  const items = data?.items ?? [];

  return (
    <div className="form-field">
      <span>{label}</span>
      <input type="text" placeholder="Type to search..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select a product</option>
        {items.map((p) => <option key={p._id} value={p._id}>{p.name} (${p.price.toFixed(2)}, stock {p.stock})</option>)}
      </select>
    </div>
  );
};
export default ProductPicker;
