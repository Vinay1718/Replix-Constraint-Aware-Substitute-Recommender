import { useState } from "react";
import toast from "react-hot-toast";
import ExplanationTag from "./ExplanationTag";
import ProductImage from "./ProductImage";
import Loader from "./Loader";
import { useAsync } from "../../hooks/useAsync";
import { usePreferences } from "../../hooks/usePreferences";
import { recommendationService } from "../../services";
import { money, percent } from "../../utils/format";

// Compact "pick a substitute" list. Used in the cart (swap) and on out-of-stock product pages (add).
const SubstitutePanel = ({ original, quantity = 1, actionLabel = "Use this", onPick }) => {
  const { preferences } = usePreferences();
  const { data, loading, error, reload } = useAsync(
    () => recommendationService.getSubstitutes({ productId: original._id, requirements: preferences, quantity, topN: 3 }),
    [original._id, quantity, preferences]
  );
  const [busy, setBusy] = useState(null);

  const pick = async (rec) => {
    setBusy(rec.product._id);
    try {
      await onPick(rec.product);
      // Best effort: the purchase must not fail just because analytics did
      recommendationService.recordDecision({ originalProductId: original._id, substituteProductId: rec.product._id, decision: "accepted" }).catch(() => {});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading && !data) return <Loader label="Finding substitutes that fit your rules..." />;
  if (error) return <p className="form-error">{error.message} <button className="link-button" onClick={reload}>Try again</button></p>;
  if (data.recommendations.length === 0) return <p className="muted">No substitute satisfies all your constraints. Try relaxing your budget or dietary preferences in Preferences.</p>;

  return (
    <ul className="sub-list">
      {data.recommendations.map((rec) => (
        <li key={rec.product._id} className="sub-item">
          <ProductImage product={rec.product} size="sm" />
          <div className="sub-info">
            <strong>{rec.product.name}</strong>
            <span className="muted">{money(rec.product.price)} · {percent(rec.finalScore)} match</span>
            <div className="tag-row tag-row-tight">{rec.explanationTags.slice(0, 4).map((t) => <ExplanationTag key={t} label={t} />)}</div>
          </div>
          <button className="btn btn-primary btn-sm" disabled={busy !== null} onClick={() => pick(rec)}>{busy === rec.product._id ? "Adding..." : actionLabel}</button>
        </li>
      ))}
    </ul>
  );
};
export default SubstitutePanel;
