import { AuthProvider } from "./AuthContext";
import { CartProvider } from "./CartContext";
import { PreferencesProvider } from "./PreferencesContext";
import PreferencesSync from "./PreferencesSync";

const AppProviders = ({ children }) => (
  <AuthProvider>
    <PreferencesProvider>
      <PreferencesSync />
      <CartProvider>{children}</CartProvider>
    </PreferencesProvider>
  </AuthProvider>
);
export default AppProviders;
