import "./BrandWordmark.css";
import { BRAND_NAME_HI } from "../../config";
import PropTypes from "prop-types";

const BrandWordmark = ({ compact = false }) => (
  <div
    className={`brand-wordmark ${compact ? "brand-wordmark--compact" : ""}`}
  >
    <span className="brand-wordmark__primary">{BRAND_NAME_HI}</span>
  </div>
);

BrandWordmark.propTypes = {
  compact: PropTypes.bool,
};

export default BrandWordmark;
