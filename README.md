# Constraint-Aware Substitute Recommender (MCA-SP-033)

When a product is out of stock, this system recommends substitutes that
**satisfy hard constraints** (rule-based), are **ranked** by similarity and
preference, and come with **explanations**. An optional AI layer improves the
ranking without ever touching the constraints.

```
React (Vite) client  ->  Express API  ->  MongoDB
                          └─ src/recommendation/   pure engine (no Express / Mongoose / network)
                               candidateGenerator -> constraintEngine -> rankingEngine -> explanationEngine
                               ai/  (embedding similarity scorer, learned preference scorer)
```

## Quick start

Requirements: Node 18.11+ and MongoDB (local, Docker, or Atlas).

```bash
docker compose up -d                 # optional local MongoDB

cd server
npm install
cp .env.example .env                 # then set JWT_SECRET (>= 32 chars):
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm run seed                         # ~290 synthetic products + stock
npm run seed:labels                  # curated substitute relationships
npm run create-admin                 # prompts for an admin account
npm run dev                          # http://localhost:5000

cd ../client
npm install
cp .env.example .env
npm run dev                          # http://localhost:5173
```

Log in as the admin to see the **Admin** link (dashboard, products & inventory,
orders, substitute relationships, feedback). Open any out-of-stock product and click
**Find substitutes**, then add a recommended substitute to your cart and check out.

## What the site does

**Customers**
- Browse and search products (filters live in the URL), see stock and badges.
- **Out of stock?** Get ranked substitutes that satisfy your rules, each with match %, explanation tags and a readable explanation. **Add to cart** or **Buy now** straight from the recommendation. "Not for me" hides it and teaches the system.
- **Cart** refreshes price and stock. If an item becomes unavailable while it sits in your cart, you can **swap it for a substitute inline** (checkout is blocked until it is resolved).
- **Checkout** with a delivery address and payment choice (cash on delivery, or a simulated card: no card data is collected and nothing is charged). Orders are placed atomically.
- **My orders**: history, status timeline (placed -> shipped -> delivered), cancel while still "placed" (stock returns), and rate any smart swap.
- A public **live demo** on the home page runs the real engine without an account.

**Admins**: dashboard (orders, revenue, sales via substitutes, acceptance rate, why candidates were rejected, engine versions), products and inventory, **order management** (ship / deliver / cancel & restock), substitute relationships, feedback.

**Checkout guarantees** (covered by tests): prices come from the database, never the client; stock is taken with a guarded atomic decrement per line and fully rolled back if any line fails; two buyers racing for the last unit give exactly one order; a double-submitted checkout creates one order (idempotency key); cancelling restocks exactly once even under parallel requests; a "smart swap" is recorded on an order only if the server really offered that substitute to that user.

## Scripts (server)

| Script | Purpose |
|---|---|
| `npm test` | 97 offline checks (engine, explanations, AI scorers, validators, order rules, HTTP layer). No DB needed. |
| `npm run test:e2e` | 48 end-to-end checks against a real MongoDB (uses `.env`; creates and removes its own users). Run after seeding. |
| `npm run test:e2e:ai` | 12 AI checks against a real MongoDB. |
| `npm run test:e2e:orders` | 46 checks: checkout, stock rollback, last-unit race, idempotency, cancel/restock, admin order flow, substitution verification, public demo. |
| `npm run seed` / `seed:reset` | Synthetic catalog (`--reset` wipes catalog data). |
| `npm run seed:labels` / `seed:labels:reset` | Generate system labels (never overwrites admin edits). |
| `npm run embed:products` | Build product embeddings for the AI layer. |
| `npm run debug:recommend -- --budget 4 --diet vegan` | Inspect the rule-based engine from the CLI. |
| `npm run db:indexes` | Sync indexes (use in production, where autoIndex is off). |

## The recommendation flow (`POST /api/recommendations`)

1. **Candidates**: active curated labels first, then same-category products.
2. **Hard constraints (rule-based only)**: stock (and requested quantity), category, budget, dietary, organic, attributes. Each rejected candidate is counted against its first failing rule (`recommendations.stats`). Malformed constraints fail closed (422), never silently ignored.
3. **Ranking**: `similarity_score` (curated label or computed from name/diet/attributes/price) and `preference_score` (brand, price, organic, stock), blended 70/30. Deterministic tie-breaks.
4. **Top-N** (default 5, max 50).
5. **Explanations**: `explanationTags` are re-verified against the real rules, so a tag can never claim something that is false. A readable `explanation` sentence is included.
6. The run is stored, so accept/reject decisions, analytics and learning work.

Dietary semantics (`src/recommendation/dietary.js`): only `vegan` implies other tags (vegetarian, lactose-free). A missing tag means "unknown" and counts as *not* satisfying a restriction.

## AI layer (Phase 5)

Off by default (`AI_ENABLED=false`): the system is fully rule-based. When on:

| Feature | How |
|---|---|
| Product similarity (embeddings) | `src/ai/`: product text -> vector -> cosine, blended into similarity (`AI_SIMILARITY_WEIGHT`). Providers: `local` (built-in hashing, **lexical only, not truly semantic**) or `openai` (real semantic embeddings, needs `OPENAI_API_KEY`). Run `npm run embed:products` (or the dashboard button). |
| Personalized ranking + learning from feedback | Per-user brand affinity from accept/reject history, shrunk product ratings from feedback, and per-pair acceptance rates, blended into preference (`AI_LEARNING_WEIGHT`). Low evidence is shrunk toward neutral. |
| Smart explanations (optional) | `AI_EXPLANATIONS=true` + `ANTHROPIC_API_KEY`: an LLM rephrases the engine's verified facts. Any failure falls back to the template sentence. |

Guarantees (covered by tests): AI only re-orders products that already passed the constraints; it never changes *which* products are returned; every AI part degrades independently (a failure logs a warning and the request still succeeds); the engine folder stays free of Express/Mongoose/network access.

## Project layout

```
server/src/
  config/ constants/ utils/ middleware/
  models/ validators/ repositories/ services/ controllers/ routes/
  recommendation/        pure engine (+ explanationEngine, ai/ scorers)
  ai/                    embeddings providers, store, LLM explainer, engine factory
  seed/ scripts/ tests/
client/src/
  pages/ pages/admin/ components/ context/ hooks/ routes/ services/ styles/
```

Main endpoints: `/auth/*`, `/products`, `/preferences`, `/recommendations` (+ `/decisions`), `/feedback`, `/orders` (+ `/:id`, `/:id/cancel`), `/demo/*` (public, rate-limited), `/admin/*` (products, inventory, orders, labels, feedback, analytics, embeddings).

API contract: success `{ "success": true, "data": ... }`, failure `{ "success": false, "message": "...", "errors": [...] }`.

## Known limitations

- Payments are simulated (cash on delivery or a demo card). A real gateway would need to be added; do not collect card numbers without one.
- The cart lives in the browser (localStorage); it is validated against live prices and stock at checkout.
- The token is stored in localStorage (simple, but readable by XSS); an httpOnly cookie is a possible hardening step.
- Login rate limiting is in memory (per process). Set `TRUST_PROXY=1` behind a reverse proxy.
- Name-based similarity assumes product names carry the product type. For messy real-world datasets use the `openai` embeddings provider.
- Product images are generated tiles (emoji on a colour gradient), since the catalog has no photos. Set `imageUrl` on products to extend this.
- Login is rate-limited per process; the general limit is `RATE_LIMIT_MAX` (default 1000 per 15 minutes per IP).

## Test status

Server: 97 unit + 48 end-to-end + 12 AI + 46 order checks. Browser (`client/tests-ui`, Firefox): 48 checks over the customer journey, cart swap, buy now, cancel, admin and mobile. Screenshots are in `docs/screenshots`.
