import { test } from "node:test";
import assert from "node:assert/strict";
import {
  coerceNumber,
  parseBooleanInput,
  parseDateInput,
  buildCreatePayload,
  buildUpdatePayload,
} from "../utils/couponPayload.js";

test("coerceNumber handles numeric and blank values", () => {
  assert.equal(coerceNumber("42"), 42);
  assert.equal(coerceNumber(0), 0);
  assert.equal(coerceNumber(""), undefined);
  assert.equal(coerceNumber(undefined), undefined);
  assert.equal(coerceNumber("abc"), undefined);
});

test("parseBooleanInput normalises common truthy and falsy strings", () => {
  assert.equal(parseBooleanInput(true), true);
  assert.equal(parseBooleanInput("YES"), true);
  assert.equal(parseBooleanInput("0"), false);
  assert.equal(parseBooleanInput("maybe"), undefined);
  assert.equal(parseBooleanInput(undefined), undefined);
});

test("parseDateInput tracks provided flags and errors", () => {
  const missing = parseDateInput(undefined);
  assert.deepEqual(missing, { provided: false, value: undefined });

  const blank = parseDateInput("");
  assert.deepEqual(blank, { provided: true, value: null });

  const valid = parseDateInput("2024-05-01");
  assert.equal(valid.provided, true);
  assert.equal(valid.value instanceof Date, true);

  const invalid = parseDateInput("not-a-date");
  assert.equal(invalid.error, "invalid");
});

test("buildCreatePayload returns data with defaults when valid", () => {
  const { data, errors } = buildCreatePayload({
    code: "fest25",
    label: "Festive 25",
    description: "25% off",
    discountType: "percentage",
    discountValue: 25,
    minOrderAmount: 500,
    maxDiscountValue: 150,
    startDate: "2024-10-01",
    endDate: "2024-10-31",
    active: "true",
    usageLimit: 200,
    perUserLimit: 2,
  });

  assert.deepEqual(errors, []);
  assert.equal(data.code, "FEST25");
  assert.equal(data.label, "Festive 25");
  assert.equal(data.description, "25% off");
  assert.equal(data.discountType, "percentage");
  assert.equal(data.discountValue, 25);
  assert.equal(data.minOrderAmount, 500);
  assert.equal(data.maxDiscountValue, 150);
  assert.equal(data.active, true);
  assert.equal(data.usageLimit, 200);
  assert.equal(data.perUserLimit, 2);
  assert.equal(data.startDate instanceof Date, true);
  assert.equal(data.endDate instanceof Date, true);
});

test("buildCreatePayload surfaces first validation error", () => {
  const { data, errors } = buildCreatePayload({
    code: " ",
    label: "",
    discountValue: 0,
  });

  assert.equal(data.code, undefined);
  assert.equal(errors[0], "Coupon code is required");
  assert.ok(errors.includes("Coupon label is required"));
  assert.ok(errors.includes("Discount value must be greater than zero"));
});

test("buildCreatePayload rejects inverted date ranges", () => {
  const { errors } = buildCreatePayload({
    code: "fest25",
    label: "Festive 25",
    discountValue: 20,
    startDate: "2024-10-31",
    endDate: "2024-10-01",
  });

  assert.ok(errors.includes("End date must be after the start date"));
});

test("buildUpdatePayload validates numeric limits and optional fields", () => {
  const { data, errors } = buildUpdatePayload({
    code: " monsoon50 ",
    discountValue: "50",
    minOrderAmount: "750",
    maxDiscountValue: "",
    usageLimit: null,
    startDate: "2024-06-01",
    endDate: "2024-07-01",
    active: "false",
    perUserLimit: 3,
  });

  assert.deepEqual(errors, []);
  assert.equal(data.code, "MONSOON50");
  assert.equal(data.discountValue, 50);
  assert.equal(data.minOrderAmount, 750);
  assert.equal(data.maxDiscountValue, null);
  assert.equal(data.usageLimit, null);
  assert.equal(data.active, false);
  assert.equal(data.perUserLimit, 3);
  assert.equal(data.startDate instanceof Date, true);
  assert.equal(data.endDate instanceof Date, true);
});

test("buildUpdatePayload catches invalid updates", () => {
  const { errors } = buildUpdatePayload({
    discountValue: "-10",
    minOrderAmount: "-5",
    perUserLimit: 0,
    active: "maybe",
    startDate: "bad",
    endDate: "bad",
  });

  assert.ok(errors.includes("Discount value must be greater than zero"));
  assert.ok(errors.includes("Minimum order amount must be zero or more"));
  assert.ok(errors.includes("Per-user limit must be at least 1"));
  assert.ok(errors.includes("Active flag must be true or false"));
  assert.ok(errors.includes("Invalid start date"));
  assert.ok(errors.includes("Invalid end date"));
});

test("buildUpdatePayload flags inverted date range when both provided", () => {
  const { errors } = buildUpdatePayload({
    startDate: "2024-07-10",
    endDate: "2024-07-01",
  });

  assert.ok(errors.includes("End date must be after the start date"));
});
