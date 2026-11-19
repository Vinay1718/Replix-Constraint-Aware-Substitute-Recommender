# Browser (UI) tests

Two Selenium + Firefox journeys that drive the real app (real API, real MongoDB):

| File | Covers |
|---|---|
| `journey_customer.py` | Home + live demo, register, preferences, URL filters, out-of-stock -> substitutes -> add to cart, rating, cart, checkout, order confirmation, orders list (30 checks) |
| `journey_swap_and_admin.py` | Item becomes unavailable in cart -> inline swap, Buy now, cancel, guest/non-admin guards, admin dashboard/orders/products/relationships, mobile layout (18 checks) |

Setup: `pip install selenium`, install Firefox and geckodriver (`geckodriver` on PATH, or set `GECKODRIVER` / `FIREFOX_BIN`).

1. Start MongoDB, run `npm run seed && npm run seed:labels` and `npm run dev` in `server/` (port 5055 here: set `PORT=5055` in `server/.env`, or set `UI_API`), and `npm run dev` in `client/`.
2. Create the admin the second journey logs in with, using any number as the stamp:
   `adm<STAMP>@example.com` / `longenough1` with role admin (see `server/src/scripts/createAdmin.js`).
3. `UI_STAMP=<STAMP> python journey_customer.py` then `UI_STAMP=<STAMP> python journey_swap_and_admin.py`.

Environment: `UI_BASE` (default http://localhost:5173), `UI_API` (default http://localhost:5055/api), `UI_SHOTS` (screenshot folder).
