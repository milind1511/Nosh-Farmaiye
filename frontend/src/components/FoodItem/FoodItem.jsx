import PropTypes from "prop-types";
import { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./FoodItem.css";
import { assets } from "../../assets/frontend_assets/assets";
import { StoreContext } from "../../context/StoreContext";
import { formatCurrency } from "../../utils/currency";

const alphaToHex = (alpha) => {
  const clamped = Math.max(0, Math.min(1, alpha));
  return Math.round(clamped * 255)
    .toString(16)
    .padStart(2, "0");
};

const withOpacity = (color, alpha = 0.2) => {
  if (!color) {
    return `rgba(205, 81, 53, ${alpha})`;
  }

  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      const expanded = hex
        .split("")
        .map((char) => char + char)
        .join("");
      return `#${expanded}${alphaToHex(alpha)}`;
    }
    if (hex.length === 6) {
      return `#${hex}${alphaToHex(alpha)}`;
    }
  }

  if (color.startsWith("rgba")) {
    return color.replace(
      /rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/,
      (_, r, g, b) => `rgba(${r.trim()}, ${g.trim()}, ${b.trim()}, ${alpha})`
    );
  }

  if (color.startsWith("rgb")) {
    return color.replace(
      /rgb\(([^,]+),([^,]+),([^,]+)\)/,
      (_, r, g, b) => `rgba(${r.trim()}, ${g.trim()}, ${b.trim()}, ${alpha})`
    );
  }

  return color;
};

const FoodItem = ({ id, name, price, description, image, category }) => {
  const navigate = useNavigate();

  const {
    cartItems,
    addToCart,
    removeFromCart,
    url,
    currency,
    getCategoryAccent,
    getCategoryBadge,
  } = useContext(StoreContext);

  const quantity = cartItems[id] || 0;

  const accent = useMemo(() => {
    if (typeof getCategoryAccent !== "function") {
      return "rgba(205, 81, 53, 0.95)";
    }
    return getCategoryAccent(category, "rgba(205, 81, 53, 0.95)");
  }, [category, getCategoryAccent]);
  const accentSoft = useMemo(() => withOpacity(accent, 0.24), [accent]);
  const badge = useMemo(() => {
    if (typeof getCategoryBadge !== "function") return undefined;
    return getCategoryBadge(category);
  }, [category, getCategoryBadge]);
  const formattedPrice = formatCurrency(price, currency);

  const imageSrc = useMemo(() => {
    if (!image) return null;
    if (typeof image === "string") {
      if (image.startsWith("http") || image.startsWith("data:")) {
        return image;
      }
      if (image.startsWith("/")) {
        return image;
      }
      return `${url}/images/${image}`;
    }
    return image;
  }, [image, url]);

  const handleAdd = () => addToCart(id);
  const handleRemove = () => removeFromCart(id);
  const handleCta = () => {
    if (quantity === 0) {
      handleAdd();
      return;
    }
    navigate("/cart");
  };

  return (
    <article className={`food-item ${quantity ? "food-item--active" : ""}`}>
      <div
        className="food-item__media"
        style={{ borderColor: accentSoft }}
      >
        <img
          src={imageSrc || assets.header_img}
          alt={name}
          className="food-item__image"
        />

        <div className="food-item__overlay" />

        <div className="food-item__controls">
          {quantity === 0 ? (
            <button
              type="button"
              className="food-item__add"
              onClick={handleAdd}
            >
              Add to cart
            </button>
          ) : (
            <div className="food-item__counter">
              <button
                type="button"
                aria-label="Remove one item"
                onClick={handleRemove}
              >
                <img src={assets.remove_icon_red} alt="" />
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                aria-label="Add one more"
                onClick={handleAdd}
              >
                <img src={assets.add_icon_green} alt="" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="food-item__body">
        {badge ? (
          <span
            className="food-item__badge"
            style={{
              color: accent,
              backgroundColor: withOpacity(accent, 0.14),
            }}
          >
            {badge}
          </span>
        ) : null}
        <h3 className="food-item__title">{name}</h3>
        <p className="food-item__description">{description}</p>
        <footer className="food-item__footer">
          <span className="food-item__price" style={{ color: accent }}>
            {formattedPrice}
          </span>
          <button
            type="button"
            className={`food-item__cta ${quantity === 0 ? "food-item__cta--primary" : ""}`}
            style={{ color: quantity === 0 ? accent : undefined }}
            onClick={handleCta}
          >
            {quantity === 0 ? "Add to cart" : "View cart"}
          </button>
        </footer>
      </div>
    </article>
  );
};

FoodItem.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  description: PropTypes.string,
  image: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  category: PropTypes.string,
};

FoodItem.defaultProps = {
  description: "",
  image: "",
  category: "",
};

export default FoodItem;
