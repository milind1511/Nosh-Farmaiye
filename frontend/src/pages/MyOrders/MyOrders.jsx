import { useCallback, useContext, useEffect, useState } from "react";
import "./MyOrders.css";
import { StoreContext } from "../../context/StoreContext";
import axios from "axios";
import { assets } from "../../assets/frontend_assets/assets";
import { formatCurrency } from "../../utils/currency";
import { DEFAULT_CURRENCY } from "../../config";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const MyOrders = () => {
  const { url, token, setCartItems } = useContext(StoreContext);
  const [data, setData] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const navigate = useNavigate();
  const fetchOrders = useCallback(async () => {
    if (!token) return;

    try {
      const response = await axios.post(
        `${url}/api/order/userorders`,
        {},
        { headers: { token } }
      );
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      // Silent fail; toast spam avoided on load.
    }
  }, [token, url]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleTrackOrder = useCallback(
    async (orderId) => {
      setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
      await fetchOrders();
    },
    [fetchOrders]
  );

  const handleOrderAgain = useCallback(
    async (order) => {
      if (!token) {
        toast.info("Please sign in to re-order your favourites.");
        return;
      }

      const items = Array.isArray(order?.items) ? order.items : [];
      const normalizedCart = items.reduce((accumulator, item) => {
        const itemId = item?._id;
        const quantity = Number(item?.quantity) || 0;
        if (!itemId || quantity <= 0) {
          return accumulator;
        }
        const key = typeof itemId === "string" ? itemId : String(itemId);
        accumulator[key] = (accumulator[key] || 0) + quantity;
        return accumulator;
      }, {});

      if (!Object.keys(normalizedCart).length) {
        toast.error("We couldn't find any dishes from that order to add to your cart.");
        return;
      }

      try {
        await axios.post(
          `${url}/api/cart/set`,
          { cartData: normalizedCart },
          { headers: { token } }
        );
        setCartItems(normalizedCart);
        toast.success("Cart updated. Ready when you are!");
        navigate("/cart");
      } catch (error) {
        toast.error("We couldn't update your cart. Please try again.");
      }
    },
    [navigate, setCartItems, token, url]
  );

  return (
    <div className="my-orders">
      <h2>Orders</h2>
      <div className="container">
        {data.map((order, index) => {
          const key = order._id || index;
          const items = Array.isArray(order.items) ? order.items : [];
          const itemSummary = items
            .map((item) => `${item.name} × ${item.quantity}`)
            .join(", ");
          const savings = Number(order.discount) || 0;
          const couponCode = order.couponCode;
          const orderedDate = order.date ? new Date(order.date) : null;
          const orderedDateLabel = orderedDate
            ? new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(orderedDate)
            : null;
          const paymentMethod =
            typeof order.paymentMethod === "string"
              ? order.paymentMethod.toLowerCase()
              : "online";
          const isPaid = Boolean(order.payment);
          const paymentLabel =
            paymentMethod === "cod"
              ? isPaid
                ? "Cash collected"
                : "Cash on delivery"
              : isPaid
                ? "Paid online"
                : "Payment pending";
          const orderIdentity = String(key);
          const isExpanded = expandedOrderId === orderIdentity;
          const baseStatusFlow =
            paymentMethod === "cod"
              ? [
                  "Food Processing",
                  "Out for delivery",
                  "Awaiting cash collection",
                  "Delivered",
                ]
              : ["Food Processing", "Out for delivery", "Delivered"];
          const normalizedStatus =
            typeof order.status === "string" ? order.status.trim() : "";
          const normalizedStatusLower = normalizedStatus.toLowerCase();
          const statusFlow = baseStatusFlow.some(
            (step) => step.toLowerCase() === normalizedStatusLower
          )
            ? baseStatusFlow
            : [...baseStatusFlow, normalizedStatus].filter(Boolean);
          const currentStatusIndexRaw = statusFlow.findIndex(
            (step) => step.toLowerCase() === normalizedStatusLower
          );
          const currentStatusIndex =
            currentStatusIndexRaw === -1 ? 0 : currentStatusIndexRaw;
          const address =
            order.address && typeof order.address === "object"
              ? order.address
              : null;
          const instructions =
            typeof order.instructions === "string"
              ? order.instructions.trim()
              : "";
          const addressLines = address
            ? [
                address.street,
                [address.city, address.state, address.country]
                  .filter(Boolean)
                  .join(", "),
                address.zipcode,
              ].filter(Boolean)
            : [];

          return (
            <div key={key} className="my-orders-order">
              <img src={assets.parcel_icon} alt="" />
              <p>{itemSummary}</p>
              <p>{formatCurrency(order.amount, DEFAULT_CURRENCY)}</p>
              <p>Items: {items.length}</p>
              <p>
                <span>&#x25cf;</span>
                <b> {order.status}</b>
              </p>
              <p className="my-orders-order-payment">{paymentLabel}</p>
              {orderedDateLabel && (
                <p className="my-orders-order-placed">
                  Placed{" "}
                  <time dateTime={orderedDate.toISOString()}>
                    {orderedDateLabel}
                  </time>
                </p>
              )}
              {couponCode && savings > 0 && (
                <p className="my-orders-order-savings">
                  Saved {formatCurrency(savings, DEFAULT_CURRENCY)} with {couponCode}
                </p>
              )}
              <div className="my-orders-order-actions">
                <button
                  type="button"
                  onClick={() => handleTrackOrder(orderIdentity)}
                >
                  {isExpanded ? "Hide tracking" : "Track Order"}
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => handleOrderAgain(order)}
                >
                  Order Again
                </button>
              </div>
              {isExpanded && (
                <div className="my-orders-order-tracking">
                  <p className="my-orders-order-tracking-heading">Order tracking</p>
                  <ol className="my-orders-order-tracking-steps">
                    {statusFlow.map((step, idx) => {
                      const isComplete = currentStatusIndex >= idx;
                      return (
                        <li
                          key={step}
                          className={`my-orders-order-tracking-step${
                            isComplete ? " is-complete" : ""
                          }`}
                        >
                          <span>{step}</span>
                        </li>
                      );
                    })}
                  </ol>
                  <div className="my-orders-order-tracking-meta">
                    <div>
                      <span className="label">Order ID</span>
                      <span className="value">{order._id || orderIdentity}</span>
                    </div>
                    {orderedDateLabel && (
                      <div>
                        <span className="label">Placed</span>
                        <span className="value">{orderedDateLabel}</span>
                      </div>
                    )}
                    {addressLines.length > 0 && (
                      <div>
                        <span className="label">Delivering to</span>
                        <span className="value">
                          {addressLines.map((line, lineIndex) => (
                            <span key={lineIndex}>
                              {line}
                              {lineIndex < addressLines.length - 1 && <br />}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                    {address && address.phone && (
                      <div>
                        <span className="label">Contact</span>
                        <span className="value">{address.phone}</span>
                      </div>
                    )}
                    {instructions && (
                      <div className="instructions">
                        <span className="label">Runner notes</span>
                        <span className="value">{instructions}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyOrders;
