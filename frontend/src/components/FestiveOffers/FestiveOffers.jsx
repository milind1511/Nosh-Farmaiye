import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./FestiveOffers.css";
import { StoreContext } from "../../context/StoreContext";
import { formatCurrency } from "../../utils/currency";

const FALLBACK_OFFERS = [
  {
    code: "FAMILY25",
    label: "Family Feast",
    description: "Gather four plates or more and enjoy 25% off on the entire thaali.",
    discountType: "percentage",
    discountValue: 25,
    minOrderAmount: 1499,
    maxDiscountValue: 700,
    remainingRedemptions: null,
  },
  {
    code: "MEETHI10",
    label: "Dessert Delight",
    description: "Add a dessert platter to unlock a sweet 10% trimming on the bill.",
    discountType: "percentage",
    discountValue: 10,
    minOrderAmount: 899,
    maxDiscountValue: 250,
    remainingRedemptions: null,
  },
  {
    code: "SHAADI200",
    label: "Shaadi Special",
    description: "For celebrations big or small, take ₹200 off on chef-curated combos.",
    discountType: "flat",
    discountValue: 200,
    minOrderAmount: 1299,
    maxDiscountValue: null,
    remainingRedemptions: null,
  },
];

const buildDiscountHeadline = (offer, currency) => {
  if (offer.discountType === "percentage") {
    const cappedAmount =
      offer.maxDiscountValue !== null && offer.maxDiscountValue !== undefined
        ? ` up to ${formatCurrency(offer.maxDiscountValue, currency)}`
        : "";
    return `${offer.discountValue}% off${cappedAmount}`;
  }

  return `${formatCurrency(offer.discountValue, currency)} off`;
};

const FestiveOffers = () => {
  const { url, currency } = useContext(StoreContext);
  const [offers, setOffers] = useState(FALLBACK_OFFERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchOffers = async () => {
      if (!url) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${url}/api/coupon/active`);
        if (!isMounted) return;

        const payload = response?.data?.data;
        if (response?.data?.success && Array.isArray(payload) && payload.length) {
          setOffers(payload);
          setError(null);
        } else {
          setOffers(FALLBACK_OFFERS);
          const message = response?.data?.message;
          setError(
            message
              ? `${message} Showing our house festive picks while we refresh.`
              : null
          );
        }
      } catch (err) {
        if (!isMounted) return;
        setOffers(FALLBACK_OFFERS);
  setError("We couldn’t refresh festive offers. Showing our house picks.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOffers();

    return () => {
      isMounted = false;
    };
  }, [url]);

  const computedCurrency = useMemo(() => currency || "INR", [currency]);

  return (
    <section
      className="festive-offers app-section"
      id="festive-coupons"
      aria-labelledby="festive-offers-heading"
      aria-busy={loading}
    >
      <header className="festive-offers__header">
        <span className="festive-offers__badge">Celebration perks</span>
        <h2 id="festive-offers-heading">Festive coupons to sweeten your thaali</h2>
        <p>
          Unlock limited-time savings for weddings, housewarmings, and cozy dessert nights. Apply a code at checkout or let us auto-apply eligible offers to your cart.
        </p>
      </header>

      {error ? (
        <p className="festive-offers__status" role="status">
          {error}
        </p>
      ) : null}

      <div className="festive-offers__grid">
        {offers.map((offer) => (
          <article key={offer.code} className="festive-offers__card">
            <span className="festive-offers__code">{offer.code}</span>
            <h3>{offer.label}</h3>
            <p>{offer.description || "Seasonal indulgence crafted for our regulars."}</p>
            <dl className="festive-offers__meta">
              <div>
                <dt>Benefit</dt>
                <dd>{buildDiscountHeadline(offer, computedCurrency)}</dd>
              </div>
              {offer.minOrderAmount ? (
                <div>
                  <dt>Min order</dt>
                  <dd>{formatCurrency(offer.minOrderAmount, computedCurrency)}</dd>
                </div>
              ) : null}
              {offer.endDate ? (
                <div>
                  <dt>Valid till</dt>
                  <dd>{new Date(offer.endDate).toLocaleDateString()}</dd>
                </div>
              ) : null}
            </dl>
          </article>
        ))}
      </div>

      <div className="festive-offers__cta-row">
        <Link to="/order" className="festive-offers__cta">
          Apply at checkout
        </Link>
        <span className="festive-offers__hint">
          We’ll surface these in your cart automatically when you’re eligible.
        </span>
      </div>
    </section>
  );
};

export default FestiveOffers;
