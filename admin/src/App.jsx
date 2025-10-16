import Navbar from "./components/Navbar/Navbar";
import Sidebar from "./components/Sidebar/Sidebar";
import { Route, Routes } from "react-router-dom";
import Add from "./pages/Add/Add";
import List from "./pages/List/List";
import Orders from "./pages/Orders/Orders";
import Coupons from "./pages/Coupons/Coupons";
import Analytics from "./pages/Analytics/Analytics";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Login from "./components/Login/Login";
import { API_BASE_URL } from "./config";

const App = () => {
  return (
    <div className="admin-root">
      <ToastContainer />
      <div className="admin-shell">
        <Navbar />
        <div className="admin-body">
          <Sidebar />
          <main className="admin-content">
            <Routes>
              <Route path="/" element={<Login url={API_BASE_URL} />} />
              <Route path="/add" element={<Add url={API_BASE_URL} />} />
              <Route path="/list" element={<List url={API_BASE_URL} />} />
              <Route path="/orders" element={<Orders url={API_BASE_URL} />} />
              <Route path="/coupons" element={<Coupons url={API_BASE_URL} />} />
              <Route path="/analytics" element={<Analytics url={API_BASE_URL} />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
