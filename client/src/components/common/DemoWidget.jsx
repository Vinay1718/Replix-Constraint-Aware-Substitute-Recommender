import { useState } from "react";
import { Link } from "react-router-dom";
import ExplanationTag from "./ExplanationTag";
import ProductImage from "./ProductImage";
import Loader from "./Loader";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../hooks/useAuth";
import { demoService } from "../../services";
import { ROUTES } from "../../utils/constants";
import { money, percent } from "../../utils/format";

// Public, no login: the real constraint-aware engine, rule-based, nothing stored.
const DemoWidget = () => {
  const { isAuthenticated } = useAuth();
  const { data: examples } = useAsync(() => demoService.examples(), []);
  const [picked, setPicked] = useState("");
  const [vegan, setVegan] = useState(false);
  const [glutenFree, setGlutenFree] = useState(false);
  const [organic, setOrganic] = useState(false);
  const [budget, setBudget] = useState("");

  const productId = picked || examples?.[0]?._id;
  const original = examples?.find((p) => p._id === productId);
  const requirements = {
    maxBudget: budget === "" ? null : Number(budget),
    sameCategoryOnly: true,
    organicOnly: organic,
    dietaryRestrictions: [...(vegan ? ["vegan"] : []), ...(glutenFree ? ["gluten-free"] : [])],
    preferredBrands: [],
  };

  const { data, loading, error } = useAsync(
    () => (productId ? demoService.recommend({ productId, requirements, topN: 3 }) : Promise.resolve(null)),
    [productId, vegan, glutenFree, organic, budget]
  );

  return (
    <div className="demo">
      <div className="demo-controls">
        <label className="form-field">When this is out of stock
          <select value={productId ?? ""} onChange={(e) => setPicked(e.target.value)}>
            {(examples ?? []).map((p) => <option key={p._id} value={p._id}>{p.name} ({money(p.price)})</option>)}
          </select>
        </label>
        <div className="demo-toggles">
          <label className="chip-check"><input type="checkbox" checked={vegan} onChange={(e) => setVegan(e.target.checked)} />Vegan</label>
          <label className="chip-check"><input type="checkbox" checked={glutenFree} onChange={(e) => setGlutenFree(e.target.checked)} />Gluten-free</label>
          <label className="chip-check"><input type="checkbox" checked={organic} onChange={(e) => setOrganic(e.target.checked)} />Organic only</label>
        </div>
        <label className="form-field">Max price per item ($)
          <input type="number" min="0" step="0.5" placeholder="No limit" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </label>
        <p className="muted demo-note">Rules are hard filters: change them and watch products drop out. Ranking only orders what survives.</p>
      </div>

      <div className="demo-results">
        {original && <p className="demo-original"><ProductImage product={original} size="sm" /><span><strong>{original.name}</strong><br /><span className="out-of-stock">Out of stock</span></span></p>}
        {loading && !data ? <Loader label="Checking your rules..." /> : error ? <p className="form-error">{error.message}</p> : !data || data.recommendations.length === 0 ? (
          <div className="demo-empty"><strong>No substitute passes every rule.</strong><p className="muted">That is the point: the engine never shows something that breaks a constraint. Loosen a rule to see options.</p></div>
        ) : (
          <ol className="demo-list">
            {data.recommendations.map((r, i) => (
              <li key={r.product._id}>
                <ProductImage product={r.product} size="sm" />
                <div>
                  <strong>#{i + 1} {r.product.name}</strong> <span className="price">{money(r.product.price)}</span>
                  <div className="match match-inline"><div className="match-bar"><div style={{ width: percent(r.finalScore) }} /></div><span>{percent(r.finalScore)} match</span></div>
                  <div className="tag-row tag-row-tight">{r.explanationTags.slice(0, 5).map((t) => <ExplanationTag key={t} label={t} />)}</div>
                </div>
              </li>
            ))}
          </ol>
        )}
        <Link className="btn btn-primary" to={isAuthenticated ? `${ROUTES.RECOMMENDATIONS}?productId=${productId}` : ROUTES.REGISTER}>
          {isAuthenticated ? "Open full results & add to cart" : "Create a free account to shop substitutes"}
        </Link>
      </div>
    </div>
  );
};
export default DemoWidget;
