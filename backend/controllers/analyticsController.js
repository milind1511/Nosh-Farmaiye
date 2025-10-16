import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import {
  toNumberOrNull,
  clampRange,
  round2,
  parseDateValue,
  normalizeDateBoundaries,
  computePercentChange,
  formatTimeline,
  formatTopDishes,
  formatCategoryBreakdown,
  formatCouponPerformance,
  formatRecentOrders,
} from "../utils/analyticsUtils.js";

const isAdminUser = async (userId) => {
  if (!userId) return false;
  const user = await userModel.findById(userId).lean();
  return Boolean(user && user.role === "admin");
};

const baseCurrency = (process.env.CURRENCY || "INR").toLowerCase();
const displayCurrency = baseCurrency.toUpperCase();

const generateCoreAnalytics = async ({
  start,
  end,
  previousStart,
  previousEnd,
  rangeDays,
}) => {
  const matchStage = {
    payment: true,
    date: {
      $gte: start,
      $lte: end,
    },
  };

  const aggregation = await orderModel.aggregate([
    { $match: matchStage },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              revenue: { $sum: { $ifNull: ["$amount", 0] } },
              discount: { $sum: { $ifNull: ["$discount", 0] } },
              delivery: { $sum: { $ifNull: ["$deliveryFee", 0] } },
              orders: { $sum: 1 },
              customers: { $addToSet: "$userId" },
            },
          },
          {
            $project: {
              _id: 0,
              revenue: 1,
              discount: 1,
              delivery: 1,
              orders: 1,
              uniqueCustomers: { $size: { $ifNull: ["$customers", []] } },
              averageOrderValue: {
                $cond: [
                  { $eq: ["$orders", 0] },
                  0,
                  { $divide: ["$revenue", "$orders"] },
                ],
              },
            },
          },
        ],
        timeline: [
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$date",
                },
              },
              revenue: { $sum: { $ifNull: ["$amount", 0] } },
              orders: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        topDishes: [
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items._id",
              name: { $first: "$items.name" },
              category: { $first: "$items.category" },
              quantity: { $sum: { $ifNull: ["$items.quantity", 0] } },
              revenue: {
                $sum: {
                  $multiply: [
                    { $ifNull: ["$items.price", 0] },
                    { $ifNull: ["$items.quantity", 0] },
                  ],
                },
              },
            },
          },
          { $sort: { quantity: -1, revenue: -1 } },
          { $limit: 6 },
        ],
        categoryBreakdown: [
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.category",
              revenue: {
                $sum: {
                  $multiply: [
                    { $ifNull: ["$items.price", 0] },
                    { $ifNull: ["$items.quantity", 0] },
                  ],
                },
              },
              quantity: { $sum: { $ifNull: ["$items.quantity", 0] } },
            },
          },
          { $sort: { revenue: -1 } },
        ],
        couponPerformance: [
          { $match: { couponCode: { $ne: null } } },
          {
            $group: {
              _id: "$couponCode",
              orders: { $sum: 1 },
              revenue: { $sum: { $ifNull: ["$amount", 0] } },
              discount: { $sum: { $ifNull: ["$discount", 0] } },
            },
          },
          { $sort: { orders: -1 } },
          { $limit: 5 },
        ],
      },
    },
    {
      $project: {
        totals: { $first: "$totals" },
        timeline: 1,
        topDishes: 1,
        categoryBreakdown: 1,
        couponPerformance: 1,
      },
    },
  ]);

  const analyticsDoc = aggregation[0] || {};
  const totalsRaw = analyticsDoc.totals || {};

  const revenue = round2(totalsRaw.revenue || 0);
  const discountGiven = round2(totalsRaw.discount || 0);
  const grossRevenue = round2(revenue + discountGiven);
  const deliveryCollected = round2(totalsRaw.delivery || 0);
  const ordersCount = totalsRaw.orders || 0;
  const averageOrderValue = round2(totalsRaw.averageOrderValue || 0);
  const uniqueCustomers = totalsRaw.uniqueCustomers || 0;

  const previousTotals = await orderModel.aggregate([
    {
      $match: {
        payment: true,
        date: {
          $gte: previousStart,
          $lte: previousEnd,
        },
      },
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: { $ifNull: ["$amount", 0] } },
        orders: { $sum: 1 },
      },
    },
  ]);

  const previous = previousTotals[0] || { revenue: 0, orders: 0 };

  const growth = {
    revenue: computePercentChange(revenue, round2(previous.revenue || 0)),
    orders: computePercentChange(ordersCount, previous.orders || 0),
    averageOrderValue: computePercentChange(
      averageOrderValue,
      previous.orders ? round2((previous.revenue || 0) / previous.orders) : 0
    ),
  };

  const timeline = formatTimeline(analyticsDoc.timeline);
  const topDishes = formatTopDishes(analyticsDoc.topDishes);
  const categoryBreakdown = formatCategoryBreakdown(
    analyticsDoc.categoryBreakdown,
    revenue
  );
  const couponPerformance = formatCouponPerformance(
    analyticsDoc.couponPerformance
  );

  const recentOrdersRaw = await orderModel
    .find(matchStage)
    .sort({ date: -1 })
    .limit(6)
    .lean();

  return {
    range: {
      start: start.toISOString(),
      end: end.toISOString(),
      previousStart: previousStart.toISOString(),
      previousEnd: previousEnd.toISOString(),
      days:
        Math.floor((end.getTime() - start.getTime()) / 86400000) + 1,
      requestedDays: rangeDays,
    },
    totals: {
      revenue,
      grossRevenue,
      discountGiven,
      deliveryCollected,
      orders: ordersCount,
      uniqueCustomers,
      averageOrderValue,
    },
    growth,
    timeline,
    topDishes,
    categoryBreakdown,
    couponPerformance,
    recentOrders: formatRecentOrders(recentOrdersRaw),
    currency: displayCurrency,
  };
};

const WEEKDAY_LABELS = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

const formatHourLabel = (hour) => `${String(hour ?? 0).padStart(2, "0")}:00`;

const generateSupplementaryAnalytics = async ({ start, end }) => {
  const matchStage = {
    payment: true,
    date: {
      $gte: start,
      $lte: end,
    },
  };

  const [statusAgg, paymentAgg, hourlyAgg, weekdayAgg, customerAgg] =
    await Promise.all([
      orderModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $ifNull: ["$status", "Unknown"] },
            orders: { $sum: 1 },
          },
        },
        { $sort: { orders: -1 } },
      ]),
      orderModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $ifNull: ["$paymentMethod", "unknown"] },
            orders: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$amount", 0] } },
          },
        },
        { $sort: { orders: -1 } },
      ]),
      orderModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $hour: "$date" },
            orders: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$amount", 0] } },
          },
        },
        { $sort: { "_id": 1 } },
      ]),
      orderModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $isoDayOfWeek: "$date" },
            orders: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$amount", 0] } },
          },
        },
        { $sort: { "_id": 1 } },
      ]),
      orderModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$userId",
            orders: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$amount", 0] } },
            firstOrder: { $min: "$date" },
            lastOrder: { $max: "$date" },
          },
        },
      ]),
    ]);

  const statusBreakdown = statusAgg.map((entry) => ({
    status: entry._id || "Unknown",
    orders: entry.orders || 0,
  }));

  const paymentMethodsRaw = paymentAgg.map((entry) => ({
    method: entry._id || "unknown",
    orders: entry.orders || 0,
    revenue: round2(entry.revenue || 0),
  }));

  const hourlySales = hourlyAgg
    .map((entry) => ({
      hour: typeof entry._id === "number" ? entry._id : 0,
      orders: entry.orders || 0,
      revenue: round2(entry.revenue || 0),
    }))
    .sort((a, b) => a.hour - b.hour)
    .map((entry) => ({
      hour: entry.hour,
      label: formatHourLabel(entry.hour),
      orders: entry.orders,
      revenue: entry.revenue,
    }));

  const weekdayPerformance = weekdayAgg.map((entry) => ({
    dayIndex: entry._id,
    day: WEEKDAY_LABELS[entry._id] || `Day ${entry._id}`,
    orders: entry.orders || 0,
    revenue: round2(entry.revenue || 0),
  }));

  const customers = customerAgg.map((entry) => ({
    id: entry._id,
    orders: entry.orders || 0,
    revenue: round2(entry.revenue || 0),
    firstOrder: entry.firstOrder,
    lastOrder: entry.lastOrder,
  }));

  const totalCustomers = customers.length;
  const newCustomers = customers.filter((customer) => customer.orders === 1).length;
  const returningCustomers = customers.filter((customer) => customer.orders > 1).length;

  const frequencyBuckets = [
    {
      label: "1 order",
      customers: customers.filter((customer) => customer.orders === 1).length,
    },
    {
      label: "2-3 orders",
      customers: customers.filter(
        (customer) => customer.orders >= 2 && customer.orders <= 3
      ).length,
    },
    {
      label: "4-5 orders",
      customers: customers.filter(
        (customer) => customer.orders >= 4 && customer.orders <= 5
      ).length,
    },
    {
      label: "6+ orders",
      customers: customers.filter((customer) => customer.orders >= 6).length,
    },
  ];

  const topCustomersAgg = [...customers]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const topCustomerIds = topCustomersAgg.map((customer) => customer.id).filter(Boolean);
  const topCustomerDocs = topCustomerIds.length
    ? await userModel
        .find({ _id: { $in: topCustomerIds } })
        .select("name email")
        .lean()
    : [];

  const userLookup = new Map(
    topCustomerDocs.map((doc) => [String(doc._id), { name: doc.name, email: doc.email }])
  );

  const topCustomers = topCustomersAgg.map((customer) => {
    const user = userLookup.get(customer.id);
    return {
      id: customer.id,
      name: user?.name || `Customer ${String(customer.id || "").slice(-4)}`,
      email: user?.email || null,
      orders: customer.orders,
      revenue: customer.revenue,
      lastOrder: customer.lastOrder,
    };
  });

  return {
    statusBreakdown,
    paymentMethods: paymentMethodsRaw,
    hourlySales,
    weekdayPerformance,
    customerStats: {
      totalCustomers,
      newCustomers,
      returningCustomers,
      repeatRate:
        totalCustomers > 0
          ? round2((returningCustomers / totalCustomers) * 100)
          : 0,
      frequencyBuckets,
      topCustomers,
    },
  };
};

const buildAnalyticsPages = ({ core, supplementary }) => {
  const totals = core.totals || {};
  const growth = core.growth || {};
  const timeline = core.timeline || [];
  const categoryBreakdown = core.categoryBreakdown || [];
  const couponPerformance = core.couponPerformance || [];
  const topDishes = core.topDishes || [];
  const recentOrders = core.recentOrders || [];

  const totalOrders = totals.orders || 0;
  const totalRevenue = totals.revenue || 0;
  const totalCouponsUsed = couponPerformance.reduce(
    (acc, coupon) => acc + (coupon.orders || 0),
    0
  );

  const paymentMethods = (supplementary.paymentMethods || []).map((method) => ({
    ...method,
    share: totalOrders > 0 ? round2((method.orders / totalOrders) * 100) : 0,
  }));

  const statusBreakdown = (supplementary.statusBreakdown || []).map((status) => ({
    ...status,
    share: totalOrders > 0 ? round2((status.orders / totalOrders) * 100) : 0,
  }));

  const overview = {
    cards: [
      {
        id: "revenue",
        title: "Total revenue",
        value: totalRevenue,
        format: "currency",
        delta: growth.revenue,
        caption: "vs previous period",
      },
      {
        id: "orders",
        title: "Orders",
        value: totalOrders,
        format: "number",
        delta: growth.orders,
        caption: "vs previous period",
      },
      {
        id: "customers",
        title: "Unique customers",
        value: totals.uniqueCustomers || supplementary.customerStats.totalCustomers,
        format: "number",
      },
      {
        id: "aov",
        title: "Average order value",
        value: totals.averageOrderValue || 0,
        format: "currency",
        delta: growth.averageOrderValue,
        caption: "vs previous period",
      },
    ],
    revenueTrend: timeline,
    statusBreakdown,
    topDishes,
    recentOrders,
  };

  const sales = {
    cards: [
      {
        id: "gross",
        title: "Gross revenue",
        value: totals.grossRevenue || totalRevenue,
        format: "currency",
      },
      {
        id: "discount",
        title: "Discount given",
        value: totals.discountGiven || 0,
        format: "currency",
      },
      {
        id: "delivery",
        title: "Delivery collected",
        value: totals.deliveryCollected || 0,
        format: "currency",
      },
      {
        id: "couponOrders",
        title: "Orders with coupon",
        value: totalCouponsUsed,
        format: "number",
      },
    ],
    revenueTrend: timeline,
    categoryBreakdown,
    paymentMethods,
    hourlySales: supplementary.hourlySales || [],
    weekdayPerformance: (supplementary.weekdayPerformance || []).map((entry) => ({
      ...entry,
      share: totalOrders > 0 ? round2((entry.orders / totalOrders) * 100) : 0,
    })),
    couponPerformance,
  };

  const customerStats = supplementary.customerStats || {};
  const customers = {
    cards: [
      {
        id: "totalCustomers",
        title: "Customers",
        value:
          customerStats.totalCustomers ?? totals.uniqueCustomers ?? 0,
        format: "number",
      },
      {
        id: "newCustomers",
        title: "New customers",
        value: customerStats.newCustomers || 0,
        format: "number",
      },
      {
        id: "returningCustomers",
        title: "Returning customers",
        value: customerStats.returningCustomers || 0,
        format: "number",
      },
      {
        id: "repeatRate",
        title: "Repeat rate",
        value: customerStats.repeatRate || 0,
        format: "percent",
      },
    ],
    newVsReturning: [
      { label: "New", customers: customerStats.newCustomers || 0 },
      { label: "Returning", customers: customerStats.returningCustomers || 0 },
    ],
    frequencyBuckets: customerStats.frequencyBuckets || [],
    topCustomers: customerStats.topCustomers || [],
  };

  return {
    overview,
    sales,
    customers,
  };
};

export const getDashboardAnalytics = async (req, res) => {
  try {
    if (!(await isAdminUser(req.body.userId))) {
      return res.json({ success: false, message: "You are not admin" });
    }

    const rangeDays = clampRange(toNumberOrNull(req.query.rangeDays) || 30);
    const startDate = parseDateValue(req.query.startDate);
    const endDate = parseDateValue(req.query.endDate);
    const { start, end, previousStart, previousEnd } = normalizeDateBoundaries(
      startDate,
      endDate,
      rangeDays
    );

    const core = await generateCoreAnalytics({
      start,
      end,
      previousStart,
      previousEnd,
      rangeDays,
    });

    return res.json({ success: true, data: core });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: "Unable to load analytics" });
  }
};

export const getAnalyticsInsights = async (req, res) => {
  try {
    if (!(await isAdminUser(req.body.userId))) {
      return res.json({ success: false, message: "You are not admin" });
    }

    const rangeDays = clampRange(toNumberOrNull(req.query.rangeDays) || 30);
    const startDate = parseDateValue(req.query.startDate);
    const endDate = parseDateValue(req.query.endDate);
    const { start, end, previousStart, previousEnd } = normalizeDateBoundaries(
      startDate,
      endDate,
      rangeDays
    );

    const core = await generateCoreAnalytics({
      start,
      end,
      previousStart,
      previousEnd,
      rangeDays,
    });

    const supplementary = await generateSupplementaryAnalytics({ start, end });
    const pages = buildAnalyticsPages({ core, supplementary });

    return res.json({
      success: true,
      data: {
        ...core,
        pages,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: "Unable to load analytics" });
  }
};
