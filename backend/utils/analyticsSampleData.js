const createSeededRandom = (seed) => {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }

  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const toCurrency = (amount, currency) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount || 0);

const round = (number) => Math.round((number + Number.EPSILON) * 100) / 100;

const buildSparkline = (length, base, variance, random) => {
  const series = [];
  let current = base;
  for (let idx = 0; idx < length; idx += 1) {
    const delta = (random() - 0.5) * variance;
    current = Math.max(0, current + delta);
    series.push(round(current));
  }
  return series;
};

const distribute = (total, parts, random) => {
  const weights = Array.from({ length: parts }, () => random() + 0.1);
  const weightSum = weights.reduce((acc, value) => acc + value, 0);
  return weights.map((weight) => round((weight / weightSum) * total));
};

const createPseudoId = (prefix, index) => `${prefix}-${String(index + 1).padStart(3, "0")}`;

export const buildAnalyticsInsights = ({ core, rangeDays }) => {
  const seed = new Date(core?.range?.start || Date.now()).getTime();
  const random = createSeededRandom(seed);
  const currency = core?.currency || "INR";
  const totalRevenue = core?.totals?.revenue || 0;
  const totalOrders = core?.totals?.orders || 1;
  const avgOrderValue = core?.totals?.averageOrderValue || totalRevenue / totalOrders || 0;
  const uniqueCustomers = core?.totals?.uniqueCustomers || Math.round(totalOrders * 0.75);
  const rangeLabel = `${core?.range?.days || rangeDays || 30}-day window`;

  const [appShare, webShare, kioskShare] = distribute(100, 3, random);
  const averageDeliveryTime = 32 + Math.round(random() * 8);

  const buildKpis = (items) =>
    items.map((item, index) => ({
      id: createPseudoId("kpi", index),
      ...item,
    }));

  const overview = {
    rangeLabel,
    cards: buildKpis([
      {
        title: "Total revenue",
        value: toCurrency(totalRevenue, currency),
        delta: round(random() * 8 + 4),
        trend: buildSparkline(12, totalRevenue / rangeDays, totalRevenue / rangeDays / 2, random),
        caption: "Growth vs. previous window",
      },
      {
        title: "Orders fulfilled",
        value: totalOrders.toLocaleString(),
        delta: round(random() * 6 + 2),
        trend: buildSparkline(12, totalOrders / rangeDays, totalOrders / rangeDays / 1.5, random),
        caption: "Completed deliveries",
      },
      {
        title: "Average order value",
        value: toCurrency(avgOrderValue, currency),
        delta: round(random() * 4 - 2),
        trend: buildSparkline(12, avgOrderValue, avgOrderValue / 4, random),
        caption: "Ticket size movement",
      },
      {
        title: "Active customers",
        value: uniqueCustomers.toLocaleString(),
        delta: round(random() * 5 + 3),
        trend: buildSparkline(12, uniqueCustomers / rangeDays, uniqueCustomers / rangeDays / 1.2, random),
        caption: "Unique purchasers",
      },
    ]),
    revenueTrend: (core?.timeline || []).map((entry) => ({
      date: entry.date,
      revenue: entry.revenue,
      orders: entry.orders,
    })),
    orderSources: [
      { source: "Mobile app", percent: appShare, revenue: round((appShare / 100) * totalRevenue) },
      { source: "Website", percent: webShare, revenue: round((webShare / 100) * totalRevenue) },
      { source: "Kiosk / walk-in", percent: kioskShare, revenue: round((kioskShare / 100) * totalRevenue) },
    ],
    topKitchens: Array.from({ length: 5 }).map((_, index) => {
      const kitchenRevenue = totalRevenue * (0.18 - index * 0.02);
      return {
        name: `Satellite kitchen ${String.fromCharCode(65 + index)}`,
        revenue: round(kitchenRevenue),
        aov: round(avgOrderValue * (1 + random() / 8)),
        fulfillment: round(92 + random() * 6 - index),
        averagePrepTime: Math.max(18, averageDeliveryTime - 8 + index * 2),
      };
    }),
    topDishes: (core?.topDishes || []).map((dish) => ({
      name: dish.name,
      category: dish.category,
      revenue: round(dish.revenue),
      quantity: dish.quantity,
      repeatRate: round(35 + random() * 40),
    })),
    fulfillment: {
      rate: round(93 + random() * 4),
      completed: Math.round(totalOrders * 0.92),
      cancelled: Math.round(totalOrders * 0.04),
      escalated: Math.round(totalOrders * 0.01),
      averageDeliveryTime,
    },
    satisfaction: {
      score: round(4 + random() * 1),
      delta: round(random() * 0.4 - 0.2),
      distribution: {
        promoters: round(62 + random() * 10),
        passives: round(22 + random() * 5),
        detractors: round(10 + random() * 4),
      },
      topComments: [
        "Loved the packaging freshness",
        "Delivery felt faster this week",
        "Please add more vegan dessert options",
      ],
    },
  };

  const sales = {
    cards: buildKpis([
      {
        title: "Net revenue",
        value: toCurrency(totalRevenue * 0.92, currency),
        delta: round(random() * 6 + 2),
      },
      {
        title: "Gross merchandise value",
        value: toCurrency(totalRevenue + core?.totals?.discountGiven || 0, currency),
        delta: round(random() * 3 + 1),
      },
      {
        title: "Refund rate",
        value: `${round(1.2 + random() * 0.8)}%`,
        delta: round(random() * 0.4 - 0.2),
      },
      {
        title: "Repeat order share",
        value: `${round(58 + random() * 9)}%`,
        delta: round(random() * 5 - 2.5),
      },
    ]),
    revenueTrend: overview.revenueTrend,
    categorySales: (core?.categoryBreakdown || []).map((item) => ({
      category: item.category,
      revenue: item.revenue,
      quantity: item.quantity,
      contribution: item.contribution,
    })),
    paymentMethods: [
      { method: "UPI", share: round(42 + random() * 8), revenue: round(totalRevenue * 0.45) },
      { method: "Credit / Debit", share: round(28 + random() * 6), revenue: round(totalRevenue * 0.3) },
      { method: "Cash", share: round(15 + random() * 5), revenue: round(totalRevenue * 0.15) },
      { method: "Wallet", share: round(12 + random() * 4), revenue: round(totalRevenue * 0.1) },
    ],
    couponImpact: {
      discountTotal: round(core?.totals?.discountGiven || totalRevenue * 0.08),
      incrementalOrders: round(totalOrders * 0.12),
      series: (core?.couponPerformance || []).map((coupon, index) => ({
        code: coupon.code,
        orders: coupon.orders,
        discount: coupon.discount,
        revenue: coupon.revenue,
        cannibalization: round(5 + random() * 6 + index),
      })),
    },
    hourlySales: Array.from({ length: 12 }).map((_, index) => ({
      hour: `${index + 9}:00`,
      revenue: round(totalRevenue / 14 + random() * (totalRevenue / 28)),
      orders: Math.round(totalOrders / 12 + random() * 5),
    })),
    funnel: [
      { stage: "Site visits", value: Math.round(totalOrders * 12.5), conversion: "—" },
      { stage: "Menu views", value: Math.round(totalOrders * 7.3), conversion: "58%" },
      { stage: "Cart adds", value: Math.round(totalOrders * 3.4), conversion: "47%" },
      { stage: "Checkouts", value: Math.round(totalOrders * 2.1), conversion: "62%" },
      { stage: "Orders", value: totalOrders, conversion: "71%" },
    ],
    refunds: [
      { reason: "Late delivery", amount: round(totalRevenue * 0.01), percent: 32 },
      { reason: "Packaging issue", amount: round(totalRevenue * 0.007), percent: 22 },
      { reason: "Incorrect order", amount: round(totalRevenue * 0.005), percent: 18 },
      { reason: "Quality complaint", amount: round(totalRevenue * 0.004), percent: 12 },
    ],
  };

  const customers = {
    cards: buildKpis([
      {
        title: "New customers",
        value: Math.round(uniqueCustomers * 0.38).toLocaleString(),
        delta: round(random() * 5 + 2),
      },
      {
        title: "Returning customers",
        value: Math.round(uniqueCustomers * 0.62).toLocaleString(),
        delta: round(random() * 4 - 1),
      },
      {
        title: "Churn risk",
        value: `${round(8 + random() * 3)}%`,
        delta: round(random() * 1.5 - 0.7),
      },
      {
        title: "Customer lifetime value",
        value: toCurrency(avgOrderValue * 9.5, currency),
        delta: round(random() * 6 + 1),
      },
    ]),
    newVsReturning: [
      { label: "New", customers: Math.round(uniqueCustomers * 0.38) },
      { label: "Returning", customers: Math.round(uniqueCustomers * 0.62) },
    ],
    retention: Array.from({ length: 6 }).map((_, index) => ({
      cohort: `Month ${index + 1}`,
      month1: round(62 - index * 4 + random() * 3),
      month2: round(48 - index * 5 + random() * 3),
      month3: round(36 - index * 4 + random() * 3),
      month4: round(28 - index * 3 + random() * 2),
    })),
    ltvSegments: [
      { segment: "Top 5%", value: toCurrency(avgOrderValue * 16, currency) },
      { segment: "Enthusiasts", value: toCurrency(avgOrderValue * 11, currency) },
      { segment: "Regulars", value: toCurrency(avgOrderValue * 7, currency) },
      { segment: "New", value: toCurrency(avgOrderValue * 3.5, currency) },
    ],
    topCustomers: Array.from({ length: 8 }).map((_, index) => ({
      name: `Customer ${createPseudoId("C", index)}`,
      city: ["Mumbai", "Bengaluru", "Hyderabad", "Delhi"][index % 4],
      spend: toCurrency(avgOrderValue * (12 - index), currency),
      orders: 18 - index,
    })),
    demographics: {
      cities: [
        { name: "Mumbai", share: round(32 + random() * 4) },
        { name: "Bengaluru", share: round(24 + random() * 4) },
        { name: "Hyderabad", share: round(18 + random() * 3) },
        { name: "Delhi NCR", share: round(14 + random() * 3) },
        { name: "Pune", share: round(9 + random() * 2) },
      ],
      ageGroups: [
        { range: "18-24", share: 18 },
        { range: "25-34", share: 37 },
        { range: "35-44", share: 24 },
        { range: "45-54", share: 14 },
        { range: "55+", share: 7 },
      ],
    },
    sentimentTrend: Array.from({ length: 8 }).map((_, index) => ({
      month: `M-${index + 1}`,
      positive: round(62 + random() * 6 - index),
      neutral: round(24 + random() * 3),
      negative: round(11 + random() * 2),
    })),
  };

  const operations = {
    cards: buildKpis([
      {
        title: "Avg. prep time",
        value: `${Math.round(averageDeliveryTime - 12)} mins`,
        delta: round(random() * 2 - 1),
      },
      {
        title: "On-time delivery",
        value: `${round(91 + random() * 4)}%`,
        delta: round(random() * 2 - 1),
      },
      {
        title: "Kitchen utilization",
        value: `${round(78 + random() * 7)}%`,
        delta: round(random() * 3 - 1.5),
      },
      {
        title: "Inventory turnover",
        value: `${round(5.6 + random() * 0.8)}x`,
        delta: round(random() * 0.6 - 0.3),
      },
    ]),
    prepTimes: overview.topKitchens.map((kitchen) => ({
      kitchen: kitchen.name,
      avg: kitchen.averagePrepTime,
      min: Math.max(12, kitchen.averagePrepTime - 6),
      max: kitchen.averagePrepTime + 8,
    })),
    deliveryPerformance: {
      onTimePercent: round(91 + random() * 4),
      avgDelayMinutes: round(4 + random() * 2),
      series: buildSparkline(10, 91, 4, random).map((value, index) => ({
        week: `W${index + 1}`,
        onTimeRate: value,
        escalations: Math.round(totalOrders * 0.004 + random() * 6),
      })),
    },
    ordersPerKitchen: overview.topKitchens.map((kitchen, index) => ({
      kitchen: kitchen.name,
      orders: Math.round((totalOrders * (0.22 - index * 0.025)) / 1.2),
      capacity: round(82 + random() * 8 - index * 2),
    })),
    inventoryUtilization: [
      { ingredient: "Basmati rice", usageRate: round(86 + random() * 4) },
      { ingredient: "Cold chain", usageRate: round(71 + random() * 6) },
      { ingredient: "Leafy greens", usageRate: round(64 + random() * 8) },
      { ingredient: "Spice mix", usageRate: round(77 + random() * 5) },
      { ingredient: "Packaging", usageRate: round(83 + random() * 4) },
    ],
    wastage: [
      { category: "Produce", percent: round(3.4 + random()) },
      { category: "Prepared", percent: round(2.1 + random() * 0.8) },
      { category: "Packaging", percent: round(1.6 + random() * 0.4) },
    ],
    idleTime: overview.topKitchens.map((kitchen) => ({
      kitchen: kitchen.name,
      minutes: round(46 + random() * 8),
    })),
    regionHeatmap: [
      { region: "South Mumbai", orders: Math.round(totalOrders * 0.18) },
      { region: "Powai", orders: Math.round(totalOrders * 0.13) },
      { region: "Bandra", orders: Math.round(totalOrders * 0.12) },
      { region: "Navi Mumbai", orders: Math.round(totalOrders * 0.1) },
      { region: "Thane", orders: Math.round(totalOrders * 0.08) },
    ],
  };

  const menu = {
    cards: buildKpis([
      {
        title: "Menu conversion",
        value: `${round(26 + random() * 4)}%`,
        delta: round(random() * 3 - 1),
      },
      {
        title: "Repeat favourite",
        value: `${round(43 + random() * 7)}%`,
        delta: round(random() * 4 - 2),
      },
      {
        title: "New launches success",
        value: `${round(38 + random() * 9)}%`,
        delta: round(random() * 5 - 2),
      },
      {
        title: "Avg. rating",
        value: `${round(4.2 + random() * 0.4)} / 5`,
        delta: round(random() * 0.3 - 0.1),
      },
    ]),
    topSellers: overview.topDishes.slice(0, 5).map((dish) => ({
      name: dish.name,
      revenue: dish.revenue,
      quantity: dish.quantity,
      repeatRate: dish.repeatRate,
    })),
    lowPerformers: Array.from({ length: 4 }).map((_, index) => ({
      name: `Chef special ${index + 1}`,
      contribution: round(1.8 + random() * 1.2),
      feedbackScore: round(3.6 + random() * 0.5),
      action: index % 2 === 0 ? "Refresh visuals" : "Test new pricing",
    })),
    profitMargins: overview.topDishes.slice(0, 6).map((dish, index) => ({
      name: dish.name,
      margin: round(56 - index * 4 + random() * 6),
      foodCost: round(28 + random() * 4),
      popularity: round(82 - index * 6 + random() * 4),
    })),
    feedbackHighlights: [
      { dish: "Nosh Signature Biryani", mentions: 164, sentiment: "positive" },
      { dish: "Smoked Butter Paneer", mentions: 147, sentiment: "positive" },
      { dish: "Vegan Tofu Bowl", mentions: 88, sentiment: "mixed" },
      { dish: "Dark Chocolate Pot", mentions: 73, sentiment: "positive" },
    ],
    experimentation: [
      { name: "Weeknight combo pricing", uplift: `${round(7 + random() * 4)}%`, status: "Live" },
      { name: "Dessert add-on nudges", uplift: `${round(11 + random() * 5)}%`, status: "Live" },
      { name: "Express lunch menus", uplift: `${round(5 + random() * 3)}%`, status: "Pilot" },
      { name: "Chef video stories", uplift: `${round(3 + random() * 2)}%`, status: "Planned" },
    ],
  };

  const marketing = {
    cards: buildKpis([
      {
        title: "ROAS",
        value: `${round(4.7 + random() * 0.6)}x`,
        delta: round(random() * 0.5 - 0.25),
      },
      {
        title: "CAC",
        value: toCurrency(avgOrderValue * 0.35, currency),
        delta: round(random() * 4 - 1.5),
      },
      {
        title: "Organic share",
        value: `${round(46 + random() * 7)}%`,
        delta: round(random() * 5 - 2),
      },
      {
        title: "Campaign conversion",
        value: `${round(3.8 + random() * 0.9)}%`,
        delta: round(random() * 0.6 - 0.2),
      },
    ]),
    promotions: [
      { name: "Weekend Feast", status: "Live", uplift: `${round(14 + random() * 4)}%`, aov: toCurrency(avgOrderValue * 1.15, currency) },
      { name: "Corporate Express", status: "Scaling", uplift: `${round(18 + random() * 4)}%`, aov: toCurrency(avgOrderValue * 1.22, currency) },
      { name: "Vegan Discovery", status: "Live", uplift: `${round(9 + random() * 3)}%`, aov: toCurrency(avgOrderValue * 0.96, currency) },
      { name: "Dessert Nights", status: "Planned", uplift: `${round(7 + random() * 2)}%`, aov: toCurrency(avgOrderValue * 1.05, currency) },
    ],
    acquisition: [
      { channel: "Paid search", newUsers: Math.round(uniqueCustomers * 0.2), cac: toCurrency(avgOrderValue * 0.42, currency) },
      { channel: "Influencer", newUsers: Math.round(uniqueCustomers * 0.16), cac: toCurrency(avgOrderValue * 0.38, currency) },
      { channel: "Referral", newUsers: Math.round(uniqueCustomers * 0.14), cac: toCurrency(avgOrderValue * 0.18, currency) },
      { channel: "Organic", newUsers: Math.round(uniqueCustomers * 0.24), cac: "—" },
    ],
    revenueUplift: buildSparkline(10, totalRevenue / rangeDays, totalRevenue / rangeDays / 2, random).map(
      (value, index) => ({
        week: `W${index + 1}`,
        uplift: round(value * (0.12 + random() * 0.02)),
      })
    ),
    engagement: [
      { channel: "Email - menu stories", rate: `${round(28 + random() * 6)}%` },
      { channel: "Push - 6pm slot", rate: `${round(36 + random() * 7)}%` },
      { channel: "WhatsApp reorder", rate: `${round(52 + random() * 8)}%` },
      { channel: "SMS retention", rate: `${round(19 + random() * 4)}%` },
    ],
    funnel: [
      { stage: "Reach", value: Math.round(uniqueCustomers * 62), conversion: "100%" },
      { stage: "Click", value: Math.round(uniqueCustomers * 21), conversion: `${round(34 + random() * 4)}%` },
      { stage: "Landing", value: Math.round(uniqueCustomers * 13), conversion: `${round(62 + random() * 6)}%` },
      { stage: "Trial", value: Math.round(uniqueCustomers * 6), conversion: `${round(48 + random() * 5)}%` },
      { stage: "Repeat", value: Math.round(uniqueCustomers * 3.1), conversion: `${round(51 + random() * 6)}%` },
    ],
  };

  const financial = {
    cards: buildKpis([
      {
        title: "Contribution margin",
        value: `${round(41 + random() * 4)}%`,
        delta: round(random() * 3 - 1),
      },
      {
        title: "EBITDA",
        value: toCurrency(totalRevenue * 0.18, currency),
        delta: round(random() * 4 - 1.5),
      },
      {
        title: "Burn multiple",
        value: `${round(1.3 + random() * 0.3)}x`,
        delta: round(random() * 0.3 - 0.15),
      },
      {
        title: "Runway",
        value: `${round(14 + random() * 3)} months`,
        delta: round(random() * 1.5 - 0.7),
      },
    ]),
    costBreakdown: [
      { category: "Cost of goods", amount: round(totalRevenue * 0.36), percent: 36 },
      { category: "Delivery ops", amount: round(totalRevenue * 0.18), percent: 18 },
      { category: "Marketing", amount: round(totalRevenue * 0.14), percent: 14 },
      { category: "Kitchen ops", amount: round(totalRevenue * 0.11), percent: 11 },
      { category: "Tech & platform", amount: round(totalRevenue * 0.08), percent: 8 },
      { category: "Support & refunds", amount: round(totalRevenue * 0.05), percent: 5 },
    ],
    profitTrend: buildSparkline(6, totalRevenue * 0.18, totalRevenue * 0.05, random).map(
      (value, index) => ({
        month: `M${index + 1}`,
        grossMargin: round(42 + random() * 4),
        netMargin: round(18 + random() * 3),
        contribution: round(value),
      })
    ),
    revenuePerOutlet: overview.topKitchens.map((kitchen) => ({
      outlet: kitchen.name,
      revenue: kitchen.revenue,
      cost: round(kitchen.revenue * 0.62),
      profit: round(kitchen.revenue * 0.38),
    })),
    cashFlow: buildSparkline(6, totalRevenue * 0.9, totalRevenue * 0.3, random).map(
      (value, index) => ({
        month: `M${index + 1}`,
        inflow: round(value),
        outflow: round(value * (0.78 + random() * 0.1)),
      })
    ),
  };

  const technical = {
    cards: buildKpis([
      {
        title: "API uptime",
        value: `${round(99.84 + random() * 0.08)}%`,
        delta: round(random() * 0.03 - 0.015),
      },
      {
        title: "App crash rate",
        value: `${round(0.42 + random() * 0.2)}%`,
        delta: round(random() * 0.1 - 0.05),
      },
      {
        title: "P95 latency",
        value: `${round(380 + random() * 60)} ms`,
        delta: round(random() * 25 - 12),
      },
      {
        title: "Error budget",
        value: `${round(91 + random() * 3)}% remaining`,
        delta: round(random() * 2 - 1),
      },
    ]),
    apiPerformance: [
      { endpoint: "POST /api/order/add", p95: 512, p99: 743, throughput: 164 },
      { endpoint: "GET /api/menu", p95: 184, p99: 266, throughput: 612 },
      { endpoint: "GET /api/analytics", p95: 286, p99: 401, throughput: 94 },
      { endpoint: "POST /api/payment/verify", p95: 348, p99: 498, throughput: 131 },
    ],
    errorRates: [
      { service: "Admin dashboard", rate: `${round(0.28 + random() * 0.1)}%` },
      { service: "Consumer app", rate: `${round(0.46 + random() * 0.15)}%` },
      { service: "Delivery app", rate: `${round(0.32 + random() * 0.09)}%` },
      { service: "Webhook", rate: `${round(0.11 + random() * 0.07)}%` },
    ],
    downtime: [
      { incident: "Apr 6 API gateway", duration: "11 mins", resolvedAt: "SRE on-call" },
      { incident: "Apr 14 Payment webhook", duration: "7 mins", resolvedAt: "Partner fix" },
    ],
    traffic: Array.from({ length: 12 }).map((_, index) => ({
      hour: `${index + 9}:00`,
      sessions: Math.round(620 + random() * 120),
      conversions: Math.round(92 + random() * 24),
    })),
    uptime: {
      overall: `${round(99.78 + random() * 0.12)}%`,
      incidents: 3,
      mttrMinutes: round(12 + random() * 4),
      mtbfHours: round(216 + random() * 46),
    },
  };

  const investor = {
    summary: {
      revenue: toCurrency(totalRevenue, currency),
      growth: `${round(core?.growth?.revenue || random() * 6 + 4)}% QoQ`,
      margin: `${round(18 + random() * 3)}% net`,
      headline: "Strong retention in premium cohort drive profitability expansion",
    },
    highlights: [
      "Two new dark kitchens launched with 6 week payback trajectory",
      "Corporate meal program contributing 14% of revenue with 24% MoM growth",
      "Net promoter score sustained at 61 with improved delivery experience",
      "Menu innovation pipeline built for festive quarter with 9 launches",
    ],
    challenges: [
      "Leafy greens supply price volatility impacting margins by 120 bps",
      "Evening delivery surge causing SLA deviations on peak Thursdays",
    ],
    forecast: [
      { quarter: "Q2", revenue: toCurrency(totalRevenue * 1.08, currency), profitMargin: "19%" },
      { quarter: "Q3", revenue: toCurrency(totalRevenue * 1.18, currency), profitMargin: "21%" },
      { quarter: "Q4", revenue: toCurrency(totalRevenue * 1.27, currency), profitMargin: "23%" },
    ],
    kpis: [
      { label: "LTV/CAC", value: `${round(4.2 + random() * 0.6)}x` },
      { label: "Monthly burn", value: toCurrency(totalRevenue * 0.18, currency) },
      { label: "Payback period", value: `${round(6.5 + random() * 0.8)} months` },
      { label: "Churn", value: `${round(3.6 + random() * 0.9)}%` },
    ],
  };

  const predictive = {
    cards: buildKpis([
      {
        title: "Projected revenue (next 30d)",
        value: toCurrency(totalRevenue * 1.12, currency),
        delta: round(random() * 6 + 3),
      },
      {
        title: "High-risk customers",
        value: `${Math.round(uniqueCustomers * 0.08)} profiles`,
        delta: round(random() * 4 - 2),
      },
      {
        title: "Inventory alerts",
        value: `${operations.inventoryUtilization.length} items`,
        delta: round(random() * 3 - 1),
      },
      {
        title: "Suggested price changes",
        value: "5 menu items",
        delta: 0,
      },
    ]),
    salesForecast: buildSparkline(14, totalRevenue / rangeDays, totalRevenue / rangeDays / 2, random).map(
      (value, index) => ({
        date: index + 1,
        revenue: round(value * 1.05),
        orders: Math.round(totalOrders / rangeDays + random() * 3),
      })
    ),
    churnRisk: [
      { segment: "Corporate", customers: Math.round(uniqueCustomers * 0.18), risk: "Low" },
      { segment: "Weekend only", customers: Math.round(uniqueCustomers * 0.22), risk: "Medium" },
      { segment: "Value seekers", customers: Math.round(uniqueCustomers * 0.16), risk: "High" },
      { segment: "Premium", customers: Math.round(uniqueCustomers * 0.12), risk: "Low" },
    ],
    demandAlerts: overview.topDishes.slice(0, 5).map((dish) => ({
      dish: dish.name,
      upcomingPeak: `${round(24 + random() * 8)}% above baseline`,
      recommendedPrep: round(dish.quantity * 1.35),
    })),
    pricingSuggestions: overview.topDishes.slice(0, 5).map((dish, index) => ({
      dish: dish.name,
      current: toCurrency(dish.revenue / Math.max(1, dish.quantity), currency),
      suggested: toCurrency((dish.revenue / Math.max(1, dish.quantity)) * (1 + (index % 2 === 0 ? 0.06 : -0.04)), currency),
      rationale: index % 2 === 0 ? "High repeat rate" : "Price sensitive cohort",
    })),
    anomalies: [
      { date: "Week 2", metric: "Delivery delay", impact: "+8 mins", status: "Resolved" },
      { date: "Week 3", metric: "Payment gateway", impact: "12% drop", status: "Monitoring" },
    ],
  };

  return {
    overview,
    sales,
    customers,
    operations,
    menu,
    marketing,
    financial,
    technical,
    investor,
    predictive,
  };
};
