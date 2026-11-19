import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { EmptyState, ErrorMessage, FilterBar, ProductCard, SkeletonGrid, DEFAULT_FILTERS } from "../components/common";
import { useAsync } from "../hooks/useAsync";
import { useCart } from "../hooks/useCart";
import { useDebounce } from "../hooks/useDebounce";
import { productService } from "../services";

const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name),
  "price-asc": (a, b) => a.price - b.price || a.name.localeCompare(b.name),
  "price-desc": (a, b) => b.price - a.price || a.name.localeCompare(b.name),
  stock: (a, b) => (b.stock > 0) - (a.stock > 0) || a.name.localeCompare(b.name),
};

// Filters live in the URL, so a filtered view can be shared or reloaded
const ProductListPage = () => {
  const [params, setParams] = useSearchParams();
  const filters = {
    search: params.get("search") ?? DEFAULT_FILTERS.search,
    category: params.get("category") ?? DEFAULT_FILTERS.category,
    inStockOnly: params.get("inStock") === "1",
    sort: SORTS[params.get("sort")] ? params.get("sort") : DEFAULT_FILTERS.sort,
  };
  const setFilters = (next) => {
    const p = new URLSearchParams();
    if (next.search) p.set("search", next.search);
    if (next.category !== "all") p.set("category", next.category);
    if (next.inStockOnly) p.set("inStock", "1");
    if (next.sort !== "name") p.set("sort", next.sort);
    setParams(p, { replace: true });
  };

  const debouncedSearch = useDebounce(filters.search, 300);
  const { addItem } = useCart();
  const { data: categoryData } = useAsync(() => productService.getCategories(), []);
  const categories = ["all", ...(categoryData ?? [])];

  const { data, loading, error, reload } = useAsync(
    () => productService.list({ search: debouncedSearch, category: filters.category, inStockOnly: filters.inStockOnly }),
    [debouncedSearch, filters.category, filters.inStockOnly]
  );
  const products = useMemo(() => (data ? [...data].sort(SORTS[filters.sort]) : null), [data, filters.sort]);

  const handleAdd = (product) => {
    if (addItem(product)) toast.success(`${product.name} added to cart`);
    else toast.error("This product is out of stock");
  };

  return (
    <div>
      <div className="page-head"><h1>Products</h1>{products && <span className="muted">{products.length} item{products.length === 1 ? "" : "s"}</span>}</div>
      <p className="muted page-sub">Out-of-stock items show a <strong>Find substitutes</strong> button.</p>
      <FilterBar filters={filters} categories={categories} onChange={setFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />
      {error ? <ErrorMessage message={error.message} onRetry={reload} />
        : loading && !products ? <SkeletonGrid />
        : products.length === 0 ? <EmptyState icon="🔎" title="No products found"><p className="muted">Try a different search or clear the filters.</p></EmptyState>
        : <div className="product-grid">{products.map((p) => <ProductCard key={p._id} product={p} onAddToCart={handleAdd} />)}</div>}
    </div>
  );
};
export default ProductListPage;
