import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

const MainLayout = () => (
  <div className="app-shell">
    <Navbar />
    <main className="app-main"><div className="container"><Outlet /></div></main>
    <Footer />
  </div>
);
export default MainLayout;
