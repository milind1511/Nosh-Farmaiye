import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateDiscountAmount,
  validateCouponEligibility,
} from "../utils/couponUtils.js";

const makeCoupon = (overrides = {}) => ({
  discountType: "percentage",
  discountValue: 20,
  maxDiscountValue: null,
  minOrderAmount: 0,
  active: true,
  startDate: null,
  endDate: null,
  usageLimit: null,
  usageCount: 0,
  perUserLimit: 2,
  userUsages: new Map(),
  ...overrides,
});

test("calculateDiscountAmount applies percentage discounts", () => {
  const coupon = makeCoupon({ discountType: "percentage", discountValue: 25 });
  const amount = calculateDiscountAmount(coupon, 1000);
  assert.equal(amount, 250);
});

test("calculateDiscountAmount respects max discount caps", () => {
  const coupon = makeCoupon({
    discountType: "percentage",
    discountValue: 50,
    maxDiscountValue: 150,
  });
  const amount = calculateDiscountAmount(coupon, 1000);
  assert.equal(amount, 150);
});

test("calculateDiscountAmount never exceeds subtotal", () => {
  const coupon = makeCoupon({ discountType: "flat", discountValue: 500 });
  const amount = calculateDiscountAmount(coupon, 300);
  assert.equal(amount, 300);
});

test("validateCouponEligibility rejects inactive coupons", () => {
  const coupon = makeCoupon({ active: false });
  const result = validateCouponEligibility(coupon, 500, "user-1");
  assert.deepEqual(result, {
    valid: false,
    message: "This coupon is currently inactive",
  });
});

test("validateCouponEligibility enforces start date window", () => {
  const futureDate = new Date(Date.now() + 86400000);
  const coupon = makeCoupon({ startDate: futureDate });
  const result = validateCouponEligibility(coupon, 500, "user-1");
  assert.deepEqual(result, {
    valid: false,
    message: "This coupon isn't live yet",
  });
});

test("validateCouponEligibility enforces end date window", () => {
  const pastDate = new Date(Date.now() - 86400000);
  const coupon = makeCoupon({ endDate: pastDate });
  const result = validateCouponEligibility(coupon, 500, "user-1");
  assert.deepEqual(result, {
    valid: false,
    message: "This coupon has expired",
  });
});

test("validateCouponEligibility enforces minimum order amount", () => {
  const coupon = makeCoupon({ minOrderAmount: 750 });
  const result = validateCouponEligibility(coupon, 500, "user-1");
  assert.deepEqual(result, {
    valid: false,
    message: "Requires a minimum order of ₹750",
  });
});

test("validateCouponEligibility blocks once global usage limit is reached", () => {
  const coupon = makeCoupon({ usageLimit: 10, usageCount: 10 });
  const result = validateCouponEligibility(coupon, 900, "user-1");
  assert.deepEqual(result, {
    valid: false,
    message: "This coupon has reached its maximum redemptions",
  });
});

test("validateCouponEligibility blocks when per-user limit reached", () => {
  const coupon = makeCoupon({
    perUserLimit: 1,
    userUsages: new Map([["user-1", 1]]),
  });
  const result = validateCouponEligibility(coupon, 900, "user-1");
  assert.deepEqual(result, {
    valid: false,
    message: "You've already used this coupon the maximum number of times",
  });
});

test("validateCouponEligibility accepts a valid coupon", () => {
  const coupon = makeCoupon({
    discountType: "flat",
    discountValue: 150,
    userUsages: new Map(),
  });
  const result = validateCouponEligibility(coupon, 900, "user-1");
  assert.deepEqual(result, {
    valid: true,
    message: "Coupon applied",
  });
});
