export const calculateDiscountAmount = (coupon, subtotal) => {
  if (!coupon || typeof subtotal !== "number" || subtotal <= 0) return 0;

  let discount = 0;
  if (coupon.discountType === "flat") {
    discount = coupon.discountValue;
  } else {
    discount = (subtotal * coupon.discountValue) / 100;
  }

  if (
    coupon.maxDiscountValue !== null &&
    coupon.maxDiscountValue !== undefined
  ) {
    discount = Math.min(discount, coupon.maxDiscountValue);
  }

  return Math.max(0, Math.min(discount, subtotal));
};

export const validateCouponEligibility = (coupon, subtotal, userId) => {
  if (!coupon) {
    return { valid: false, message: "Coupon not found" };
  }
  if (!coupon.active) {
    return { valid: false, message: "This coupon is currently inactive" };
  }

  const now = new Date();
  if (coupon.startDate && now < coupon.startDate) {
    return { valid: false, message: "This coupon isn't live yet" };
  }
  if (coupon.endDate && now > coupon.endDate) {
    return { valid: false, message: "This coupon has expired" };
  }

  if (typeof subtotal !== "number" || subtotal <= 0) {
    return {
      valid: false,
      message: "Add dishes to your cart before applying a coupon",
    };
  }

  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
    return {
      valid: false,
      message: `Requires a minimum order of ₹${coupon.minOrderAmount}`,
    };
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usageLimit !== undefined &&
    coupon.usageCount >= coupon.usageLimit
  ) {
    return {
      valid: false,
      message: "This coupon has reached its maximum redemptions",
    };
  }

  if (coupon.perUserLimit && userId) {
    const usageMap = coupon.userUsages;
    const currentUsage =
      typeof usageMap?.get === "function"
        ? usageMap.get(userId)
        : usageMap?.[userId];
    if ((currentUsage || 0) >= coupon.perUserLimit) {
      return {
        valid: false,
        message: "You've already used this coupon the maximum number of times",
      };
    }
  }

  return { valid: true, message: "Coupon applied" };
};
