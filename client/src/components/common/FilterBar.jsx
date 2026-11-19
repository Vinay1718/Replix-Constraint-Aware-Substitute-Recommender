export const DEFAULT_FILTERS = { search: "", category: "all", inStockOnly: false, sort: "name" };

const FilterBar = ({ filters, categories, onChange, onReset }) => {
  const update = (field, value) => onChange({ ...filters, [field]: value });
  return (
    <div className="filter-row">
      <input type="search" placeholder="Search products or brands..." value={filters.search} onChange={(e) => update("search", e.target.value)} />
      <select value={filters.category} onChange={(e) => update("category", e.target.value)} aria-label="Category">
        {categories.map((c) => <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>)}
      </select>
      <select value={filters.sort} onChange={(e) => update("sort", e.target.value)} aria-label="Sort">
        <option value="name">Sort: Name</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
        <option value="stock">Availability first</option>
      </select>
      <label className="chip-check"><input type="checkbox" checked={filters.inStockOnly} onChange={(e) => update("inStockOnly", e.target.checked)} />In stock only</label>
      <button type="button" className="btn btn-outline" onClick={onReset}>Reset</button>
    </div>
  );
};
export default FilterBar;
