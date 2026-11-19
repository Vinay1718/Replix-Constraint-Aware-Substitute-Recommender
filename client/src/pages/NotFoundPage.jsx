import { Link } from "react-router-dom";
import { ROUTES } from "../utils/constants";
const NotFoundPage = () => (
  <div className="center">
    <h1>404</h1>
    <p className="muted">The page you are looking for does not exist.</p>
    <Link to={ROUTES.HOME} className="btn btn-primary">Back to home</Link>
  </div>
);
export default NotFoundPage;
