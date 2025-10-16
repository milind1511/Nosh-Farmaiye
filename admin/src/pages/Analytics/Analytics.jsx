import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

import { StoreContext } from "../../context/StoreContext";
import "./Analytics.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

const RANGE_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 180, label: "Last 6 months" },
  { value: "custom", label: "Custom range" },
];

const PAGES = [
  {
    id: "overview",
    label: "Overview",
    blurb: "Headline revenue, status mix, and recent orders",
  },
  {
    id: "sales",
    label: "Sales",
    blurb: "Category performance, payments, coupons",
  },
  {
    id: "customers",
    label: "Customers",
    blurb: "New vs returning and top customer insights",
  },
];

const CHART_COLORS = [
  "#ff6b6b",
  "#845ec2",
  "#4d96ff",
  "#ff9671",
  "#ffc75f",
  "#2c73d2",
  "#0081cf",
];

const DEFAULT_CURRENCY = "INR";
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const todayInputValue = new Date().toISOString().slice(0, 10);

const toRgba = (hex, alpha = 1) => {
  if (!hex) return `rgba(0, 0, 0, ${alpha})`;
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  if (Number.isNaN(bigint)) return `rgba(0, 0, 0, ${alpha})`;
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatPercent = (value, decimals = 1) => {
  if (value === null || value === undefined) return "–";
  const rounded = Number.parseFloat(value);
  if (Number.isNaN(rounded)) return "–";
  return `${rounded.toFixed(decimals)}%`;
};

const formatMetricValue = (value, format, currencyFormatter, numberFormatter) => {
  if (value === null || value === undefined) return "–";
  switch (format) {
    case "currency":
      return currencyFormatter.format(value);
    case "percent":
      return formatPercent(value);
    case "number":
      return numberFormatter.format(value);
    default:
      return String(value);
  }
};

const deltaClassForValue = (delta) => {
  if (delta === null || delta === undefined) return "analytics__delta--flat";
  if (delta > 0) return "analytics__delta--up";
  if (delta < 0) return "analytics__delta--down";
  return "analytics__delta--flat";
};

const deltaLabel = (delta) => {
  if (delta === null || delta === undefined) return "No change";
  const formatted = formatPercent(Math.abs(delta));
  if (delta > 0) return `+${formatted}`;
  if (delta < 0) return `-${formatted}`;
  return formatted;
};

const formatDateInput = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const differenceInDaysInclusive = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }
  const diff = endDate.getTime() - startDate.getTime();
  return Math.floor(diff / 86400000) + 1;
};

const formatChartDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const CardGrid = ({ items, currencyFormatter, numberFormatter }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="analytics__empty">No summary available for this range.</p>;
  }

  return (
    <div className="analytics__grid">
      {items.map((item) => {
        const { id, title, value, format, delta, caption } = item;
        return (
          <article key={id || title} className="analytics__card">
            <h3>{title}</h3>
            <p className="analytics__value">
              {formatMetricValue(value, format, currencyFormatter, numberFormatter)}
            </p>
            {delta !== undefined && delta !== null ? (
              <span className={`analytics__delta ${deltaClassForValue(delta)}`}>
                {deltaLabel(delta)}
              </span>
            ) : null}
            {caption ? <p className="analytics__card-caption">{caption}</p> : null}
          </article>
        );
      })}
    </div>
  );
};

CardGrid.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object),
  currencyFormatter: PropTypes.instanceOf(Intl.NumberFormat).isRequired,
  numberFormatter: PropTypes.instanceOf(Intl.NumberFormat).isRequired,
};

CardGrid.defaultProps = {
  items: [],
};

const ProgressList = ({ items, empty, maxValue = 100 }) => {
  if (!items || items.length === 0) {
    return <p className="analytics__empty">{empty}</p>;
  }

  return (
    <ul className="analytics__list">
      {items.map((item) => {
        const { label, value, valueFormatted } = item;
        const numeric = typeof value === "number" ? Math.max(0, Math.min(value, maxValue)) : 0;
        return (
          <li key={label}>
            <div className="analytics__bar-label">
              <span>{label}</span>
              <span>{valueFormatted ?? `${numeric}%`}</span>
            </div>
            <span className="analytics__bar-track">
              <span className="analytics__bar-fill" style={{ width: `${numeric}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
};

ProgressList.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.number,
      valueFormatted: PropTypes.string,
    })
  ),
  empty: PropTypes.string,
  maxValue: PropTypes.number,
};

ProgressList.defaultProps = {
  items: [],
  empty: "No data available",
  maxValue: 100,
};

const DataTable = ({ columns, rows, empty, getRowKey }) => {
  if (!rows || rows.length === 0) {
    return <p className="analytics__empty">{empty}</p>;
  }

  const gridTemplateColumns = columns.map(() => "minmax(110px, 1fr)").join(" ");

  return (
    <div className="analytics__table">
      <div
        className="analytics__table-row analytics__table-row--head"
        style={{ gridTemplateColumns }}
      >
        {columns.map((column) => (
          <span key={column.key}>{column.label}</span>
        ))}
      </div>
      {rows.map((row, index) => (
        <div
          key={getRowKey ? getRowKey(row, index) : `${index}`}
          className="analytics__table-row"
          style={{ gridTemplateColumns }}
        >
          {columns.map((column) => (
            <span key={column.key}>{row[column.key] ?? "–"}</span>
          ))}
        </div>
      ))}
    </div>
  );
};

DataTable.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  })).isRequired,
  rows: PropTypes.arrayOf(PropTypes.object),
  empty: PropTypes.string,
  getRowKey: PropTypes.func,
};

DataTable.defaultProps = {
  rows: [],
  empty: "No rows available",
  getRowKey: undefined,
};

const Analytics = ({ url: urlProp }) => {
  const { token, admin, apiBaseUrl } = useContext(StoreContext);
  const navigate = useNavigate();

  const [activePage, setActivePage] = useState(PAGES[0].id);
  const [selectedRange, setSelectedRange] = useState(30);
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [customRangeError, setCustomRangeError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [insights, setInsights] = useState(null);

  const serviceUrl = urlProp || apiBaseUrl;

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: insights?.currency || DEFAULT_CURRENCY,
        maximumFractionDigits: 2,
      }),
    [insights?.currency]
  );

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 0,
      }),
    []
  );

  const overviewCharts = useMemo(() => {
    const page = insights?.pages?.overview;
    if (!page) return {};

    const timelineLabels = page.revenueTrend?.map((point) => formatChartDate(point.date)) ?? [];
    const revenueTrend = timelineLabels.length
      ? {
          data: {
            labels: timelineLabels,
            datasets: [
              {
                type: "line",
                label: "Revenue",
                data: page.revenueTrend.map((point) => point.revenue),
                borderColor: CHART_COLORS[0],
                backgroundColor: toRgba(CHART_COLORS[0], 0.15),
                borderWidth: 2,
                tension: 0.35,
                fill: true,
                yAxisID: "y",
              },
              {
                type: "bar",
                label: "Orders",
                data: page.revenueTrend.map((point) => point.orders),
                backgroundColor: toRgba(CHART_COLORS[1], 0.35),
                borderColor: toRgba(CHART_COLORS[1], 0.7),
                borderWidth: 1,
                yAxisID: "y1",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                ticks: { color: "#4d5665" },
                title: { display: true, text: "Revenue" },
              },
              y1: {
                beginAtZero: true,
                position: "right",
                grid: { drawOnChartArea: false },
                ticks: { color: "#4d5665" },
                title: { display: true, text: "Orders" },
              },
            },
            plugins: {
              legend: { position: "top" },
              tooltip: {
                mode: "index",
                intersect: false,
              },
            },
          },
        }
      : null;

    const statusData = page.statusBreakdown ?? [];
    const statusChart = statusData.length
      ? {
          data: {
            labels: statusData.map((entry) => entry.status),
            datasets: [
              {
                data: statusData.map((entry) => entry.orders),
                backgroundColor: statusData.map((_, index) => toRgba(CHART_COLORS[index % CHART_COLORS.length], 0.8)),
                borderColor: statusData.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "bottom" },
            },
          },
        }
      : null;

    return { revenueTrend, statusChart };
  }, [insights]);

  const salesCharts = useMemo(() => {
    const page = insights?.pages?.sales;
    if (!page) return {};

    const categoryLabels = page.categoryBreakdown?.map((item) => item.category) ?? [];
    const categoryChart = categoryLabels.length
      ? {
          data: {
            labels: categoryLabels,
            datasets: [
              {
                label: "Revenue",
                data: page.categoryBreakdown.map((item) => item.revenue),
                backgroundColor: categoryLabels.map((_, index) => toRgba(CHART_COLORS[index % CHART_COLORS.length], 0.6)),
                borderColor: categoryLabels.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
                borderWidth: 1,
                borderRadius: 12,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
            },
            scales: {
              x: { ticks: { color: "#4d5665" } },
              y: {
                beginAtZero: true,
                ticks: { color: "#4d5665" },
              },
            },
          },
        }
      : null;

    const paymentLabels = page.paymentMethods?.map((item) => item.method) ?? [];
    const paymentChart = paymentLabels.length
      ? {
          data: {
            labels: paymentLabels,
            datasets: [
              {
                data: page.paymentMethods.map((item) => item.share),
                backgroundColor: paymentLabels.map((_, index) => toRgba(CHART_COLORS[index % CHART_COLORS.length], 0.85)),
                borderColor: paymentLabels.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "bottom" },
              tooltip: {
                callbacks: {
                  label: (context) => `${context.label}: ${context.parsed.toFixed(1)}%`,
                },
              },
            },
          },
        }
      : null;

    const weekdayData = page.weekdayPerformance ?? [];
    const weekdayChart = weekdayData.length
      ? {
          data: {
            labels: weekdayData.map((item) => item.day || WEEKDAY_LABELS[item.dayIndex - 1] || "Day"),
            datasets: [
              {
                label: "Orders",
                data: weekdayData.map((item) => item.orders),
                backgroundColor: weekdayData.map((_, index) => toRgba(CHART_COLORS[index % CHART_COLORS.length], 0.4)),
                borderColor: weekdayData.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
                borderWidth: 1,
                borderRadius: 10,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { color: "#4d5665" },
              },
              x: {
                ticks: { color: "#4d5665" },
              },
            },
          },
        }
      : null;

    const hourlyData = page.hourlySales ?? [];
    const hourlyChart = hourlyData.length
      ? {
          data: {
            labels: hourlyData.map((item) => item.label),
            datasets: [
              {
                label: "Revenue",
                data: hourlyData.map((item) => item.revenue),
                borderColor: CHART_COLORS[2],
                backgroundColor: toRgba(CHART_COLORS[2], 0.15),
                tension: 0.35,
                fill: true,
                yAxisID: "y",
              },
              {
                label: "Orders",
                data: hourlyData.map((item) => item.orders),
                borderColor: CHART_COLORS[3],
                backgroundColor: toRgba(CHART_COLORS[3], 0.1),
                borderDash: [6, 4],
                yAxisID: "y1",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                ticks: { color: "#4d5665" },
              },
              y1: {
                beginAtZero: true,
                position: "right",
                grid: { drawOnChartArea: false },
                ticks: { color: "#4d5665" },
              },
            },
            plugins: {
              legend: { position: "top" },
            },
          },
        }
      : null;

    return { categoryChart, paymentChart, weekdayChart, hourlyChart };
  }, [insights]);

  const customersCharts = useMemo(() => {
    const page = insights?.pages?.customers;
    if (!page) return {};

    const newVsReturning = page.newVsReturning ?? [];
    const newVsReturningChart = newVsReturning.length
      ? {
          data: {
            labels: newVsReturning.map((item) => item.label),
            datasets: [
              {
                data: newVsReturning.map((item) => item.customers),
                backgroundColor: newVsReturning.map((_, index) => toRgba(CHART_COLORS[index % CHART_COLORS.length], 0.85)),
                borderColor: newVsReturning.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "bottom" },
              tooltip: {
                callbacks: {
                  label: (context) => `${context.label}: ${context.parsed.toLocaleString()} customers`,
                },
              },
            },
          },
        }
      : null;

    const frequencyBuckets = page.frequencyBuckets ?? [];
    const frequencyChart = frequencyBuckets.length
      ? {
          data: {
            labels: frequencyBuckets.map((bucket) => bucket.label),
            datasets: [
              {
                label: "Customers",
                data: frequencyBuckets.map((bucket) => bucket.customers),
                backgroundColor: frequencyBuckets.map((_, index) => toRgba(CHART_COLORS[index % CHART_COLORS.length], 0.4)),
                borderColor: frequencyBuckets.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
                borderWidth: 1,
                borderRadius: 12,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { color: "#4d5665" },
              },
              x: {
                ticks: { color: "#4d5665" },
              },
            },
          },
        }
      : null;

    return { newVsReturningChart, frequencyChart };
  }, [insights]);

  const fetchInsights = useCallback(
    async ({ rangeValue, startDate, endDate, rangeDays }) => {
      if (!token || !serviceUrl) return;
      setLoading(true);
      setError(null);
      try {
        const params = {};
        if (rangeValue === "custom") {
          if (startDate) params.startDate = startDate;
          if (endDate) params.endDate = endDate;
          const computedDays =
            typeof rangeDays === "number"
              ? rangeDays
              : differenceInDaysInclusive(startDate, endDate) || undefined;
          if (computedDays) params.rangeDays = computedDays;
        } else if (typeof rangeValue === "number" && !Number.isNaN(rangeValue)) {
          params.rangeDays = rangeValue;
        }
        if (!params.rangeDays) {
          params.rangeDays = 30;
        }
        const response = await axios.get(`${serviceUrl}/api/analytics/insights`, {
          headers: { token },
          params,
        });
        if (response.data.success) {
          setInsights(response.data.data);
        } else {
          const message = response.data.message || "Unable to load analytics";
          setInsights(null);
          setError(message);
          toast.error(message);
        }
      } catch (err) {
        const message =
          err?.response?.data?.message || err?.message || "Unable to load analytics";
        setInsights(null);
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [token, serviceUrl]
  );

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    if (!admin) {
      toast.error("Admin access required");
      navigate("/");
      return;
    }
    if (selectedRange !== "custom") {
      fetchInsights({ rangeValue: selectedRange });
    }
  }, [admin, token, selectedRange, navigate, fetchInsights]);

  const handleRangeChange = (event) => {
    const value = event.target.value;
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
      setSelectedRange(Number(value));
      setCustomRangeError(null);
    }
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
    setSelectedRange("custom");
    fetchInsights({ rangeValue: "custom", startDate: start, endDate: end, rangeDays });
  };

  useEffect(() => {
    if (!insights) return;
    if (!insights.pages?.[activePage]) {
      setActivePage(PAGES[0].id);
    }
  }, [insights, activePage]);

  if (loading) {
    return (
      <section className="analytics admin-panel analytics--loading">
        <div className="analytics__spinner" aria-label="Loading analytics" />
        <p>Crunching the latest numbers…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="analytics admin-panel">
        <header className="analytics__header">
          <h2>Performance analytics</h2>
          <div className="analytics__controls">
            <label>
              <span>Range</span>
              <select value={selectedRange === "custom" ? "custom" : selectedRange} onChange={handleRangeChange}>
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {selectedRange === "custom" ? (
              <div className="analytics__custom-range">
                <label>
                  <span>From</span>
                  <input
                    type="date"
                    value={customRange.start}
                    max={customRange.end || undefined}
                    onChange={handleCustomRangeChange("start")}
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
                  />
                </label>
                <button
                  type="button"
                  className="analytics__custom-apply"
                  onClick={handleCustomRangeApply}
                  disabled={loading}
                >
                  Apply
                </button>
                {customRangeError ? (
                  <p className="analytics__custom-error">{customRangeError}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>
        <p className="analytics__empty analytics__empty--error">{error}</p>
      </section>
    );
  }

  if (!insights) {
    return null;
  }

  const renderOverview = () => {
    const page = insights.pages?.overview;
    if (!page) return null;

    const statusList = (page.statusBreakdown ?? []).map((item) => ({
      label: `${item.status} • ${formatPercent(item.share, 1)}`,
      value: item.share,
      valueFormatted: `${numberFormatter.format(item.orders)} orders`,
    }));

    const topDishRows = (page.topDishes ?? []).map((dish) => ({
      name: dish.name,
      category: dish.category,
      quantity: numberFormatter.format(dish.quantity ?? 0),
      revenue: currencyFormatter.format(dish.revenue ?? 0),
    }));

    const recentOrdersRows = (insights.recentOrders ?? []).map((order) => ({
      id: `#${String(order.orderId || order.id || "").slice(-6)}`,
      date: order.date ? new Date(order.date).toLocaleString() : "–",
      gross: currencyFormatter.format(order.gross ?? order.amount ?? 0),
      net: currencyFormatter.format(order.amount ?? 0),
      status: order.status || "–",
    }));

    return (
      <>
        <CardGrid
          items={page.cards}
          currencyFormatter={currencyFormatter}
          numberFormatter={numberFormatter}
        />

        <section className="analytics__section">
          <h3>Revenue and orders</h3>
          {overviewCharts.revenueTrend ? (
            <div className="analytics__chart">
              <Line data={overviewCharts.revenueTrend.data} options={overviewCharts.revenueTrend.options} />
            </div>
          ) : (
            <p className="analytics__empty">No timeline available</p>
          )}
        </section>

        <section className="analytics__section analytics__section--split">
          <div>
            <h3>Status mix</h3>
            {overviewCharts.statusChart ? (
              <div className="analytics__chart">
                <Doughnut data={overviewCharts.statusChart.data} options={overviewCharts.statusChart.options} />
              </div>
            ) : (
              <p className="analytics__empty">No status data</p>
            )}
            <ProgressList items={statusList} empty="No status breakdown" />
          </div>
          <div>
            <h3>Top dishes</h3>
            <DataTable
              columns={[
                { key: "name", label: "Dish" },
                { key: "category", label: "Category" },
                { key: "quantity", label: "Qty" },
                { key: "revenue", label: "Revenue" },
              ]}
              rows={topDishRows}
              empty="No dishes in this period"
            />
          </div>
        </section>

        <section className="analytics__section">
          <h3>Recent orders</h3>
          <DataTable
            columns={[
              { key: "id", label: "Order" },
              { key: "date", label: "Date" },
              { key: "gross", label: "Gross" },
              { key: "net", label: "Net" },
              { key: "status", label: "Status" },
            ]}
            rows={recentOrdersRows}
            empty="No recent orders"
          />
        </section>
      </>
    );
  };

  const renderSales = () => {
    const page = insights.pages?.sales;
    if (!page) return null;

    const paymentList = (page.paymentMethods ?? []).map((method) => ({
      label: method.method,
      value: method.share,
      valueFormatted: `${formatPercent(method.share)} · ${currencyFormatter.format(method.revenue ?? 0)}`,
    }));

    const categoryRows = (page.categoryBreakdown ?? []).map((item) => ({
      category: item.category,
      revenue: currencyFormatter.format(item.revenue ?? 0),
      quantity: numberFormatter.format(item.quantity ?? 0),
      share: formatPercent(item.share ?? 0),
    }));

    const hourlyRows = (page.hourlySales ?? []).map((item) => ({
      hour: item.label,
      orders: numberFormatter.format(item.orders ?? 0),
      revenue: currencyFormatter.format(item.revenue ?? 0),
    }));

    const couponRows = (page.couponPerformance ?? []).map((coupon) => ({
      coupon: coupon.couponCode,
      orders: numberFormatter.format(coupon.orders ?? 0),
      revenue: currencyFormatter.format(coupon.revenue ?? 0),
      discount: currencyFormatter.format(coupon.discount ?? 0),
    }));

    return (
      <>
        <CardGrid
          items={page.cards}
          currencyFormatter={currencyFormatter}
          numberFormatter={numberFormatter}
        />

        <section className="analytics__section analytics__section--split">
          <div>
            <h3>Category contribution</h3>
            {salesCharts.categoryChart ? (
              <div className="analytics__chart">
                <Bar data={salesCharts.categoryChart.data} options={salesCharts.categoryChart.options} />
              </div>
            ) : (
              <p className="analytics__empty">No category data</p>
            )}
            <DataTable
              columns={[
                { key: "category", label: "Category" },
                { key: "revenue", label: "Revenue" },
                { key: "quantity", label: "Orders" },
                { key: "share", label: "Share" },
              ]}
              rows={categoryRows}
              empty="No category breakdown"
            />
          </div>
          <div>
            <h3>Payment mix</h3>
            {salesCharts.paymentChart ? (
              <div className="analytics__chart analytics__chart--compact">
                <Doughnut data={salesCharts.paymentChart.data} options={salesCharts.paymentChart.options} />
              </div>
            ) : (
              <p className="analytics__empty">No payment data</p>
            )}
            <ProgressList items={paymentList} empty="No payment data" />
          </div>
        </section>

        <section className="analytics__section analytics__section--split">
          <div>
            <h3>Weekday cadence</h3>
            {salesCharts.weekdayChart ? (
              <div className="analytics__chart">
                <Bar data={salesCharts.weekdayChart.data} options={salesCharts.weekdayChart.options} />
              </div>
            ) : (
              <p className="analytics__empty">No weekday data</p>
            )}
          </div>
          <div>
            <h3>Hourly sales</h3>
            {salesCharts.hourlyChart ? (
              <div className="analytics__chart">
                <Line data={salesCharts.hourlyChart.data} options={salesCharts.hourlyChart.options} />
              </div>
            ) : (
              <p className="analytics__empty">No hourly data</p>
            )}
            <DataTable
              columns={[
                { key: "hour", label: "Hour" },
                { key: "orders", label: "Orders" },
                { key: "revenue", label: "Revenue" },
              ]}
              rows={hourlyRows}
              empty="No hourly breakdown"
            />
          </div>
        </section>

        <section className="analytics__section">
          <h3>Coupon performance</h3>
          <DataTable
            columns={[
              { key: "coupon", label: "Coupon" },
              { key: "orders", label: "Orders" },
              { key: "revenue", label: "Revenue" },
              { key: "discount", label: "Discount" },
            ]}
            rows={couponRows}
            empty="No coupon usage"
          />
        </section>
      </>
    );
  };

  const renderCustomers = () => {
    const page = insights.pages?.customers;
    if (!page) return null;

    const totalCustomers = (page.cards ?? []).find((card) => card.id === "totalCustomers")?.value ?? 0;
    const newCustomers = (page.cards ?? []).find((card) => card.id === "newCustomers")?.value ?? 0;
    const returningCustomers = (page.cards ?? []).find((card) => card.id === "returningCustomers")?.value ?? 0;
    const newReturningList = [
      {
        label: "New customers",
        value: totalCustomers === 0 ? 0 : (newCustomers / totalCustomers) * 100,
        valueFormatted: `${numberFormatter.format(newCustomers)} customers`,
      },
      {
        label: "Returning",
        value: totalCustomers === 0 ? 0 : (returningCustomers / totalCustomers) * 100,
        valueFormatted: `${numberFormatter.format(returningCustomers)} customers`,
      },
    ];

    const topCustomerRows = (page.topCustomers ?? []).map((customer) => ({
      name: customer.name,
      email: customer.email || "–",
      orders: numberFormatter.format(customer.orders ?? 0),
      revenue: currencyFormatter.format(customer.revenue ?? 0),
      lastOrder: customer.lastOrder ? new Date(customer.lastOrder).toLocaleDateString() : "–",
    }));

    return (
      <>
        <CardGrid
          items={page.cards}
          currencyFormatter={currencyFormatter}
          numberFormatter={numberFormatter}
        />

        <section className="analytics__section analytics__section--split">
          <div>
            <h3>New vs returning</h3>
            {customersCharts.newVsReturningChart ? (
              <div className="analytics__chart analytics__chart--compact">
                <Doughnut
                  data={customersCharts.newVsReturningChart.data}
                  options={customersCharts.newVsReturningChart.options}
                />
              </div>
            ) : (
              <p className="analytics__empty">No customer breakdown</p>
            )}
            <ProgressList items={newReturningList} empty="No customer breakdown" />
          </div>
          <div>
            <h3>Order frequency</h3>
            {customersCharts.frequencyChart ? (
              <div className="analytics__chart">
                <Bar data={customersCharts.frequencyChart.data} options={customersCharts.frequencyChart.options} />
              </div>
            ) : (
              <p className="analytics__empty">No frequency data</p>
            )}
          </div>
        </section>

        <section className="analytics__section">
          <h3>Top customers</h3>
          <DataTable
            columns={[
              { key: "name", label: "Customer" },
              { key: "email", label: "Email" },
              { key: "orders", label: "Orders" },
              { key: "revenue", label: "Revenue" },
              { key: "lastOrder", label: "Last order" },
            ]}
            rows={topCustomerRows}
            empty="No top customers"
          />
        </section>
      </>
    );
  };

  const pageRenderers = {
    overview: renderOverview,
    sales: renderSales,
    customers: renderCustomers,
  };

  const ActiveRenderer = pageRenderers[activePage];

  return (
    <section className="analytics admin-panel analytics--insights">
      <header className="analytics__header">
        <div>
          <h2>Performance analytics</h2>
          <p className="analytics__subtitle">
            {insights.range.start.slice(0, 10)} → {insights.range.end.slice(0, 10)} · {numberFormatter.format(insights.totals.orders || 0)} orders analysed · refreshed {new Date(insights.generatedAt || Date.now()).toLocaleString()}
          </p>
        </div>
        <div className="analytics__controls">
          <label>
            <span>Range</span>
            <select value={selectedRange === "custom" ? "custom" : selectedRange} onChange={handleRangeChange}>
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {selectedRange === "custom" ? (
            <div className="analytics__custom-range">
              <label>
                <span>From</span>
                <input
                  type="date"
                  value={customRange.start}
                  max={customRange.end || undefined}
                  onChange={handleCustomRangeChange("start")}
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
                />
              </label>
              <button
                type="button"
                className="analytics__custom-apply"
                onClick={handleCustomRangeApply}
                disabled={loading}
              >
                Apply
              </button>
              {customRangeError ? (
                <p className="analytics__custom-error">{customRangeError}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <nav className="analytics__nav" aria-label="Analytics sections">
        {PAGES.map((page) => {
          const isActive = page.id === activePage;
          return (
            <button
              key={page.id}
              type="button"
              className={`analytics__nav-item${isActive ? " analytics__nav-item--active" : ""}`}
              onClick={() => setActivePage(page.id)}
            >
              <span>{page.label}</span>
              <small>{page.blurb}</small>
            </button>
          );
        })}
      </nav>

      <main className="analytics__content" aria-live="polite">
        {ActiveRenderer ? ActiveRenderer() : null}
      </main>
    </section>
  );
};

Analytics.propTypes = {
  url: PropTypes.string,
};

Analytics.defaultProps = {
  url: undefined,
};

export default Analytics;
