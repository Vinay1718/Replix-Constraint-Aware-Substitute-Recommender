import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "../utils/constants";

// UI guard only: the API enforces admin access itself (403) on every /admin request.
const AdminRoute = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />;
  if (!isAdmin) return <Navigate to={ROUTES.HOME} replace />;
  return <Outlet />;
};
export default AdminRoute;
