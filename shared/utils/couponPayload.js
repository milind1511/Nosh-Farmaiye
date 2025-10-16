const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

export const coerceNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const parseBooleanInput = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  return undefined;
};

export const parseDateInput = (value) => {
  if (value === undefined) return { provided: false, value: undefined };
  if (value === null || value === "") return { provided: true, value: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { provided: true, error: "invalid" };
  }
  return { provided: true, value: date };
};

export const buildCreatePayload = (payload = {}) => {
  const errors = [];
  const data = {};

  const code = payload.code?.toString().trim().toUpperCase();
  if (!code) {
    errors.push("Coupon code is required");
  } else {
    data.code = code;
  }

  const label = payload.label?.toString().trim();
  if (!label) {
    errors.push("Coupon label is required");
  } else {
    data.label = label;
  }

  data.description = payload.description?.toString().trim() || "";

  const discountType =
    payload.discountType && ["percentage", "flat"].includes(payload.discountType)
      ? payload.discountType
      : "percentage";
  data.discountType = discountType;

  const discountValue = coerceNumber(payload.discountValue);
  if (discountValue === undefined || discountValue <= 0) {
    errors.push("Discount value must be greater than zero");
  } else {
    data.discountValue = discountValue;
  }

  const minOrderAmount = coerceNumber(payload.minOrderAmount);
  data.minOrderAmount = minOrderAmount === undefined ? 0 : Math.max(0, minOrderAmount);

  if (payload.maxDiscountValue === null || payload.maxDiscountValue === "") {
    data.maxDiscountValue = null;
  } else {
    const maxDiscountValue = coerceNumber(payload.maxDiscountValue);
    if (maxDiscountValue !== undefined && maxDiscountValue >= 0) {
      data.maxDiscountValue = maxDiscountValue;
    } else if (maxDiscountValue !== undefined) {
      errors.push("Max discount must be zero or more");
    } else {
      data.maxDiscountValue = null;
    }
  }

  const startDate = parseDateInput(payload.startDate);
  if (startDate.error === "invalid") {
    errors.push("Invalid start date");
  } else if (startDate.provided) {
    data.startDate = startDate.value;
  } else {
    data.startDate = null;
  }

  const endDate = parseDateInput(payload.endDate);
  if (endDate.error === "invalid") {
    errors.push("Invalid end date");
  } else if (endDate.provided) {
    data.endDate = endDate.value;
  } else {
    data.endDate = null;
  }

  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    errors.push("End date must be after the start date");
  }

  const active = parseBooleanInput(payload.active);
  data.active = active === undefined ? true : active;

  if (payload.usageLimit === null || payload.usageLimit === "") {
    data.usageLimit = null;
  } else {
    const usageLimit = coerceNumber(payload.usageLimit);
    if (usageLimit === undefined || usageLimit < 1) {
      errors.push("Usage limit must be at least 1 or left blank");
    } else {
      data.usageLimit = usageLimit;
    }
  }

  const perUserLimit = coerceNumber(payload.perUserLimit);
  if (perUserLimit === undefined) {
    data.perUserLimit = 1;
  } else if (perUserLimit < 1) {
    errors.push("Per-user limit must be at least 1");
  } else {
    data.perUserLimit = perUserLimit;
  }

  return { data, errors };
};

export const buildUpdatePayload = (payload = {}) => {
  const errors = [];
  const data = {};

  if (hasOwn(payload, "code")) {
    const code = payload.code?.toString().trim().toUpperCase();
    if (!code) {
      errors.push("Coupon code cannot be empty");
    } else {
      data.code = code;
    }
  }

  if (hasOwn(payload, "label")) {
    const label = payload.label?.toString().trim();
    if (!label) {
      errors.push("Coupon label cannot be empty");
    } else {
      data.label = label;
    }
  }

  if (hasOwn(payload, "description")) {
    data.description = payload.description?.toString().trim() || "";
  }

  if (hasOwn(payload, "discountType")) {
    const discountType = ["percentage", "flat"].includes(payload.discountType)
      ? payload.discountType
      : null;
    if (!discountType) {
      errors.push("Invalid discount type");
    } else {
      data.discountType = discountType;
    }
  }

  if (hasOwn(payload, "discountValue")) {
    const discountValue = coerceNumber(payload.discountValue);
    if (discountValue === undefined || discountValue <= 0) {
      errors.push("Discount value must be greater than zero");
    } else {
      data.discountValue = discountValue;
    }
  }

  if (hasOwn(payload, "minOrderAmount")) {
    const minOrderAmount = coerceNumber(payload.minOrderAmount);
    if (minOrderAmount === undefined || minOrderAmount < 0) {
      errors.push("Minimum order amount must be zero or more");
    } else {
      data.minOrderAmount = minOrderAmount;
    }
  }

  if (hasOwn(payload, "maxDiscountValue")) {
    if (payload.maxDiscountValue === null || payload.maxDiscountValue === "") {
      data.maxDiscountValue = null;
    } else {
      const maxDiscountValue = coerceNumber(payload.maxDiscountValue);
      if (maxDiscountValue === undefined || maxDiscountValue < 0) {
        errors.push("Max discount must be zero or more");
      } else {
        data.maxDiscountValue = maxDiscountValue;
      }
    }
  }

  if (hasOwn(payload, "startDate")) {
    const startDate = parseDateInput(payload.startDate);
    if (startDate.error === "invalid") {
      errors.push("Invalid start date");
    } else {
      data.startDate = startDate.provided ? startDate.value : undefined;
    }
  }

  if (hasOwn(payload, "endDate")) {
    const endDate = parseDateInput(payload.endDate);
    if (endDate.error === "invalid") {
      errors.push("Invalid end date");
    } else {
      data.endDate = endDate.provided ? endDate.value : undefined;
    }
  }

  if (hasOwn(payload, "startDate") && hasOwn(payload, "endDate")) {
    const startDateValue =
      Object.prototype.hasOwnProperty.call(data, "startDate") ? data.startDate : undefined;
    const endDateValue =
      Object.prototype.hasOwnProperty.call(data, "endDate") ? data.endDate : undefined;
    if (
      startDateValue instanceof Date &&
      endDateValue instanceof Date &&
      endDateValue < startDateValue
    ) {
      errors.push("End date must be after the start date");
    }
  }

  if (hasOwn(payload, "active")) {
    const active = parseBooleanInput(payload.active);
    if (active === undefined) {
      errors.push("Active flag must be true or false");
    } else {
      data.active = active;
    }
  }

  if (hasOwn(payload, "usageLimit")) {
    if (payload.usageLimit === null || payload.usageLimit === "") {
      data.usageLimit = null;
    } else {
      const usageLimit = coerceNumber(payload.usageLimit);
      if (usageLimit === undefined || usageLimit < 1) {
        errors.push("Usage limit must be at least 1 or left blank");
      } else {
        data.usageLimit = usageLimit;
      }
    }
  }

  if (hasOwn(payload, "perUserLimit")) {
    const perUserLimit = coerceNumber(payload.perUserLimit);
    if (perUserLimit === undefined || perUserLimit < 1) {
      errors.push("Per-user limit must be at least 1");
    } else {
      data.perUserLimit = perUserLimit;
    }
  }

  return { data, errors };
};

export const buildCouponResponse = (coupon) => ({
  id: coupon._id,
  code: coupon.code,
  label: coupon.label,
  description: coupon.description,
  discountType: coupon.discountType,
  discountValue: coupon.discountValue,
  minOrderAmount: coupon.minOrderAmount,
  maxDiscountValue: coupon.maxDiscountValue,
  startDate: coupon.startDate,
  endDate: coupon.endDate,
  active: coupon.active,
  usageLimit: coupon.usageLimit,
  usageCount: coupon.usageCount,
  perUserLimit: coupon.perUserLimit,
  createdAt: coupon.createdAt,
  updatedAt: coupon.updatedAt,
});

export { hasOwn };
