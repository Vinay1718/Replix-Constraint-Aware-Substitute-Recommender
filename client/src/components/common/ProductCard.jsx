import { Link } from "react-router-dom";
import ProductImage from "./ProductImage";
import { ROUTES } from "../../utils/constants";
import { money } from "../../utils/format";

const ProductCard = ({ product, onAddToCart }) => {
  const inStock = product.stock > 0;
  const low = inStock && product.stock <= 5;
  const organic = product.attributes?.organic === true;

  return (
    <article className={`product-card ${inStock ? "" : "is-out"}`}>
      <Link to={`/products/${product._id}`} className="pc-media" aria-label={`View ${product.name}`}>
        <ProductImage product={product} />
        <div className="pc-badges">
          {!inStock && <span className="badge badge-danger">Out of stock</span>}
          {low && <span className="badge badge-warn">Only {product.stock} left</span>}
          {organic && <span className="badge badge-green">Organic</span>}
        </div>
      </Link>
      <div className="pc-body">
        <p className="pc-brand">{product.brand}</p>
        <h3 className="pc-name"><Link to={`/products/${product._id}`}>{product.name}</Link></h3>
        {product.dietaryTags.length > 0 && (
          <div className="tag-row tag-row-tight">
            {product.dietaryTags.slice(0, 3).map((t) => <span key={t} className="tag tag-neutral">{t}</span>)}
          </div>
        )}
        <div className="pc-foot">
          <span className="price">{money(product.price)}</span>
          {inStock ? (
            <button className="btn btn-primary btn-sm" onClick={() => onAddToCart?.(product)} disabled={!onAddToCart}>Add to cart</button>
          ) : (
            <Link to={`${ROUTES.RECOMMENDATIONS}?productId=${product._id}`} className="btn btn-accent btn-sm">Find substitutes</Link>
          )}
        </div>
      </div>
    </article>
  );
};
export default ProductCard;
