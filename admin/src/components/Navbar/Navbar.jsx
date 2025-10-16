import { useContext, useMemo } from "react";
import "./Navbar.css";
import { StoreContext } from "../../context/StoreContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { BRAND_NAME_EN } from "../../config";
import BrandWordmark from "../BrandWordmark/BrandWordmark";

const Navbar = () => {
  const navigate = useNavigate();
  const { token, admin, setAdmin, setToken } = useContext(StoreContext);

  const brandTitle = useMemo(() => BRAND_NAME_EN || "Nosh Farmaiye", []);
  const isAuthenticated = useMemo(() => Boolean(token && admin), [token, admin]);
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    setToken("");
    setAdmin(false);
    toast.success("Logout Successfully");
    navigate("/");
  };
  return (
    <header className="admin-navbar" role="banner">
      <div className="admin-navbar__brand" aria-label={`${brandTitle} Admin`}>
        <BrandWordmark compact />
      </div>
      <div className="admin-navbar__center" aria-hidden>
        {isAuthenticated ? "Admin Console" : null}
      </div>
      <div className="admin-navbar__actions">
        {isAuthenticated ? (
          <button
            type="button"
            className="admin-navbar__button"
            onClick={logout}
          >
            Logout
          </button>
        ) : null}
      </div>
    </header>
  );
};

export default Navbar;
