import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import "./Orders.css";
import axios from "axios";
import { toast } from "react-toastify";
import { assets } from "../../assets/assets";
import { StoreContext } from "../../context/StoreContext";
import { useNavigate } from "react-router-dom";

const RANGE_OPTIONS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  { label: "Last 1 year", value: 365 },
  { label: "Custom range", value: "custom" },
];

const formatDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const differenceInDaysInclusive = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  const diff = endDate.setHours(0, 0, 0, 0) - startDate.setHours(0, 0, 0, 0);
  if (diff < 0) return null;
  return Math.floor(diff / 86400000) + 1;
};

const collectCandidateValues = (...values) =>
  values
    .flat()
    .map((value) => {
      if (typeof value === "string") return value.trim();
      if (typeof value === "number" && Number.isFinite(value)) return String(value).trim();
      return "";
    })
    .filter(Boolean);

const getCustomerName = (order) => {
  if (!order) return "Customer";
  const address = order.address || {};
  const names = collectCandidateValues(
    address.contactName,
    [address.firstName, address.lastName].filter(Boolean).join(" "),
    order.customerName,
    order.name,
    order.user?.name
  );
  if (names.length) return names[0];
  const fallbacks = collectCandidateValues(order.user?.email, address.email, address.phone);
  return fallbacks[0] || "Customer";
};

const getOrderIdentifier = (order) => order?._id || order?.orderId || order?.id || null;

const ITEMS_PER_PAGE = 20;

const Orders = ({ url }) => {
  const navigate = useNavigate();
  const { token, admin } = useContext(StoreContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRange, setSelectedRange] = useState(30);
  const [customRangeError, setCustomRangeError] = useState(null);
  const [customRange, setCustomRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);
    return {
      start: formatDateInput(start),
      end: formatDateInput(end),
    };
  });
  const [appliedCustomRange, setAppliedCustomRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);
    return {
      start: formatDateInput(start),
      end: formatDateInput(end),
    };
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrderIds, setSelectedOrderIds] = useState(() => new Set());
  const [bulkRemoving, setBulkRemoving] = useState(false);
  const selectAllRef = useRef(null);
  const currencyCode = import.meta.env.VITE_CURRENCY || "INR";

  const todayInputValue = useMemo(() => formatDateInput(new Date()), []);

  const currencyFormatter = useMemo(() => {
    const locale = currencyCode === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
    });
  }, [currencyCode]);

  const activeSearchQuery = searchQuery.trim();

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];

    const sorted = [...orders].sort((a, b) => {
      const dateA = new Date(a?.date || a?.createdAt || 0);
      const dateB = new Date(b?.date || b?.createdAt || 0);
      const timeA = Number.isNaN(dateA.getTime()) ? 0 : dateA.getTime();
      const timeB = Number.isNaN(dateB.getTime()) ? 0 : dateB.getTime();
      return timeB - timeA;
    });

    let rangeStart = null;
    let rangeEnd = null;

    if (selectedRange === "custom") {
      const startValue = appliedCustomRange?.start;
      const endValue = appliedCustomRange?.end;
      if (startValue && endValue) {
        const startDate = new Date(startValue);
        const endDate = new Date(endValue);
        if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          rangeStart = startDate;
          rangeEnd = endDate;
        }
      }
    } else if (typeof selectedRange === "number" && selectedRange > 0) {
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date(endDate);
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(startDate.getDate() - selectedRange + 1);
      rangeStart = startDate;
      rangeEnd = endDate;
    }

    const rangeFiltered =
      rangeStart && rangeEnd
        ? sorted.filter((order) => {
            const orderDateValue = order?.date || order?.createdAt;
            if (!orderDateValue) return true;
            const orderDate = new Date(orderDateValue);
            if (Number.isNaN(orderDate.getTime())) return true;
            return orderDate >= rangeStart && orderDate <= rangeEnd;
          })
        : sorted;

    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return rangeFiltered;

    return rangeFiltered.filter((order) => {
      const orderId = getOrderIdentifier(order);
      const customerName = getCustomerName(order);
      const extraValues = collectCandidateValues(
        orderId ? String(orderId) : "",
        customerName,
        order.user?.email,
        order.user?.phone,
        order.address?.phone,
        order.address?.city,
        order.address?.street,
        order.address?.zipcode,
        order.items?.map((item) => item.name),
        order.items?.map((item) => item.category),
        order.instructions
      );
      const haystack = extraValues.join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [appliedCustomRange, orders, searchQuery, selectedRange]);

  useEffect(() => {
    setSelectedOrderIds((prev) => {
      if (prev.size === 0) return prev;
      const availableIds = new Set(
        orders
          .map((order) => order?._id)
          .filter(Boolean)
      );
      const next = new Set();
      prev.forEach((id) => {
        if (availableIds.has(id)) {
          next.add(id);
        }
      });
      return next.size === prev.size ? prev : next;
    });
  }, [orders]);

  const fetchAllOrder = useCallback(async () => {
    if (!token) {
      const message =
        "Your admin session has expired. Please log in again to manage orders.";
      setOrders([]);
      setError(message);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(url + "/api/order/list", {
        headers: { token },
      });

      if (response.data.success) {
        const data = Array.isArray(response.data.data)
          ? response.data.data
          : [];
        setOrders(data);
        if (!Array.isArray(response.data.data)) {
          const message =
            "Received an unexpected response while loading orders. Please retry.";
          setError(message);
          toast.error(message);
        }
      } else {
        const message = response.data.message || "Unable to load orders";
        setOrders([]);
        setError(message);
        toast.error(message);
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to load orders—please retry.";
      setOrders([]);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token, url]);

  const statusHandler = useCallback(
    async (event, orderId) => {
      const status = event.target.value;
      try {
        const response = await axios.post(
          url + "/api/order/status",
          {
            orderId,
            status,
          },
          { headers: { token } }
        );
        if (response.data.success) {
          toast.success(response.data.message);
          await fetchAllOrder();
        } else {
          toast.error(response.data.message || "Unable to update status");
        }
      } catch (error) {
        toast.error("Unable to update status—please retry");
      }
    },
    [fetchAllOrder, token, url]
  );

  const handleRangeChange = (event) => {
    const { value } = event.target;
    if (value === "custom") {
      setSelectedRange("custom");
      setCustomRangeError(null);
      setCustomRange((prev) => {
        if (prev.start && prev.end) return prev;
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 29);
        return {
          start: formatDateInput(start),
          end: formatDateInput(end),
        };
      });
    } else {
      const numeric = Number(value);
      const normalized = Number.isNaN(numeric) ? 30 : Math.max(1, numeric);
      setSelectedRange(normalized);
      setCustomRangeError(null);
    }
    setCurrentPage(1);
  };

  const handleCustomRangeChange = (field) => (event) => {
    const { value } = event.target;
    setCustomRange((prev) => ({ ...prev, [field]: value }));
  };

  const handleCustomRangeApply = () => {
    const { start, end } = customRange;
    if (!start || !end) {
      const message = "Select both start and end dates";
      setCustomRangeError(message);
      toast.error(message);
      return;
    }
    if (new Date(start) > new Date(end)) {
      const message = "Start date must be before end date";
      setCustomRangeError(message);
      toast.error(message);
      return;
    }
    const rangeDays = differenceInDaysInclusive(start, end);
    if (!rangeDays) {
      const message = "Unable to compute selected date range";
      setCustomRangeError(message);
      toast.error(message);
      return;
    }
    if (rangeDays > 365) {
      const message = "Custom range cannot exceed 365 days";
      setCustomRangeError(message);
      toast.error(message);
      return;
    }

    setCustomRangeError(null);
    setAppliedCustomRange({ start, end });
    setSelectedRange("custom");
    setCurrentPage(1);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1);
  };

  const handleSearchClear = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };
  useEffect(() => {
    if (!admin) {
      setOrders([]);
      setError("Administrator access required to manage orders.");
      toast.error("Please login with an admin account");
      navigate("/");
      return;
    }

    fetchAllOrder();
  }, [admin, fetchAllOrder, navigate]);

  const totalPages = useMemo(() => {
    if (!filteredOrders.length) return 1;
    return Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  }, [filteredOrders.length]);

  useEffect(() => {
    setCurrentPage((prev) => {
      if (prev < 1) return 1;
      if (prev > totalPages) return totalPages;
      return prev;
    });
  }, [totalPages]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredOrders.slice(start, end);
  }, [currentPage, filteredOrders]);

  const pageSelection = useMemo(() => {
    let selected = 0;
    const ids = [];
    paginatedOrders.forEach((order) => {
      const id = order?._id;
      if (id) {
        ids.push(id);
        if (selectedOrderIds.has(id)) {
          selected += 1;
        }
      }
    });
    return { total: ids.length, selected };
  }, [paginatedOrders, selectedOrderIds]);

  const allPageSelected = pageSelection.total > 0 && pageSelection.selected === pageSelection.total;
  const somePageSelected = pageSelection.selected > 0 && pageSelection.selected < pageSelection.total;
  const selectedCount = selectedOrderIds.size;
  const hasSelection = selectedCount > 0;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = somePageSelected;
  }, [somePageSelected]);

  const shouldShowPagination = !loading && !error && filteredOrders.length > ITEMS_PER_PAGE;
  const pageNumbers = useMemo(() => {
    const pages = new Set();
    pages.add(currentPage);
    if (currentPage + 1 <= totalPages) pages.add(currentPage + 1);
    if (currentPage + 2 <= totalPages) pages.add(currentPage + 2);
    if (totalPages >= 1) pages.add(totalPages);
    if (totalPages - 1 >= 1) pages.add(totalPages - 1);

    const normalized = Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);

    const entries = [];
    for (let index = 0; index < normalized.length; index += 1) {
      const page = normalized[index];
      const previous = normalized[index - 1];
      if (index > 0 && page - (previous || 0) > 1) {
        entries.push(`ellipsis-${previous}`);
      }
      entries.push(page);
    }

    return entries;
  }, [currentPage, totalPages]);
  const showToolbar = !loading && !error && (filteredOrders.length > 0 || hasSelection);

  const firstVisibleIndex = filteredOrders.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const lastVisibleIndex = firstVisibleIndex + paginatedOrders.length - 1;

  const goToPage = (page) => {
    setCurrentPage((prev) => {
      const next = Math.min(Math.max(page, 1), totalPages);
      return next === prev ? prev : next;
    });
  };

  const toggleOrderSelection = useCallback(
    (orderId) => {
      if (!orderId || bulkRemoving) return;
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        if (next.has(orderId)) {
          next.delete(orderId);
        } else {
          next.add(orderId);
        }
        return next;
      });
    },
    [bulkRemoving]
  );

  const handleSelectAllCurrentPage = useCallback(
    (event) => {
      if (bulkRemoving) return;
      const { checked } = event.target;
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        paginatedOrders.forEach((order) => {
          const id = order?._id;
          if (!id) return;
          if (checked) {
            next.add(id);
          } else {
            next.delete(id);
          }
        });
        return next;
      });
    },
    [bulkRemoving, paginatedOrders]
  );

  const removeSelectedOrders = useCallback(async () => {
    if (bulkRemoving) return;
    const ids = Array.from(selectedOrderIds).filter(Boolean);
    if (!ids.length) return;

    const confirmed = window.confirm(
      `Remove ${ids.length} selected order${ids.length === 1 ? "" : "s"}? This action can't be undone.`
    );
    if (!confirmed) return;

    if (!token) {
      toast.error("Your admin session has expired. Please log in again to manage orders.");
      return;
    }

    setBulkRemoving(true);
    const results = [];

    try {
      for (const orderId of ids) {
        try {
          const response = await axios.delete(`${url}/api/order/remove/${orderId}`, {
            headers: { token },
          });
          if (response.data?.success) {
            results.push({ success: true });
          } else {
            results.push({ success: false, message: response.data?.message });
          }
        } catch (error) {
          results.push({
            success: false,
            message: error?.response?.data?.message || error?.message || "Unable to remove order",
          });
        }
      }

      const successCount = results.filter((result) => result.success).length;
      const failureMessages = results
        .filter((result) => !result.success)
        .map((result) => result.message)
        .filter(Boolean);

      if (successCount) {
        toast.success(`${successCount} order${successCount === 1 ? "" : "s"} removed`);
      }

      if (failureMessages.length) {
        toast.error(failureMessages[0] || "Some orders could not be removed");
      }

      await fetchAllOrder();
    } finally {
      setBulkRemoving(false);
      setSelectedOrderIds(new Set());
    }
  }, [bulkRemoving, fetchAllOrder, selectedOrderIds, token, url]);

  return (
    <section className="order admin-panel">
      <header className="order__header">
        <div className="order__heading">
          <h3>Orders</h3>
          {!loading && !error && orders.length > 0 && (
            <p className="order__meta" aria-live="polite">
              {filteredOrders.length > 0
                ? `Showing ${firstVisibleIndex}${
                    lastVisibleIndex > firstVisibleIndex ? `–${lastVisibleIndex}` : ""
                  } of ${filteredOrders.length}${
                    orders.length !== filteredOrders.length
                      ? ` (filtered from ${orders.length})`
                      : ""
                  } order${filteredOrders.length === 1 ? "" : "s"}`
                : `No orders match the current filters${
                    orders.length ? ` out of ${orders.length}` : ""
                  }`}
            </p>
          )}
          {!loading && !error && activeSearchQuery && (
            <p className="order__meta order__meta--muted" aria-live="polite">
              Filtered by “{activeSearchQuery}”
            </p>
          )}
        </div>
        <div
          className="order__filters"
          role="group"
          aria-label="Search and filter orders"
        >
          <label className="order__filter order__search">
            <span>Search</span>
            <div className="order__search-box">
              <input
                type="search"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Customer or order ID"
                disabled={loading}
                aria-label="Search orders by customer or order ID"
              />
              {searchQuery ? (
                <button
                  type="button"
                  className="order__search-clear"
                  onClick={handleSearchClear}
                  disabled={loading}
                  aria-label="Clear search"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </label>
          <label className="order__filter">
            <span>Range</span>
            <select
              value={selectedRange === "custom" ? "custom" : selectedRange}
              onChange={handleRangeChange}
              disabled={loading}
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {selectedRange === "custom" && (
            <div className="order__custom-range">
              <label>
                <span>From</span>
                <input
                  type="date"
                  value={customRange.start}
                  max={customRange.end || todayInputValue}
                  onChange={handleCustomRangeChange("start")}
                  disabled={loading}
                />
              </label>
              <label>
                <span>To</span>
                <input
                  type="date"
                  value={customRange.end}
                  min={customRange.start || undefined}
                  max={todayInputValue}
                  onChange={handleCustomRangeChange("end")}
                  disabled={loading}
                />
              </label>
              <button
                type="button"
                className="order__custom-apply"
                onClick={handleCustomRangeApply}
                disabled={loading}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </header>
      {showToolbar && (
        <div className="order__toolbar" role="group" aria-label="Order selection controls">
          <label className="order__select-all">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allPageSelected && paginatedOrders.length > 0}
              onChange={handleSelectAllCurrentPage}
              disabled={paginatedOrders.length === 0 || bulkRemoving}
            />
            <span>Select all on this page</span>
          </label>
          <span className="order__toolbar-divider" aria-hidden>
            |
          </span>
          <button
            type="button"
            className="order__bulk-remove"
            onClick={removeSelectedOrders}
            disabled={!hasSelection || bulkRemoving}
          >
            {bulkRemoving
              ? "Deleting…"
              : `Delete selected${hasSelection ? ` (${selectedCount})` : ""}`}
          </button>
          {hasSelection && (
            <span className="order__toolbar-meta">{selectedCount} selected</span>
          )}
        </div>
      )}
      {customRangeError && !loading && !error && (
        <p className="order__range-error" role="alert">
          {customRangeError}
        </p>
      )}
      <div className="order-list" role="list">
        {loading && (
          <div
            className="order-state order-state--loading"
            role="status"
            aria-live="polite"
          >
            <span className="order-state__spinner" aria-hidden />
            <span>Loading the latest orders…</span>
          </div>
        )}

        {!loading && error && (
          <div className="order-state order-state--error" role="alert">
            <h4>We couldn’t refresh orders</h4>
            <p>{error}</p>
            <button
              type="button"
              className="order-state__retry"
              onClick={fetchAllOrder}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="order-state order-state--empty">
            <h4>No orders yet</h4>
            <p>
              You&apos;ll see new orders here the moment customers start placing
              them.
            </p>
          </div>
        )}

        {!loading && !error && orders.length > 0 && filteredOrders.length === 0 && (
          <div className="order-state order-state--empty">
            <h4>No matching orders</h4>
            <p>
              {activeSearchQuery
                ? "Try a different name or order ID, or clear the search to see all orders in this range."
                : "Select a different date range to view earlier orders."}
            </p>
          </div>
        )}

        {!loading && !error &&
          paginatedOrders.map((order, index) => {
          const items = Array.isArray(order.items) ? order.items : [];
          const address = order.address || {};
          const instructions =
            typeof order.instructions === "string"
              ? order.instructions.trim()
              : "";
          const orderTotal = Number(order.amount) || 0;
          const couponCode = order.couponCode;
          const savings = Number(order.discount) || 0;
          const deliveryCharge = Number(order.deliveryFee) || 0;
          const subtotal =
            Number(order.subtotal) || orderTotal + savings - deliveryCharge;
          const itemSummary = items
            .map((item) => `${item.name} x ${item.quantity}`)
            .join(", ");
          const customerName = getCustomerName(order);
          const orderIdentifier = getOrderIdentifier(order);
          const orderIdLabel = orderIdentifier ? String(orderIdentifier) : null;

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

          const orderKey = order._id || index;
          const orderIdValue = order._id;
          const isSelected = orderIdValue ? selectedOrderIds.has(orderIdValue) : false;

            return (
              <div
                key={orderKey}
                className={`order-item${isSelected ? " order-item--selected" : ""}`}
                role="listitem"
              >
              <div className="order-item-select">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOrderSelection(orderIdValue)}
                  disabled={!orderIdValue || bulkRemoving}
                  aria-label={orderIdLabel ? `Select order #${orderIdLabel}` : "Select order"}
                />
              </div>
              <img src={assets.parcel_icon} alt="" />
              <div>
                <p className="order-item-id">
                  <span>Order ID:</span> {orderIdLabel || "Unavailable"}
                </p>
                <p className="order-item-food">{itemSummary}</p>
                <p className="order-item-name">{customerName}</p>
                <div className="order-item-address">
                  {address.street && <p>{address.street}</p>}
                  <p>
                    {["city", "state", "country", "zipcode"]
                      .map((key) => address[key])
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
                <div className="order-item-totals">
                  <span>Subtotal: {currencyFormatter.format(subtotal)}</span>
                  <span>Delivery: {currencyFormatter.format(deliveryCharge)}</span>
                </div>
                <p className="order-item-phone">{address.phone}</p>
                {instructions && (
                  <p className="order-item-instructions">
                    <span>Runner notes:</span> {instructions}
                  </p>
                )}
                {couponCode && savings > 0 && (
                  <p className="order-item-savings">
                    Coupon {couponCode} saved {currencyFormatter.format(savings)}
                  </p>
                )}
              </div>
              <p className="order-item-count">Items: {items.length}</p>
              <p className="order-item-total">{currencyFormatter.format(orderTotal)}</p>
              <p className="order-item-payment">{paymentLabel}</p>
              <select
                onChange={(event) => statusHandler(event, order._id)}
                value={order.status || "Awaiting cash collection"}
              >
                  <option value="Awaiting cash collection">Awaiting cash collection</option>
                  <option value="Food Processing">Food Processing</option>
                  <option value="Out for delivery">Out for delivery</option>
                  <option value="Delivered">Delivered</option>
              </select>
              </div>
            );
          })}
      </div>
      {shouldShowPagination && (
        <nav className="order__pagination" aria-label="Orders pagination">
          <button
            type="button"
            className="order__pagination-button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <ul className="order__pagination-pages">
            {pageNumbers.map((entry) => {
              if (typeof entry === "string") {
                return (
                  <li key={entry} className="order__pagination-ellipsis" aria-hidden>
                    <span>…</span>
                  </li>
                );
              }

              const pageNumber = entry;
              return (
                <li key={pageNumber}>
                  <button
                    type="button"
                    className={`order__pagination-page${
                      pageNumber === currentPage ? " order__pagination-page--active" : ""
                    }`}
                    onClick={() => goToPage(pageNumber)}
                    aria-current={pageNumber === currentPage ? "page" : undefined}
                  >
                    {pageNumber}
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="order__pagination-button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
};

Orders.propTypes = {
  url: PropTypes.string.isRequired,
};

export default Orders;
