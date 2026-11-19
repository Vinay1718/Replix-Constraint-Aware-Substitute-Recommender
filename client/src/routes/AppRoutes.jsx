import { Routes, Route } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import AdminLayout from "../components/layout/AdminLayout";
import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";
import { ROUTES } from "../utils/constants";

import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import ProductListPage from "../pages/ProductListPage";
import ProductDetailsPage from "../pages/ProductDetailsPage";
import CartPage from "../pages/CartPage";
import PreferencesPage from "../pages/PreferencesPage";
import RecommendationPage from "../pages/RecommendationPage";
import CheckoutPage from "../pages/CheckoutPage";
import OrdersPage from "../pages/OrdersPage";
import OrderDetailsPage from "../pages/OrderDetailsPage";
import NotFoundPage from "../pages/NotFoundPage";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import AdminProductsPage from "../pages/admin/AdminProductsPage";
import AdminOrdersPage from "../pages/admin/AdminOrdersPage";
import AdminLabelsPage from "../pages/admin/AdminLabelsPage";
import AdminFeedbackPage from "../pages/admin/AdminFeedbackPage";

const AppRoutes = () => (
  <Routes>
    <Route element={<MainLayout />}>
      <Route path={ROUTES.HOME} element={<HomePage />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
      <Route path={ROUTES.PRODUCTS} element={<ProductListPage />} />
      <Route path={ROUTES.PRODUCT_DETAILS} element={<ProductDetailsPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path={ROUTES.CART} element={<CartPage />} />
        <Route path={ROUTES.CHECKOUT} element={<CheckoutPage />} />
        <Route path={ROUTES.ORDERS} element={<OrdersPage />} />
        <Route path={ROUTES.ORDER_DETAILS} element={<OrderDetailsPage />} />
        <Route path={ROUTES.PREFERENCES} element={<PreferencesPage />} />
        <Route path={ROUTES.RECOMMENDATIONS} element={<RecommendationPage />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path={ROUTES.ADMIN} element={<AdminDashboardPage />} />
          <Route path={ROUTES.ADMIN_PRODUCTS} element={<AdminProductsPage />} />
          <Route path={ROUTES.ADMIN_ORDERS} element={<AdminOrdersPage />} />
          <Route path={ROUTES.ADMIN_LABELS} element={<AdminLabelsPage />} />
          <Route path={ROUTES.ADMIN_FEEDBACK} element={<AdminFeedbackPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
export default AppRoutes;
