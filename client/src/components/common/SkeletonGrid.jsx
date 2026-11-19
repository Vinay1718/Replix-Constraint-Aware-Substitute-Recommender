const SkeletonGrid = ({ count = 8 }) => (
  <div className="product-grid" aria-busy="true">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="skeleton-card"><div className="skeleton skeleton-img" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line short" /></div>
    ))}
  </div>
);
export default SkeletonGrid;
