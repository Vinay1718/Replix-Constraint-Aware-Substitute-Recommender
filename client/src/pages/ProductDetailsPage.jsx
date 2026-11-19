import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { EmptyState, ErrorMessage, ExplanationTag, Loader, ProductImage, SubstitutePanel } from "../components/common";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { productService } from "../services";
import { ROUTES } from "../utils/constants";
import { money } from "../utils/format";

const ProductDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const { data: product, loading, error, reload } = useAsync(() => productService.getById(id), [id]);

  if (loading) return <Loader label="Loading product..." />;
  if (error?.status === 404) {
    return <EmptyState icon="🤷" title="Product not found"><Link to={ROUTES.PRODUCTS} className="btn btn-outline">Back to products</Link></EmptyState>;
  }
  if (error) return <ErrorMessage message={error.message} onRetry={reload} />;

  const inStock = product.stock > 0;
  const q = Math.min(Math.max(1, qty), Math.max(1, product.stock));
  const add = (goToCheckout) => {
    if (!addItem(product, q)) return;
    toast.success(`${product.name} added to cart`);
    if (goToCheckout) navigate(ROUTES.CHECKOUT);
  };
  const addSubstitute = (substitute) => {
    addItem(substitute, 1, { substitutedFor: { _id: product._id, name: product.name } });
    toast.success(`${substitute.name} added to your cart`);
  };

  return (
    <div>
      <nav className="crumbs"><Link to={ROUTES.PRODUCTS}>Products</Link> / <Link to={`${ROUTES.PRODUCTS}?category=${encodeURIComponent(product.category)}`}>{product.category}</Link> / <span>{product.name}</span></nav>
      <div className="details-layout">
        <ProductImage product={product} size="xl" />
        <div className="details-info">
          <p className="pc-brand">{product.brand}</p>
          <h1>{product.name}</h1>
          <p className="price price-lg">{money(product.price)}</p>
          <p className="details-desc">{product.description}</p>
          <div className="tag-row">{product.dietaryTags.map((t) => <ExplanationTag key={t} label={t} variant="neutral" />)}{product.attributes?.organic && <span className="badge badge-green">Organic</span>}</div>
          <dl className="specs">{Object.entries(product.attributes).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}</dd></div>)}</dl>

          {inStock ? (
            <>
              <p className={product.stock <= 5 ? "low-stock" : "in-stock"}>{product.stock <= 5 ? `Only ${product.stock} left` : `In stock (${product.stock})`}</p>
              <div className="buy-row">
                <div className="qty-controls">
                  <button className="btn btn-outline btn-sm" onClick={() => setQty(q - 1)} disabled={q <= 1}>−</button>
                  <span>{q}</span>
                  <button className="btn btn-outline btn-sm" onClick={() => setQty(q + 1)} disabled={q >= product.stock}>+</button>
                </div>
                <button className="btn btn-primary" onClick={() => add(false)}>Add to cart</button>
                <button className="btn btn-accent" onClick={() => add(true)}>Buy now</button>
              </div>
            </>
          ) : (
            <div className="notice notice-danger">
              <strong>Currently out of stock</strong>
              <p>We can suggest substitutes that fit your rules.</p>
              <Link to={`${ROUTES.RECOMMENDATIONS}?productId=${product._id}`} className="btn btn-primary">See all substitutes</Link>
            </div>
          )}
        </div>
      </div>

      {!inStock && (
        <section className="section">
          <h2 className="section-title">Top substitutes for you</h2>
          {isAuthenticated ? (
            <div className="card"><SubstitutePanel original={product} actionLabel="Add to cart" onPick={addSubstitute} /></div>
          ) : (
            <div className="card"><p>Log in so we can apply your budget and dietary rules. <Link to={ROUTES.LOGIN} state={{ from: { pathname: `/products/${id}`, search: "" } }}>Log in</Link> or <Link to={ROUTES.REGISTER}>register</Link>.</p></div>
          )}
        </section>
      )}
    </div>
  );
};
export default ProductDetailsPage;
