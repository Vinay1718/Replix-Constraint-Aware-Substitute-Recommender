import { useState } from "react";
import { Link } from "react-router-dom";
import ExplanationTag from "./ExplanationTag";
import FeedbackForm from "./FeedbackForm";
import ProductImage from "./ProductImage";
import { ROUTES } from "../../utils/constants";
import { money, percent } from "../../utils/format";

const AI_TAGS = new Set(["Semantically similar", "Highly rated by shoppers", "Matches your past choices", "Often accepted for this product"]);

const RecommendationCard = ({ recommendation, rank, decision, onAddToCart, onBuyNow, onReject, onSubmitFeedback }) => {
  const [showWhy, setShowWhy] = useState(false);
  const [showRate, setShowRate] = useState(false);
  const { product, similarityScore, preferenceScore, finalScore, explanationTags, explanation } = recommendation;
  const added = decision === "accepted";

  if (decision === "rejected") {
    return (
      <div className="reco-card reco-card-muted">
        <span>Hidden: <strong>{product.name}</strong></span>
        <span className="muted">You said this isn't for you.</span>
      </div>
    );
  }

  return (
    <article className={`reco-card ${rank === 1 ? "reco-best" : ""}`}>
      {rank === 1 && <span className="reco-ribbon">Best match</span>}
      <div className="reco-main">
        <ProductImage product={product} size="lg" />
        <div className="reco-info">
          <p className="pc-brand">#{rank} · {product.brand}</p>
          <h3>{product.name}</h3>
          <p className="muted">{product.category}{product.stock <= 5 ? ` · only ${product.stock} left` : ` · ${product.stock} in stock`}</p>

          <div className="match">
            <div className="match-bar" aria-label={`Match ${percent(finalScore)}`}><div style={{ width: percent(finalScore) }} /></div>
            <strong>{percent(finalScore)} match</strong>
            <span className="muted">similarity {percent(similarityScore)} · preference {percent(preferenceScore)}</span>
          </div>

          <div className="tag-row">
            {explanationTags.map((tag) => <ExplanationTag key={tag} label={tag} variant={AI_TAGS.has(tag) ? "ai" : "success"} />)}
          </div>
          <button className="link-button" onClick={() => setShowWhy((v) => !v)}>{showWhy ? "Hide explanation" : "Why this recommendation?"}</button>
          {showWhy && <div className="explanation-box">{explanation && <p>{explanation}</p>}<ul>{explanationTags.map((t) => <li key={t}>{t}</li>)}</ul></div>}
        </div>

        <div className="reco-buy">
          <span className="price price-lg">{money(product.price)}</span>
          {added ? (
            <>
              <span className="in-stock">✓ In your cart</span>
              <Link to={ROUTES.CHECKOUT} className="btn btn-primary btn-block">Checkout</Link>
              <Link to={ROUTES.CART} className="btn btn-outline btn-block">View cart</Link>
            </>
          ) : (
            <>
              <button className="btn btn-primary btn-block" onClick={onAddToCart}>Add to cart</button>
              <button className="btn btn-accent btn-block" onClick={onBuyNow}>Buy now</button>
              <button className="link-button" onClick={onReject}>Not for me</button>
            </>
          )}
        </div>
      </div>

      {added && (
        <div className="reco-rate">
          {showRate ? <FeedbackForm onSubmit={onSubmitFeedback} /> : <button className="link-button" onClick={() => setShowRate(true)}>Rate this suggestion (optional)</button>}
        </div>
      )}
    </article>
  );
};
export default RecommendationCard;
