import { useContext, useMemo } from "react";
import Navbar from "./components/Navbar/Navbar";
import Sidebar from "./components/Sidebar/Sidebar";
import { Navigate, Route, Routes } from "react-router-dom";
import Add from "./pages/Add/Add";
import List from "./pages/List/List";
import Orders from "./pages/Orders/Orders";
import Coupons from "./pages/Coupons/Coupons";
import Analytics from "./pages/Analytics/Analytics";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Login from "./components/Login/Login";
import { API_BASE_URL } from "./config";
import { StoreContext } from "./context/StoreContext";

const App = () => {
  const { admin, token } = useContext(StoreContext);
  const isAuthenticated = useMemo(() => Boolean(admin && token), [admin, token]);

  return (
    <div className="admin-root">
      <ToastContainer />
      <div className="admin-shell">
        {isAuthenticated ? <Navbar /> : null}
        <div className="admin-body">
          {isAuthenticated ? <Sidebar /> : null}
          <main className="admin-content">
            <Routes>
              <Route
                path="/"
                element={
                  isAuthenticated ? (
                    <Navigate to="/add" replace />
                  ) : (
                    <Login url={API_BASE_URL} />
                  )
                }
              />
              <Route
                path="/add"
                element={
                  isAuthenticated ? (
                    <Add url={API_BASE_URL} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="/list"
                element={
                  isAuthenticated ? (
                    <List url={API_BASE_URL} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="/orders"
                element={
                  isAuthenticated ? (
                    <Orders url={API_BASE_URL} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="/coupons"
                element={
                  isAuthenticated ? (
                    <Coupons url={API_BASE_URL} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="/analytics"
                element={
                  isAuthenticated ? (
                    <Analytics url={API_BASE_URL} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="*"
                element={<Navigate to={isAuthenticated ? "/add" : "/"} replace />}
              />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
