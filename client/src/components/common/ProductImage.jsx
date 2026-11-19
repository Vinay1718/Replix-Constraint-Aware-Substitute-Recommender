import { categoryHue, productEmoji } from "../../utils/format";

// No photos in the catalog, so each product gets a colour tile + emoji derived from its name and category.
const ProductImage = ({ product, size = "md", className = "" }) => {
  const hue = categoryHue(product.category);
  return (
    <div
      className={`pimg pimg-${size} ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 85% 95%), hsl(${(hue + 30) % 360} 75% 86%))` }}
      role="img"
      aria-label={product.name}
    >
      <span className="pimg-emoji" aria-hidden="true">{productEmoji(product)}</span>
    </div>
  );
};
export default ProductImage;
