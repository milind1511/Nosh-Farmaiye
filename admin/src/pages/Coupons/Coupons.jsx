import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { toast } from "react-toastify";
import "./Coupons.css";
import { StoreContext } from "../../context/StoreContext";
import {
  buildCreatePayload,
  buildUpdatePayload,
} from "../../../../shared/utils/couponPayload.js";

const initialFormState = {
  code: "",
  label: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  minOrderAmount: "0",
  maxDiscountValue: "",
  usageLimit: "",
  perUserLimit: "1",
  startDate: "",
  endDate: "",
  active: true,
};

const formatDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const Coupons = ({ url }) => {
  const { token } = useContext(StoreContext);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const currencyCode = import.meta.env.VITE_CURRENCY || "INR";
  const currencyFormatter = useMemo(() => {
    const locale = currencyCode === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
    });
  }, [currencyCode]);

  const authHeaders = useMemo(() => ({ token }), [token]);

  const fetchCoupons = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await axios.get(`${url}/api/coupon`, {
        headers: authHeaders,
      });
      if (response.data.success && Array.isArray(response.data.data)) {
        setCoupons(response.data.data);
      } else {
        setCoupons([]);
        toast.error(response.data.message || "Unable to load coupons");
      }
    } catch (error) {
      setCoupons([]);
      toast.error("Unable to load coupons right now.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, token, url]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const resetForm = useCallback(() => {
    setFormData(initialFormState);
    setEditingId(null);
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEdit = (coupon) => {
    setEditingId(coupon.id);
    setFormData({
      code: coupon.code,
      label: coupon.label,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue?.toString() || "",
      minOrderAmount: coupon.minOrderAmount?.toString() || "0",
      maxDiscountValue:
        coupon.maxDiscountValue === null || coupon.maxDiscountValue === undefined
          ? ""
          : coupon.maxDiscountValue.toString(),
      usageLimit:
        coupon.usageLimit === null || coupon.usageLimit === undefined
          ? ""
          : coupon.usageLimit.toString(),
      perUserLimit: coupon.perUserLimit?.toString() || "1",
      startDate: formatDateInput(coupon.startDate),
      endDate: formatDateInput(coupon.endDate),
      active: Boolean(coupon.active),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (couponId, code) => {
    if (!token) return;
    const confirmDelete = window.confirm(
      `Delete coupon ${code.toUpperCase()}? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      const response = await axios.delete(`${url}/api/coupon/${couponId}`, {
        headers: authHeaders,
      });
      if (response.data.success) {
        toast.success("Coupon removed");
        fetchCoupons();
      } else {
        toast.error(response.data.message || "Unable to remove coupon");
      }
    } catch (error) {
      toast.error("Unable to remove coupon right now.");
    }
  };

  const handleToggleActive = async (coupon) => {
    if (!token) return;
    try {
      const response = await axios.put(
        `${url}/api/coupon/${coupon.id}`,
        { active: !coupon.active },
        { headers: authHeaders }
      );
      if (response.data.success) {
        toast.success(
          `Coupon ${!coupon.active ? "activated" : "paused"} successfully`
        );
        fetchCoupons();
      } else {
        toast.error(response.data.message || "Unable to update coupon");
      }
    } catch (error) {
      toast.error("Unable to update coupon right now.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      toast.error("Please login again to manage coupons");
      return;
    }

    const builder = editingId ? buildUpdatePayload : buildCreatePayload;
    const { data, errors } = builder(formData);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }

    if (editingId && !Object.keys(data).length) {
      toast.info("No changes to update");
      return;
    }

    setSubmitting(true);

    try {
      let response;
      if (editingId) {
        response = await axios.put(
          `${url}/api/coupon/${editingId}`,
          data,
          {
            headers: authHeaders,
          }
        );
      } else {
        response = await axios.post(
          `${url}/api/coupon`,
          data,
          {
            headers: authHeaders,
          }
        );
      }

      if (response.data.success) {
        toast.success(editingId ? "Coupon updated" : "Coupon created");
        fetchCoupons();
        resetForm();
      } else {
        toast.error(response.data.message || "Unable to save coupon");
      }
    } catch (error) {
      const apiMessage = error?.response?.data?.message;
      toast.error(apiMessage || "Unable to save coupon right now.");
    } finally {
      setSubmitting(false);
    }
  };

  const discountLabel = useCallback(
    (coupon) => {
      const value = Number(coupon.discountValue) || 0;
      if (coupon.discountType === "flat") {
        return currencyFormatter.format(value);
      }
      return `${value}%`;
    },
    [currencyFormatter]
  );

  return (
    <section className="coupons admin-panel">
      <section className="coupons__form">
        <header>
          <h2>{editingId ? "Update coupon" : "Create a festive coupon"}</h2>
          <p>
            Reward loyal patrons with celebratory savings. Configure the code,
            usage caps, and validity window in one go.
          </p>
        </header>
        <form className="coupons__form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Coupon code</span>
            <input
              required
              name="code"
              value={formData.code}
              onChange={handleChange}
              type="text"
              placeholder="NAVRATRI25"
              autoComplete="off"
              className="coupons__uppercase"
            />
          </label>
          <label>
            <span>Label</span>
            <input
              required
              name="label"
              value={formData.label}
              onChange={handleChange}
              type="text"
              placeholder="Navratri Delight"
            />
          </label>
          <label className="coupons__full-row">
            <span>Description</span>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Explain where this coupon shines"
              rows={2}
            />
          </label>
          <label>
            <span>Discount type</span>
            <select
              name="discountType"
              value={formData.discountType}
              onChange={handleChange}
            >
              <option value="percentage">Percentage off</option>
              <option value="flat">Flat amount</option>
            </select>
          </label>
          <label>
            <span>Discount value</span>
            <input
              required
              name="discountValue"
              value={formData.discountValue}
              onChange={handleChange}
              type="number"
              min="0"
              step="0.01"
              placeholder="25"
            />
          </label>
          <label>
            <span>Min order</span>
            <input
              name="minOrderAmount"
              value={formData.minOrderAmount}
              onChange={handleChange}
              type="number"
              min="0"
              step="0.01"
            />
          </label>
          <label>
            <span>Max discount</span>
            <input
              name="maxDiscountValue"
              value={formData.maxDiscountValue}
              onChange={handleChange}
              type="number"
              min="0"
              step="0.01"
              placeholder="Leave blank for no cap"
            />
          </label>
          <label>
            <span>Usage limit</span>
            <input
              name="usageLimit"
              value={formData.usageLimit}
              onChange={handleChange}
              type="number"
              min="1"
              step="1"
              placeholder="Global limit"
            />
          </label>
          <label>
            <span>Per-user limit</span>
            <input
              name="perUserLimit"
              value={formData.perUserLimit}
              onChange={handleChange}
              type="number"
              min="1"
              step="1"
            />
          </label>
          <label>
            <span>Start date</span>
            <input
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              type="date"
            />
          </label>
          <label>
            <span>End date</span>
            <input
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              type="date"
            />
          </label>
          <label className="coupons__active">
            <input
              type="checkbox"
              name="active"
              checked={formData.active}
              onChange={handleChange}
            />
            <span>Active immediately</span>
          </label>
          <div className="coupons__actions">
            <button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : editingId
                ? "Update coupon"
                : "Create coupon"}
            </button>
            {editingId && (
              <button
                type="button"
                className="coupons__cancel"
                onClick={resetForm}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="coupons__list">
        <header>
          <div>
            <h3>Existing coupons</h3>
            <p>
              {coupons.length} code{coupons.length === 1 ? "" : "s"} ready for
              the festive rush.
            </p>
          </div>
          <button type="button" onClick={fetchCoupons} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh list"}
          </button>
        </header>
        {loading ? (
          <p className="coupons__empty">Loading coupons...</p>
        ) : coupons.length === 0 ? (
          <p className="coupons__empty">
            No coupons yet—launch your first celebratory offer above.
          </p>
        ) : (
          <div className="coupons__table">
            <div className="coupons__row coupons__row--head">
              <span>Code</span>
              <span>Label</span>
              <span>Discount</span>
              <span>Usage</span>
              <span>Active</span>
              <span>Actions</span>
            </div>
            {coupons.map((coupon) => {
              const remaining =
                coupon.usageLimit === null || coupon.usageLimit === undefined
                  ? "∞"
                  : Math.max(coupon.usageLimit - coupon.usageCount, 0);
              return (
                <div key={coupon.id} className="coupons__row">
                  <div>
                    <strong>{coupon.code}</strong>
                    {coupon.minOrderAmount > 0 && (
                      <small>
                        Min order {currencyFormatter.format(coupon.minOrderAmount)}
                      </small>
                    )}
                  </div>
                  <div>
                    <span>{coupon.label}</span>
                    {coupon.description && <small>{coupon.description}</small>}
                  </div>
                  <div>
                    <span>{discountLabel(coupon)}</span>
                    {coupon.maxDiscountValue !== null && (
                      <small>
                        Cap {currencyFormatter.format(coupon.maxDiscountValue)}
                      </small>
                    )}
                  </div>
                  <div>
                    <span>
                      Used {coupon.usageCount || 0} / {" "}
                      {coupon.usageLimit === null || coupon.usageLimit === undefined
                        ? "∞"
                        : coupon.usageLimit}
                    </span>
                    <small>Remaining {remaining}</small>
                    <small>Per user {coupon.perUserLimit || 1}</small>
                  </div>
                  <div>
                    <span className={
                      coupon.active
                        ? "coupons__status coupons__status--active"
                        : "coupons__status coupons__status--paused"
                    }>
                      {coupon.active ? "Live" : "Paused"}
                    </span>
                  </div>
                  <div className="coupons__row-actions">
                    <button type="button" onClick={() => handleEdit(coupon)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(coupon)}
                    >
                      {coupon.active ? "Pause" : "Activate"}
                    </button>
                    <button
                      type="button"
                      className="coupons__row-delete"
                      onClick={() => handleDelete(coupon.id, coupon.code)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
};

Coupons.propTypes = {
  url: PropTypes.string.isRequired,
};

export default Coupons;
