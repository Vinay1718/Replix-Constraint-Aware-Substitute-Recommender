import { NavLink, Outlet } from "react-router-dom";
import { ROUTES } from "../../utils/constants";

const links = [
  { to: ROUTES.ADMIN, label: "Dashboard", end: true },
  { to: ROUTES.ADMIN_PRODUCTS, label: "Products & Inventory" },
  { to: ROUTES.ADMIN_ORDERS, label: "Orders" },
  { to: ROUTES.ADMIN_LABELS, label: "Substitute Relationships" },
  { to: ROUTES.ADMIN_FEEDBACK, label: "Feedback" },
];

const AdminLayout = () => (
  <div className="admin-shell">
    <aside className="admin-side">
      <h3>Admin</h3>
      <nav>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `admin-link ${isActive ? "active" : ""}`}>{l.label}</NavLink>
        ))}
      </nav>
    </aside>
    <section className="admin-main"><Outlet /></section>
  </div>
);
export default AdminLayout;
