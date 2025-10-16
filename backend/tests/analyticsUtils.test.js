import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toNumberOrNull,
  clampRange,
  round2,
  parseDateValue,
  normalizeDateBoundaries,
  computePercentChange,
  formatTimeline,
  formatCategoryBreakdown,
  formatRecentOrders,
} from "../utils/analyticsUtils.js";

test("toNumberOrNull converts numeric inputs and rejects invalid ones", () => {
  assert.equal(toNumberOrNull("42"), 42);
  assert.equal(toNumberOrNull(0), 0);
  assert.equal(toNumberOrNull(""), null);
  assert.equal(toNumberOrNull(undefined), null);
  assert.equal(toNumberOrNull("abc"), null);
});

test("clampRange enforces bounds between 1 and 365", () => {
  assert.equal(clampRange(undefined), 30);
  assert.equal(clampRange(0), 30);
  assert.equal(clampRange(-5), 1);
  assert.equal(clampRange(10), 10);
  assert.equal(clampRange(500), 365);
});

test("round2 consistently rounds to two decimal places", () => {
  assert.equal(round2(12.345), 12.35);
  assert.equal(round2(12.344), 12.34);
});

test("parseDateValue returns Date instances or null", () => {
  assert.equal(parseDateValue(null), null);
  assert.equal(parseDateValue(""), null);
  const date = parseDateValue("2024-08-15");
  assert.equal(date instanceof Date, true);
  assert.equal(parseDateValue("invalid"), null);
});

test("normalizeDateBoundaries derives current range and previous window", () => {
  const startSeed = new Date(Date.UTC(2024, 8, 1));
  const endSeed = new Date(Date.UTC(2024, 8, 7));
  const { start, end, previousStart, previousEnd, rangeMs } =
    normalizeDateBoundaries(startSeed, endSeed, 7);

  const expectedStart = new Date(startSeed);
  expectedStart.setHours(0, 0, 0, 0);
  const expectedEnd = new Date(endSeed);
  expectedEnd.setHours(23, 59, 59, 999);

  assert.equal(start.getTime(), expectedStart.getTime());
  assert.equal(end.getTime(), expectedEnd.getTime());

  const days = Math.floor(rangeMs / 86400000) + 1;
  assert.equal(days, 7);
  const expectedPreviousEnd = new Date(expectedStart.getTime() - 1);
  const expectedPreviousStart = new Date(expectedPreviousEnd.getTime() - rangeMs);
  expectedPreviousStart.setHours(0, 0, 0, 0);

  assert.equal(previousEnd.getTime(), expectedPreviousEnd.getTime());
  assert.equal(previousStart.getTime(), expectedPreviousStart.getTime());
});

test("computePercentChange handles null baselines and rounding", () => {
  assert.equal(computePercentChange(200, 100), 100);
  assert.equal(computePercentChange(105, 100), 5);
  assert.equal(computePercentChange(100, 0), null);
});

test("formatTimeline normalises revenue and retains order counts", () => {
  const timeline = formatTimeline([
    { _id: "2024-09-01", revenue: 123.456, orders: 3 },
  ]);
  assert.deepEqual(timeline, [{ date: "2024-09-01", revenue: 123.46, orders: 3 }]);
});

test("formatCategoryBreakdown computes revenue share", () => {
  const breakdown = formatCategoryBreakdown(
    [
      { _id: "Biryani", revenue: 400, quantity: 10 },
      { _id: "Dessert", revenue: 100, quantity: 5 },
    ],
    500
  );
  assert.deepEqual(breakdown, [
    { category: "Biryani", revenue: 400, quantity: 10, share: 80 },
    { category: "Dessert", revenue: 100, quantity: 5, share: 20 },
  ]);
});

test("formatRecentOrders rounds amounts and trims items", () => {
  const formatted = formatRecentOrders([
    {
      _id: "order1",
      date: new Date("2024-09-10"),
      status: "paid",
      amount: 199.995,
      discount: 20.004,
      deliveryFee: 29.999,
      couponCode: "FEST20",
      items: Array.from({ length: 8 }).map((_, index) => ({
        name: `Dish ${index}`,
        quantity: 1,
      })),
    },
  ]);

  assert.equal(formatted[0].amount, 200);
  assert.equal(formatted[0].discount, 20);
  assert.equal(formatted[0].gross, 220);
  assert.equal(formatted[0].deliveryFee, 30);
  assert.equal(formatted[0].items.length, 6);
});
