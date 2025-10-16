import { useContext, useMemo, useState } from "react";
import "./Cart.css";
import { StoreContext } from "../../context/StoreContext";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "../../utils/currency";

const Cart = () => {
  const {
    food_list,
    cartItems,
    addToCart,
    removeFromCart,
    getTotalCartAmount,
    url,
    currency,
    deliveryFee,
  } = useContext(StoreContext);

  const navigate = useNavigate();
  const [promoCode, setPromoCode] = useState("");

  const cartItemsDetailed = useMemo(() => {
    if (!Array.isArray(food_list)) return [];
    return food_list
      .map((item) => {
        const quantity = cartItems[item._id] || 0;
        if (quantity <= 0) return null;
        return {
          ...item,
          quantity,
          subtotal: quantity * item.price,
        };
      })
      .filter(Boolean);
  }, [food_list, cartItems]);

  const cartSubtotal = getTotalCartAmount();
  const cartDeliveryFee = cartSubtotal === 0 ? 0 : deliveryFee;
  const cartTotal = cartSubtotal + cartDeliveryFee;

  const handleApplyPromo = (event) => {
    event.preventDefault();
    if (!promoCode.trim()) return;
    // Future hook for promo redemption flow
  };

  const handleNavigateToMenu = () => {
    navigate("/#explore-menu");
  };

  return (
    <section className="cart app-section" aria-labelledby="cart-heading">
      <header className="cart__header">
        <div className="cart__intro">
          <span className="cart__badge">अपना थाली तैयार करें • Craft Your Thaali</span>
          <h1 id="cart-heading">Your curated cart of cravings</h1>
        </div>
        <p className="cart__lede">
          Review your picks, adjust portions, and weave in celebratory codes before we send the kitchen into action.
        </p>
        <div className="cart__actions">
          <button type="button" className="cart__back" onClick={handleNavigateToMenu}>
            Browse more dishes
          </button>
          <button
            type="button"
            className="cart__checkout--mobile"
            onClick={() => navigate("/order")}
            disabled={cartSubtotal === 0}
          >
            Proceed to checkout
          </button>
        </div>
      </header>

      {cartItemsDetailed.length === 0 ? (
        <div className="cart__empty">
          <p>थाली अभी खाली है।</p>
          <p>
            Your thaali is waiting to be filled—head back to the menu and pick a dish that calls your name.
          </p>
          <button type="button" onClick={handleNavigateToMenu}>
            Explore categories
          </button>
        </div>
      ) : (
        <div className="cart__layout">
          <div className="cart__table" role="table" aria-label="Selected dishes">
            <div className="cart__row cart__row--head" role="row">
              <span role="columnheader">Dish</span>
              <span role="columnheader">Category</span>
              <span role="columnheader">Price</span>
              <span role="columnheader">Quantity</span>
              <span role="columnheader">Line total</span>
              <span role="columnheader" className="cart__column-actions">
                Actions
              </span>
            </div>
            {cartItemsDetailed.map((item) => (
              <div className="cart__row" role="row" key={item._id}>
                <div className="cart__product" role="cell">
                  <img src={`${url}/images/${item.image}`} alt={item.name} />
                  <div>
                    <h2>{item.name}</h2>
                    <p>{item.description}</p>
                  </div>
                </div>
                <span role="cell" className="cart__category">
                  {item.category}
                </span>
                <span role="cell">{formatCurrency(item.price, currency)}</span>
                <span role="cell" className="cart__quantity">
                  <button
                    type="button"
                    aria-label={`Remove one ${item.name}`}
                    onClick={() => removeFromCart(item._id)}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Add one ${item.name}`}
                    onClick={() => addToCart(item._id)}
                  >
                    +
                  </button>
                </span>
                <span role="cell" className="cart__line-total">
                  {formatCurrency(item.subtotal, currency)}
                </span>
                <span role="cell" className="cart__column-actions">
                  <button
                    type="button"
                    className="cart__remove"
                    onClick={() => removeFromCart(item._id)}
                    aria-label={`Remove ${item.name} from cart`}
                  >
                    Remove
                  </button>
                </span>
              </div>
            ))}
          </div>

          <aside className="cart__sidebar">
            <div className="cart__totals">
              <h2>Order summary</h2>
              <div className="cart__totals-grid">
                <span>Subtotal</span>
                <strong>{formatCurrency(cartSubtotal, currency)}</strong>
                <span>Delivery fee</span>
                <strong>{formatCurrency(cartDeliveryFee, currency)}</strong>
                <span className="cart__totals-grand-label">Total due</span>
                <strong className="cart__totals-grand-value">
                  {formatCurrency(cartTotal, currency)}
                </strong>
              </div>
              <button
                type="button"
                className="cart__checkout"
                onClick={() => navigate("/order")}
                disabled={cartSubtotal === 0}
              >
                Proceed to checkout
              </button>
              <p className="cart__checkout-note">
                Delivery partner will call 15 minutes before arrival. Cash on delivery and UPI accepted.
              </p>
            </div>

            <form className="cart__promo" onSubmit={handleApplyPromo}>
              <div>
                <h3>Have a festive code?</h3>
                <p>Apply coupons from our seasonal booklets or type your family passphrase.</p>
              </div>
              <div className="cart__promo-input">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value)}
                  placeholder="Enter promo code"
                  aria-label="Promo code"
                />
                <button type="submit" disabled={!promoCode.trim()}>
                  Apply
                </button>
              </div>
              <p className="cart__promo-hint">We&apos;ll automatically apply eligible coupons at checkout.</p>
            </form>
          </aside>
        </div>
      )}
    </section>
  );
};

export default Cart;
