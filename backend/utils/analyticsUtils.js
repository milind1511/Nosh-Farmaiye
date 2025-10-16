export const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const clampRange = (days) => {
  if (!days) return 30;
  return Math.max(1, Math.min(days, 365));
};

export const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export const parseDateValue = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const normalizeDateBoundaries = (
  startInput,
  endInput,
  rangeDaysFallback = 30
) => {
  const end = endInput ? new Date(endInput) : new Date();
  end.setHours(23, 59, 59, 999);

  const rangeDays = clampRange(rangeDaysFallback);
  const start = startInput ? new Date(startInput) : new Date(end.getTime());
  start.setHours(0, 0, 0, 0);

  if (!startInput) {
    start.setDate(end.getDate() - (rangeDays - 1));
  }

  if (start > end) {
    const temp = new Date(start);
    start.setTime(end.getTime());
    end.setTime(temp.getTime());
  }

  const rangeMs = Math.max(1, end.getTime() - start.getTime());
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - rangeMs);
  previousStart.setHours(0, 0, 0, 0);

  return {
    start,
    end,
    previousStart,
    previousEnd,
    rangeMs,
  };
};

export const computePercentChange = (current, previous) => {
  if (previous === 0) return null;
  return round2(((current - previous) / previous) * 100);
};

export const formatTimeline = (entries = []) =>
  entries.map((entry) => ({
    date: entry._id,
    revenue: round2(entry.revenue || 0),
    orders: entry.orders || 0,
  }));

export const formatTopDishes = (entries = []) =>
  entries.map((entry) => ({
    id: entry._id,
    name: entry.name,
    category: entry.category || "Uncategorized",
    quantity: entry.quantity || 0,
    revenue: round2(entry.revenue || 0),
  }));

export const formatCategoryBreakdown = (entries = [], totalRevenue = 0) =>
  entries.map((entry) => {
    const revenue = round2(entry.revenue || 0);
    const share = totalRevenue > 0 ? round2((revenue / totalRevenue) * 100) : 0;
    return {
      category: entry._id || "Uncategorized",
      revenue,
      quantity: entry.quantity || 0,
      share,
    };
  });

export const formatCouponPerformance = (entries = []) =>
  entries.map((entry) => ({
    couponCode: entry._id,
    orders: entry.orders || 0,
    revenue: round2(entry.revenue || 0),
    discount: round2(entry.discount || 0),
  }));

export const formatRecentOrders = (orders = []) =>
  orders.map((order) => {
    const discount = round2(order.discount || 0);
    const amount = round2(order.amount || 0);
    const gross = round2(amount + discount);
    return {
      id: order._id,
      orderId: order._id,
      date: order.date,
      status: order.status,
      amount,
      discount,
      gross,
      deliveryFee: round2(order.deliveryFee || 0),
      couponCode: order.couponCode || null,
      items: Array.isArray(order.items)
        ? order.items.slice(0, 6).map((item) => ({
            name: item.name,
            quantity: item.quantity,
          }))
        : [],
    };
  });
