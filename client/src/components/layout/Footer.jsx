import { Link } from "react-router-dom";
import { APP_NAME, ROUTES } from "../../utils/constants";

const Footer = () => (
  <footer className="footer">
    <div className="container footer-grid">
      <div>
        <strong className="footer-brand">{APP_NAME}</strong>
        <p>Constraint-aware substitute recommendations that explain themselves.</p>
      </div>
      <div><h4>Shop</h4><Link to={ROUTES.PRODUCTS}>All products</Link><Link to={ROUTES.CART}>Cart</Link><Link to={ROUTES.ORDERS}>My orders</Link></div>
      <div><h4>Account</h4><Link to={ROUTES.LOGIN}>Login</Link><Link to={ROUTES.REGISTER}>Register</Link><Link to={ROUTES.PREFERENCES}>Preferences</Link></div>
      <div><h4>Project</h4><span>MCA-SP-033</span><span>React · Express · MongoDB</span></div>
    </div>
    <div className="container footer-bottom">© {new Date().getFullYear()} {APP_NAME}. Demo store: payments are simulated.</div>
  </footer>
);
export default Footer;
