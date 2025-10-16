import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import "./PlaceOrder.css";
import { StoreContext } from "../../context/StoreContext";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "../../utils/currency";

const PlaceOrder = () => {
  const navigate = useNavigate();

  const {
    getTotalCartAmount,
    token,
    food_list,
    cartItems,
    url,
    currency,
    deliveryFee,
    clearCart,
  } = useContext(StoreContext);
  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zipcode: "",
    country: "",
    phone: "",
    instructions: "",
  });
  const [couponCode, setCouponCode] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponStatus, setCouponStatus] = useState({ type: "idle", message: "" });
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("online");

  const computeDiscount = useCallback((coupon, amount) => {
    if (!coupon || typeof amount !== "number" || amount <= 0) return 0;

    const discountValue = Number(coupon.discountValue) || 0;
    let discount =
      coupon.discountType === "flat"
        ? discountValue
        : (amount * discountValue) / 100;

    if (
      coupon.maxDiscountValue !== null &&
      coupon.maxDiscountValue !== undefined
    ) {
      discount = Math.min(discount, Number(coupon.maxDiscountValue) || 0);
    }

    discount = Math.min(discount, amount);
    return Math.round(Math.max(discount, 0) * 100) / 100;
  }, []);

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

  const subtotal = getTotalCartAmount();
  const appliedDeliveryFee = subtotal === 0 ? 0 : deliveryFee;
  const discountToApply = appliedCoupon
    ? Math.min(couponDiscount, subtotal)
    : 0;
  const total = Math.max(subtotal + appliedDeliveryFee - discountToApply, 0);
  const paymentNote =
    paymentMethod === "cod"
      ? "Settle the bill with cash when our runner drops off your thaali. Have the exact amount ready if possible."
      : "We'll redirect you to a secure Stripe checkout window. Your address is used only for this delivery.";
  const submitLabel =
    paymentMethod === "cod" ? "Place order with cash" : "Proceed to payment";

  const onChangeHandler = (event) => {
    const { name, value } = event.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const fetchActiveCoupons = useCallback(async () => {
    try {
      const response = await axios.get(`${url}/api/coupon/active`);
      if (response.data.success && Array.isArray(response.data.data)) {
        setAvailableCoupons(response.data.data);
      } else {
        setAvailableCoupons([]);
      }
    } catch (error) {
      setAvailableCoupons([]);
    }
  }, [url]);

  useEffect(() => {
    fetchActiveCoupons();
  }, [fetchActiveCoupons]);

  const handleRemoveCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponStatus({ type: "info", message: "Removed coupon" });
  }, []);

  const handleApplyCoupon = useCallback(
    async (incomingCode) => {
      if (!token) {
        toast.error("Please login first");
        navigate("/cart");
        return;
      }

      const codeToApply = (incomingCode ?? couponCode).trim().toUpperCase();
      if (!codeToApply) {
        setCouponStatus({ type: "error", message: "Enter a coupon code" });
        return;
      }

      setCouponApplying(true);
      setCouponStatus({ type: "info", message: "Checking eligibility..." });

      try {
        const response = await axios.post(
          `${url}/api/coupon/validate`,
          {
            code: codeToApply,
            subtotal,
          },
          { headers: { token } }
        );

        if (response.data.success) {
          const { coupon, discountAmount } = response.data.data;
          setAppliedCoupon(coupon);
          setCouponDiscount(discountAmount);
          setCouponCode(codeToApply);
          const saved = formatCurrency(discountAmount, currency);
          setCouponStatus({
            type: "success",
            message: `Saved ${saved} with ${codeToApply}`,
          });
          toast.success(`Coupon ${codeToApply} applied`);
        } else {
          setAppliedCoupon(null);
          setCouponDiscount(0);
          setCouponStatus({
            type: "error",
            message: response.data.message || "Coupon not valid",
          });
          toast.error(response.data.message || "Coupon not valid");
        }
      } catch (error) {
        setCouponStatus({
          type: "error",
          message: "We couldn't verify that coupon right now.",
        });
        toast.error("We couldn't verify that coupon right now.");
      } finally {
        setCouponApplying(false);
      }
    },
    [couponCode, currency, navigate, subtotal, token, url]
  );

  useEffect(() => {
    if (!appliedCoupon) return;

    if (subtotal <= 0) {
      handleRemoveCoupon();
      return;
    }

    if (
      appliedCoupon.minOrderAmount &&
      subtotal < Number(appliedCoupon.minOrderAmount)
    ) {
      handleRemoveCoupon();
      setCouponStatus({
        type: "error",
        message: `Requires a minimum order of ${formatCurrency(
          Number(appliedCoupon.minOrderAmount),
          currency
        )}. Coupon removed.`,
      });
      return;
    }

    const recalculated = computeDiscount(appliedCoupon, subtotal);
    setCouponDiscount((prev) =>
      Math.abs(prev - recalculated) > 0.009 ? recalculated : prev
    );
  }, [appliedCoupon, subtotal, computeDiscount, currency, handleRemoveCoupon]);

  const placeOrder = async (event) => {
    event.preventDefault();
    const orderItems = cartItemsDetailed.map(
      ({ _id, name, image, price, description, category, quantity }) => ({
        _id,
        name,
        image,
        price,
        description,
        category,
        quantity,
      })
    );

    const { instructions, ...address } = data;
    const trimmedInstructions = instructions.trim();

    const orderData = {
      address,
      items: orderItems,
    };

    if (trimmedInstructions) {
      orderData.instructions = trimmedInstructions;
    }

    if (appliedCoupon) {
      orderData.couponCode = appliedCoupon.code;
    }

    orderData.paymentMethod = paymentMethod;

    try {
      const response = await axios.post(`${url}/api/order/place`, orderData, {
        headers: { token },
      });
      if (response.data.success) {
        const method = String(
          response.data.paymentMethod || paymentMethod || "online"
        ).toLowerCase();

        if (method === "cod") {
          clearCart();
          toast.success("Order placed! Pay in cash when it arrives.");
          navigate("/myorders");
          return;
        }

        if (response.data.session_url) {
          window.location.replace(response.data.session_url);
          return;
        }

        const fallbackMessage =
          response.data.message ||
          "We couldn't start checkout. Please try again.";
        if (
          typeof fallbackMessage === "string" &&
          fallbackMessage.toLowerCase().includes("online payments")
        ) {
          setPaymentMethod("cod");
        }
        toast.error(fallbackMessage);
      } else {
        const failureMessage =
          response.data.message ||
          "We couldn't start checkout. Please try again.";
        if (
          typeof failureMessage === "string" &&
          failureMessage.toLowerCase().includes("online payments")
        ) {
          setPaymentMethod("cod");
        }
        toast.error(failureMessage);
      }
    } catch (error) {
      toast.error("Checkout failed—please verify your details.");
    }
  };

  useEffect(() => {
    if (!token) {
      toast.error("Please login first");
      navigate("/cart");
      return;
    }
    if (getTotalCartAmount() === 0) {
      toast.error("Please add dishes to your thaali before checkout");
      navigate("/cart");
    }
  }, [token, getTotalCartAmount, navigate]);

  return (
    <form className="place-order app-section" onSubmit={placeOrder}>
      <header className="place-order__header">
        <div className="place-order__intro">
          <span className="place-order__badge">
            आख़िरी चरण • Final Step
          </span>
          <h1>Seal your delivery details</h1>
        </div>
        <p className="place-order__lede">
          Share where the feast is headed, choose how you&apos;d like to pay, and
          we&apos;ll sync your kitchen slot.
        </p>
      </header>

      <div className="place-order__layout">
        <section className="place-order__details" aria-labelledby="delivery-info-heading">
          <div className="place-order__details-head">
            <h2 id="delivery-info-heading">Delivery information</h2>
            <p>Fill in the address exactly as it appears on your doorplate.</p>
          </div>
          <div className="place-order__grid">
            <label className="place-order__field">
              <span>First name</span>
              <input
                required
                name="firstName"
                value={data.firstName}
                onChange={onChangeHandler}
                type="text"
                autoComplete="given-name"
              />
            </label>
            <label className="place-order__field">
              <span>Last name</span>
              <input
                required
                name="lastName"
                value={data.lastName}
                onChange={onChangeHandler}
                type="text"
                autoComplete="family-name"
              />
            </label>
            <label className="place-order__field place-order__field--wide">
              <span>Email</span>
              <input
                required
                name="email"
                value={data.email}
                onChange={onChangeHandler}
                type="email"
                autoComplete="email"
              />
            </label>
            <label className="place-order__field place-order__field--wide">
              <span>Street address</span>
              <input
                required
                name="street"
                value={data.street}
                onChange={onChangeHandler}
                type="text"
                autoComplete="street-address"
              />
            </label>
            <label className="place-order__field">
              <span>City</span>
              <input
                required
                name="city"
                value={data.city}
                onChange={onChangeHandler}
                type="text"
                autoComplete="address-level2"
              />
            </label>
            <label className="place-order__field">
              <span>State</span>
              <input
                required
                name="state"
                value={data.state}
                onChange={onChangeHandler}
                type="text"
                autoComplete="address-level1"
              />
            </label>
            <label className="place-order__field">
              <span>Postal code</span>
              <input
                required
                name="zipcode"
                value={data.zipcode}
                onChange={onChangeHandler}
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
              />
            </label>
            <label className="place-order__field">
              <span>Country</span>
              <input
                required
                name="country"
                value={data.country}
                onChange={onChangeHandler}
                type="text"
                autoComplete="country-name"
              />
            </label>
            <label className="place-order__field place-order__field--wide">
              <span>Phone number</span>
              <input
                required
                name="phone"
                value={data.phone}
                onChange={onChangeHandler}
                type="tel"
                autoComplete="tel"
                placeholder="Include country code"
              />
            </label>
            <label className="place-order__field place-order__field--wide">
              <span>Instructions for our runner</span>
              <textarea
                name="instructions"
                value={data.instructions}
                onChange={onChangeHandler}
                placeholder="Landmark, gate code, or celebration notes (optional)"
                rows={3}
              />
            </label>
          </div>
        </section>

        <aside className="place-order__summary">
          <div className="place-order__card">
            <h2>Your thaali</h2>
            <div className="place-order__coupon">
              <div className="place-order__coupon-head">
                <h3>Festive coupons</h3>
                {appliedCoupon && (
                  <span className="place-order__coupon-chip">
                    Applied: {appliedCoupon.code}
                  </span>
                )}
              </div>
              <div className="place-order__coupon-row">
                <input
                  type="text"
                  inputMode="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(event) =>
                    setCouponCode(event.target.value.toUpperCase())
                  }
                  autoComplete="off"
                />
                {appliedCoupon ? (
                  <button
                    type="button"
                    className="place-order__coupon-action place-order__coupon-action--secondary"
                    onClick={handleRemoveCoupon}
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    className="place-order__coupon-action"
                    onClick={() => handleApplyCoupon()}
                    disabled={couponApplying || !couponCode.trim()}
                  >
                    {couponApplying ? "Checking…" : "Apply"}
                  </button>
                )}
              </div>
              {couponStatus.message && (
                <p
                  className={`place-order__coupon-feedback place-order__coupon-feedback--${couponStatus.type}`}
                >
                  {couponStatus.message}
                </p>
              )}
              {availableCoupons.length > 0 && (
                <div className="place-order__coupon-suggestions">
                  <span>Suggestions:</span>
                  <div className="place-order__coupon-tags">
                    {availableCoupons.map((coupon) => (
                      <button
                        key={coupon.code}
                        type="button"
                        disabled={couponApplying}
                        onClick={() => {
                          setCouponCode(coupon.code);
                          handleApplyCoupon(coupon.code);
                        }}
                      >
                        <strong>{coupon.code}</strong>
                        <small>{coupon.label || "Limited offer"}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <ul className="place-order__items">
              {cartItemsDetailed.map((item) => (
                <li key={item._id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span className="place-order__item-meta">
                      {item.quantity} × {formatCurrency(item.price, currency)}
                    </span>
                  </div>
                  <span className="place-order__item-total">
                    {formatCurrency(item.subtotal, currency)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="place-order__totals">
              <div>
                <span>Subtotal</span>
                <strong>{formatCurrency(subtotal, currency)}</strong>
              </div>
              <div>
                <span>Delivery fee</span>
                <strong>{formatCurrency(appliedDeliveryFee, currency)}</strong>
              </div>
              {discountToApply > 0 && (
                <div className="place-order__totals-discount">
                  <span>Coupon savings</span>
                  <strong>
                    -{formatCurrency(discountToApply, currency)}
                  </strong>
                </div>
              )}
              <div className="place-order__totals-grand">
                <span>Total due</span>
                <strong>{formatCurrency(total, currency)}</strong>
              </div>
            </div>
            {appliedCoupon && (
              <p className="place-order__coupon-note">
                Applying <strong>{appliedCoupon.code}</strong> on this order.
              </p>
            )}
            <div className="place-order__payment">
              <h3>Payment method</h3>
              <div className="place-order__payment-options" role="radiogroup">
                <label
                  className={`place-order__payment-option ${
                    paymentMethod === "online"
                      ? "place-order__payment-option--active"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="online"
                    checked={paymentMethod === "online"}
                    onChange={() => setPaymentMethod("online")}
                  />
                  <div>
                    <strong>Pay now</strong>
                    <span>Card, UPI, and wallets via Stripe</span>
                  </div>
                </label>
                <label
                  className={`place-order__payment-option ${
                    paymentMethod === "cod"
                      ? "place-order__payment-option--active"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                  />
                  <div>
                    <strong>Cash on delivery</strong>
                    <span>Hand cash to our runner at your doorstep</span>
                  </div>
                </label>
              </div>
            </div>
            <p className="place-order__note">{paymentNote}</p>
            <button
              type="submit"
              className="place-order__submit"
              disabled={total <= 0}
            >
              {submitLabel}
            </button>
          </div>

          <div className="place-order__card place-order__card--secondary">
            <h3>Need help?</h3>
            <p>
              Call our kitchen line at <a href="tel:+919876543210">+91 98765 43210</a> or
              WhatsApp us for last-minute tweaks.
            </p>
            <p>Delivery window reminders are shared 20 minutes prior to dispatch.</p>
          </div>
        </aside>
      </div>
    </form>
  );
};

export default PlaceOrder;
