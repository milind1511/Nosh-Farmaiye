import "./BrandWordmark.css";
import { BRAND_NAME_HI } from "../../config";
import PropTypes from "prop-types";

const BrandWordmark = ({ compact = false }) => (
  <div
    className={`admin-brand-wordmark ${
      compact ? "admin-brand-wordmark--compact" : ""
    }`}
  >
    <span className="admin-brand-wordmark__primary">{BRAND_NAME_HI}</span>
  </div>
);

BrandWordmark.propTypes = {
  compact: PropTypes.bool,
};

export default BrandWordmark;
