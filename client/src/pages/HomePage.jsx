import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { DemoWidget, ProductCard, ProductImage, SkeletonGrid } from "../components/common";
import { useAsync } from "../hooks/useAsync";
import { useCart } from "../hooks/useCart";
import { demoService, productService } from "../services";
import { ROUTES } from "../utils/constants";
import { categoryEmoji } from "../utils/format";

const STEPS = [
  { icon: "📦", title: "Item runs out", text: "A product you want is out of stock." },
  { icon: "🔒", title: "Your rules are applied", text: "Budget, category, dietary needs and stock are hard filters. Nothing that breaks them is ever shown." },
  { icon: "📊", title: "Survivors are ranked", text: "Similarity to the original and your preferences decide the order." },
  { icon: "💬", title: "You see why", text: "Every suggestion explains itself, then goes straight to your cart." },
];

const WHY = [
  { icon: "🛡️", title: "Constraint-aware", text: "Hard rules are enforced by plain, testable code, never by a model's guess." },
  { icon: "🔍", title: "Explainable", text: "Each tag is verified against the real rules, so an explanation can't claim something false." },
  { icon: "🧠", title: "Hybrid AI", text: "Optional embeddings and learning from feedback re-order results without ever changing what is allowed." },
  { icon: "🧑‍🍳", title: "Curated by humans", text: "Admins define substitute relationships and watch acceptance rates in the dashboard." },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [query, setQuery] = useState("");
  const { data: stats } = useAsync(() => demoService.stats(), []);
  const { data: categories } = useAsync(() => productService.getCategories(), []);
  const { data: popular, loading } = useAsync(() => productService.list({ inStockOnly: true }), []);

  const submit = (e) => { e.preventDefault(); navigate(`${ROUTES.PRODUCTS}?search=${encodeURIComponent(query.trim())}`); };
  const add = (product) => { if (addItem(product)) toast.success(`${product.name} added to cart`); };

  const sample = { name: "Oat Milk 1L", category: "Beverages" };
  const sample2 = { name: "Almond Milk 1L", category: "Beverages" };

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Smart substitutions</span>
          <h1>Out of stock? <span className="grad">We'll find the right swap.</span></h1>
          <p>Substitutes that respect your budget and dietary needs, ranked by how well they fit, each with a clear explanation. Add one to your cart in a click.</p>
          <form className="hero-search" onSubmit={submit}>
            <input type="search" placeholder="Search groceries..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search products" />
            <button className="btn btn-primary" type="submit">Search</button>
          </form>
          <div className="hero-actions">
            <Link to={ROUTES.PRODUCTS} className="btn btn-outline">Browse all products</Link>
            <a href="#try-it" className="btn btn-ghost">Try the engine ↓</a>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="float-card fc-out"><ProductImage product={sample2} size="sm" /><div><strong>Almond Milk 1L</strong><span className="out-of-stock">Out of stock</span></div></div>
          <div className="float-arrow">↓ best swap</div>
          <div className="float-card fc-in"><ProductImage product={sample} size="sm" /><div><strong>Oat Milk 1L</strong><span className="in-stock">91% match</span><div className="tag-row tag-row-tight"><span className="tag tag-success">Within budget</span><span className="tag tag-success">Vegan-friendly</span></div></div></div>
        </div>
      </section>

      <section className="stats-strip">
        {[
          [stats?.products ?? "–", "products"],
          [stats?.categories ?? "–", "categories"],
          [stats?.substitutesAccepted ?? "–", "substitutes accepted"],
          [stats?.ordersWithSubstitutes ?? "–", "orders with a swap"],
        ].map(([n, label]) => <div key={label}><strong>{n}</strong><span>{label}</span></div>)}
      </section>

      <section className="section">
        <h2 className="section-title">How it works</h2>
        <div className="steps-grid">
          {STEPS.map((s, i) => (
            <div key={s.title} className="step-card"><span className="step-num">{i + 1}</span><div className="step-icon">{s.icon}</div><h3>{s.title}</h3><p className="muted">{s.text}</p></div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Shop by category</h2>
        <div className="cat-grid">
          {(categories ?? []).map((c) => (
            <Link key={c} to={`${ROUTES.PRODUCTS}?category=${encodeURIComponent(c)}`} className="cat-tile"><span>{categoryEmoji(c)}</span><strong>{c}</strong></Link>
          ))}
        </div>
      </section>

      <section className="section demo-section" id="try-it">
        <div className="section-head">
          <h2 className="section-title">Try the engine live</h2>
          <p className="muted">No account needed. Pick an out-of-stock product, set some rules, and see what survives.</p>
        </div>
        <DemoWidget />
      </section>

      <section className="section">
        <div className="section-head row-between">
          <h2 className="section-title">Popular right now</h2>
          <Link to={ROUTES.PRODUCTS} className="link-button">See all →</Link>
        </div>
        {loading && !popular ? <SkeletonGrid count={4} /> : (
          <div className="product-grid">{(popular ?? []).slice(0, 8).map((p) => <ProductCard key={p._id} product={p} onAddToCart={add} />)}</div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Why it's different</h2>
        <div className="why-grid">
          {WHY.map((w) => <div key={w.title} className="why-card"><div className="step-icon">{w.icon}</div><h3>{w.title}</h3><p className="muted">{w.text}</p></div>)}
        </div>
      </section>

      <section className="cta-band">
        <h2>Never settle for "sold out" again.</h2>
        <p>Set your rules once. We apply them every time something runs out.</p>
        <div className="hero-actions center-actions">
          <Link to={ROUTES.REGISTER} className="btn btn-light">Create an account</Link>
          <Link to={ROUTES.PREFERENCES} className="btn btn-ghost-light">Set preferences</Link>
        </div>
      </section>
    </div>
  );
};
export default HomePage;
