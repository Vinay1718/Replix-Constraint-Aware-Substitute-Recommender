import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { EmptyState, ErrorMessage, Loader, ProductImage, RecommendationCard } from "../components/common";
import { useAsync } from "../hooks/useAsync";
import { useCart } from "../hooks/useCart";
import { usePreferences } from "../hooks/usePreferences";
import { feedbackService, productService, recommendationService } from "../services";
import { ROUTES } from "../utils/constants";
import { money } from "../utils/format";

const ConstraintChips = ({ prefs }) => {
  const chips = [
    prefs.maxBudget !== null && `Max ${money(prefs.maxBudget)}`,
    prefs.sameCategoryOnly && "Same category",
    prefs.organicOnly && "Organic only",
    ...prefs.dietaryRestrictions,
  ].filter(Boolean);
  return (
    <div className="constraint-chips">
      <span className="muted">Your rules:</span>
      {chips.length ? chips.map((c) => <span key={c} className="tag tag-neutral">{c}</span>) : <span className="muted">none set</span>}
      <Link to={ROUTES.PREFERENCES} className="link-button">Edit</Link>
    </div>
  );
};

const RecommendationPage = () => {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("productId");
  const navigate = useNavigate();
  const { preferences } = usePreferences();
  const { addItem } = useCart();
  const [decisions, setDecisions] = useState({});

  const { data, loading, error, reload } = useAsync(async () => {
    if (!productId) return null;
    const [original, result] = await Promise.all([
      productService.getById(productId),
      recommendationService.getSubstitutes({ productId, requirements: preferences }),
    ]);
    setDecisions({});
    return { original, recommendations: result.recommendations };
  }, [productId, preferences]);

  if (!productId) return <EmptyState icon="🔎" title="No product selected"><Link to={ROUTES.PRODUCTS} className="btn btn-outline">Browse products</Link></EmptyState>;
  if (loading && !data) return <Loader label="Finding substitutes that fit your rules..." />;
  if (error?.status === 404) return <EmptyState icon="🤷" title="Product not found"><Link to={ROUTES.PRODUCTS} className="btn btn-outline">Browse products</Link></EmptyState>;
  if (error) return <ErrorMessage message={error.message} onRetry={reload} />;

  const { original, recommendations } = data;
  const out = original.stock <= 0;

  const record = (substituteId, decision) =>
    recommendationService.recordDecision({ originalProductId: productId, substituteProductId: substituteId, decision }).catch(() => {});

  // Adding to the cart IS the "accept": the cart item remembers what it replaces
  const addToCart = (rec, buyNow) => {
    if (!addItem(rec.product, 1, { substitutedFor: { _id: original._id, name: original.name } })) {
      toast.error("This substitute just went out of stock.");
      return;
    }
    setDecisions((d) => ({ ...d, [rec.product._id]: "accepted" }));
    record(rec.product._id, "accepted");
    if (buyNow) navigate(ROUTES.CHECKOUT);
    else toast.success(`${rec.product.name} added to your cart`);
  };

  const reject = (rec) => {
    setDecisions((d) => ({ ...d, [rec.product._id]: "rejected" }));
    record(rec.product._id, "rejected");
  };

  const handleFeedback = async (substituteId, { rating, comment }) => {
    try {
      await feedbackService.submit({ originalProductId: productId, substituteProductId: substituteId, rating, comment });
      toast.success("Feedback saved");
    } catch (err) { toast.error(err.message); throw err; }
  };

  return (
    <div>
      <div className="reco-head">
        <ProductImage product={original} size="md" />
        <div>
          <p className="pc-brand">{out ? "Out of stock" : "Looking for alternatives to"}</p>
          <h1>{original.name}</h1>
          <p className="muted">{original.brand} · {money(original.price)} · {original.category}</p>
        </div>
      </div>
      <ConstraintChips prefs={preferences} />
      <p className="muted page-sub">Every suggestion below satisfies all of your rules and is in stock. Add one straight to your cart.</p>

      {recommendations.length === 0 ? (
        <EmptyState icon="🧐" title="No suitable substitutes found">
          <p className="muted">Nothing in stock satisfies every one of your rules. Relaxing your budget or dietary preferences usually helps.</p>
          <Link to={ROUTES.PREFERENCES} className="btn btn-primary">Edit preferences</Link>
        </EmptyState>
      ) : (
        <div className="reco-list">
          {recommendations.map((rec, index) => (
            <RecommendationCard
              key={rec.product._id}
              recommendation={rec}
              rank={index + 1}
              decision={decisions[rec.product._id]}
              onAddToCart={() => addToCart(rec, false)}
              onBuyNow={() => addToCart(rec, true)}
              onReject={() => reject(rec)}
              onSubmitFeedback={(fb) => handleFeedback(rec.product._id, fb)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
export default RecommendationPage;
