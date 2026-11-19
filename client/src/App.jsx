import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AppProviders from "./context/AppProviders";
import AppRoutes from "./routes/AppRoutes";
import ScrollToTop from "./components/layout/ScrollToTop";

function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <ScrollToTop />
        <AppRoutes />
        <Toaster position="top-right" />
      </AppProviders>
    </BrowserRouter>
  );
}
export default App;
