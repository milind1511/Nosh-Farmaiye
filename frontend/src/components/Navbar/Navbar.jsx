import { useContext, useState } from "react";
import "./Navbar.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { StoreContext } from "../../context/StoreContext";
import { toast } from "react-toastify";
import BrandWordmark from "../BrandWordmark/BrandWordmark";
import { extractCurrencySymbol, formatCurrency } from "../../utils/currency";
import PropTypes from "prop-types";

const navLinks = [
  {
    id: "menu",
    targetId: "explore-menu",
    labelEn: "Menu",
    labelHi: "मेनू",
  },
  {
    id: "festive",
    targetId: "festive-coupons",
    labelEn: "Festive Offers",
    labelHi: "उत्सव ऑफ़र्स",
  },
];

const Navbar = ({ setShowLogin }) => {
  const [menu, setMenu] = useState("menu");
  const { getTotalCartAmount, token, setToken, currency } =
    useContext(StoreContext);
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToSection = (targetId) => {
    if (!targetId || typeof document === "undefined") return;
    const section = document.getElementById(targetId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const notifyHomeToFocus = (link) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("nosh:navigate-home", {
        detail: {
          category: link.category || null,
          targetId: link.targetId || null,
        },
      })
    );
  };

  const handleNavClick = (event, link) => {
    event.preventDefault();
    setMenu(link.id);

    const performScroll = () => {
      if (link.targetId) {
        window.requestAnimationFrame(() => {
          scrollToSection(link.targetId);
          if (typeof window !== "undefined") {
            window.history.replaceState({}, "", `#${link.targetId}`);
          }
        });
      }
    };

    if (location.pathname !== "/") {
      navigate("/", {
        state: {
          scrollTo: link.targetId || null,
          focusCategory: link.category || null,
        },
      });
      return;
    }

    notifyHomeToFocus(link);
    performScroll();
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    toast.success("Logged out successfully");
    navigate("/");
  };

  const subtotal = getTotalCartAmount();
  const cartHasItems = subtotal > 0;

  return (
    <nav className="navbar" role="banner">
        <Link to="/" className="navbar__brand" onClick={() => setMenu("menu")}>
          <BrandWordmark />
          <span className="navbar__tagline">
            घर का स्वाद, सीधे आपके घर तक
          </span>
        </Link>
        <ul className="navbar__menu">
          {navLinks.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.targetId}`}
                onClick={(event) => handleNavClick(event, link)}
                className={menu === link.id ? "active" : ""}
              >
                <span className="navbar__menu-hi">{link.labelHi}</span>
                <span className="navbar__menu-en">{link.labelEn}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="navbar__actions">
          <Link to="/cart" className="navbar__cart" aria-label="View cart">
            <span className="navbar__cart-icon" aria-hidden>
              {extractCurrencySymbol(currency)}
            </span>
            <div className="navbar__cart-info">
              <span className="navbar__cart-label">Your Thaali</span>
              <span className="navbar__cart-total">
                {cartHasItems
                  ? formatCurrency(subtotal, currency)
                  : "Empty"}
              </span>
            </div>
            {cartHasItems && <span className="navbar__cart-dot" />}
          </Link>
          {!token ? (
            <button
              type="button"
              className="navbar__cta"
              onClick={() => setShowLogin(true)}
            >
              Sign in / Join
            </button>
          ) : (
            <div className="navbar__auth">
              <Link to="/myorders" className="navbar__button">
                My Orders
              </Link>
              <Link
                to="/profile"
                className="navbar__button navbar__button--ghost"
              >
                My Profile
              </Link>
              <button
                type="button"
                className="navbar__button navbar__button--ghost navbar__logout"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
    </nav>
  );
};

Navbar.propTypes = {
  setShowLogin: PropTypes.func.isRequired,
};

export default Navbar;
