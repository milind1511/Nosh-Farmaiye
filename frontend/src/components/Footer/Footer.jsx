import "./Footer.css";
import { assets } from "../../assets/frontend_assets/assets";
import BrandWordmark from "../BrandWordmark/BrandWordmark";
import { BRAND_NAME_EN, OWNER_NAME } from "../../config";
import { Link } from "react-router-dom";

const Footer = () => {
  const year = new Date().getFullYear();

  const handleFooterLinkClick = () => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  return (
    <footer
      className="footer"
      id="footer"
      aria-label={`${BRAND_NAME_EN} site footer`}
    >
      <div className="footer-content">
        <div className="footer-content-left">
          <BrandWordmark />
          <p className="footer-tagline">
            {BRAND_NAME_EN} celebrates India&apos;s festive cravings with freshly
            prepared favourites, mindful sourcing, and warm doorstep service.
          </p>
          <div className="footer-social-icons">
            <a
              href="https://www.facebook.com/noshfarmaiye"
              target="_blank"
              rel="noreferrer"
              aria-label="Follow Nosh Farmaiye on Facebook"
            >
              <img src={assets.facebook_icon} alt="Facebook icon" />
            </a>
            <a
              href="https://twitter.com/noshfarmaiye"
              target="_blank"
              rel="noreferrer"
              aria-label="Follow Nosh Farmaiye on X"
            >
              <img src={assets.twitter_icon} alt="X icon" />
            </a>
            <a
              href="https://www.linkedin.com/company/noshfarmaiye"
              target="_blank"
              rel="noreferrer"
              aria-label="Connect with Nosh Farmaiye on LinkedIn"
            >
              <img src={assets.linkedin_icon} alt="LinkedIn icon" />
            </a>
          </div>
        </div>
        <div className="footer-content-center" aria-labelledby="footer-navigation">
          <h2 id="footer-navigation">Explore more</h2>
          <ul>
            <li>
              <Link to="/" onClick={handleFooterLinkClick}>
                Home
              </Link>
            </li>
            <li>
              <Link to="/cart" onClick={handleFooterLinkClick}>
                Cart
              </Link>
            </li>
            <li>
              <Link to="/order" onClick={handleFooterLinkClick}>
                Place an order
              </Link>
            </li>
            <li>
              <Link to="/myorders" onClick={handleFooterLinkClick}>
                Track orders
              </Link>
            </li>
          </ul>
        </div>
        <div className="footer-content-right">
          <h2>Get in touch</h2>
          <ul>
            <li>
              <a href="tel:+919813000000">+91 98130 00000</a>
            </li>
            <li>
              <a href="mailto:hello@noshfarmaiye.com">
                hello@noshfarmaiye.com
              </a>
            </li>
            <li>{OWNER_NAME}</li>
          </ul>
        </div>
      </div>
      <hr />
      <p className="footer-copyright">
        © {year} {BRAND_NAME_EN}. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;
