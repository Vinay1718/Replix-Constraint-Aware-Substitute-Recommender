import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { FiShoppingCart, FiMenu, FiX, FiRepeat } from "react-icons/fi";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { APP_NAME, ROUTES } from "../../utils/constants";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const closeMenu = () => setIsOpen(false);
  const linkClass = ({ isActive }) => `navbar-link ${isActive ? "active" : ""}`;
  const handleLogout = () => { logout(); closeMenu(); toast.success("Logged out"); navigate(ROUTES.HOME); };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to={ROUTES.HOME} className="navbar-brand" onClick={closeMenu}><span className="brand-mark"><FiRepeat /></span>{APP_NAME}</Link>
        <button className="navbar-toggle" onClick={() => setIsOpen((p) => !p)} aria-label="Toggle menu">{isOpen ? <FiX /> : <FiMenu />}</button>

        <div className={`navbar-menu ${isOpen ? "open" : ""}`}>
          <nav className="navbar-links">
            <NavLink to={ROUTES.HOME} className={linkClass} onClick={closeMenu} end>Home</NavLink>
            <NavLink to={ROUTES.PRODUCTS} className={linkClass} onClick={closeMenu}>Products</NavLink>
            {isAuthenticated && <NavLink to={ROUTES.ORDERS} className={linkClass} onClick={closeMenu}>My orders</NavLink>}
            <NavLink to={ROUTES.PREFERENCES} className={linkClass} onClick={closeMenu}>Preferences</NavLink>
            {isAdmin && <NavLink to={ROUTES.ADMIN} className={linkClass} onClick={closeMenu}>Admin</NavLink>}
          </nav>
          <div className="navbar-actions">
            <Link to={ROUTES.CART} className="cart-link" onClick={closeMenu} aria-label={`Cart, ${totalItems} items`}>
              <FiShoppingCart />{totalItems > 0 && <span className="cart-count">{totalItems}</span>}
            </Link>
            {isAuthenticated ? (
              <>
                <span className="nav-user">Hi, {user.name.split(" ")[0]}</span>
                <button className="btn btn-outline btn-sm" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <Link to={ROUTES.LOGIN} className="btn btn-outline btn-sm" onClick={closeMenu}>Login</Link>
                <Link to={ROUTES.REGISTER} className="btn btn-primary btn-sm" onClick={closeMenu}>Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
export default Navbar;
