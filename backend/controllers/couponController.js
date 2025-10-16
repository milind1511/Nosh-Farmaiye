import couponModel from "../models/couponModel.js";
import userModel from "../models/userModel.js";
import {
  calculateDiscountAmount,
  validateCouponEligibility,
} from "../utils/couponUtils.js";
import {
  buildCreatePayload,
  buildUpdatePayload,
  buildCouponResponse,
} from "../utils/couponPayload.js";

const isAdminUser = async (userId) => {
  if (!userId) return false;
  const user = await userModel.findById(userId);
  return Boolean(user && user.role === "admin");
};

const createCoupon = async (req, res) => {
  try {
    if (!(await isAdminUser(req.body.userId))) {
      return res.json({ success: false, message: "You are not admin" });
    }

    const { data, errors } = buildCreatePayload(req.body);
    if (errors.length) {
      return res.json({ success: false, message: errors[0], errors });
    }

    const coupon = await couponModel.create({ ...data, createdBy: req.body.userId });

    return res.json({ success: true, data: buildCouponResponse(coupon) });
  } catch (error) {
    console.log(error);
    if (error.code === 11000) {
      return res.json({ success: false, message: "Coupon code already exists" });
    }
    return res.json({ success: false, message: "Unable to create coupon" });
  }
};

const listCoupons = async (req, res) => {
  try {
    if (!(await isAdminUser(req.body.userId))) {
      return res.json({ success: false, message: "You are not admin" });
    }

    const coupons = await couponModel.find({}).sort({ createdAt: -1 });
    return res.json({
      success: true,
      data: coupons.map(buildCouponResponse),
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: "Unable to fetch coupons" });
  }
};

const updateCoupon = async (req, res) => {
  try {
    if (!(await isAdminUser(req.body.userId))) {
      return res.json({ success: false, message: "You are not admin" });
    }

    const { couponId } = req.params;
    if (!couponId) {
      return res.json({ success: false, message: "Coupon identifier missing" });
    }

    const { data, errors } = buildUpdatePayload(req.body);
    if (errors.length) {
      return res.json({ success: false, message: errors[0], errors });
    }

    if (!Object.keys(data).length) {
      return res.json({ success: false, message: "No updates provided" });
    }

    const coupon = await couponModel.findByIdAndUpdate(couponId, { $set: data }, { new: true });

    if (!coupon) {
      return res.json({ success: false, message: "Coupon not found" });
    }

    return res.json({ success: true, data: buildCouponResponse(coupon) });
  } catch (error) {
    console.log(error);
    if (error.code === 11000) {
      return res.json({ success: false, message: "Coupon code already exists" });
    }
    return res.json({ success: false, message: "Unable to update coupon" });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    if (!(await isAdminUser(req.body.userId))) {
      return res.json({ success: false, message: "You are not admin" });
    }

    const { couponId } = req.params;
    if (!couponId) {
      return res.json({ success: false, message: "Coupon identifier missing" });
    }

    const deleted = await couponModel.findByIdAndDelete(couponId);
    if (!deleted) {
      return res.json({ success: false, message: "Coupon not found" });
    }

    return res.json({ success: true, message: "Coupon removed" });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: "Unable to remove coupon" });
  }
};

const validateCoupon = async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const subtotalNumber = Number(subtotal);

    if (!code || !code.trim()) {
      return res.json({ success: false, message: "Enter a coupon code" });
    }

    if (Number.isNaN(subtotalNumber)) {
      return res.json({ success: false, message: "Invalid order total" });
    }

    const coupon = await couponModel.findOne({ code: code.trim().toUpperCase() });
    const eligibility = validateCouponEligibility(
      coupon,
      subtotalNumber,
      req.body.userId
    );

    if (!eligibility.valid) {
      return res.json({ success: false, message: eligibility.message });
    }

    const discountAmount = calculateDiscountAmount(coupon, subtotalNumber);

    return res.json({
      success: true,
      message: eligibility.message,
      data: {
        discountAmount: Number(discountAmount.toFixed(2)),
        coupon: buildCouponResponse(coupon),
      },
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: "Unable to validate coupon" });
  }
};

const getActiveCoupons = async (_req, res) => {
  try {
    const now = new Date();
    const coupons = await couponModel
      .find({
        active: true,
        $and: [
          {
            $or: [
              { startDate: null },
              { startDate: { $lte: now } },
            ],
          },
          {
            $or: [
              { endDate: null },
              { endDate: { $gte: now } },
            ],
          },
          {
            $expr: {
              $or: [
                { $eq: ["$usageLimit", null] },
                { $gt: ["$usageLimit", "$usageCount"] },
              ],
            },
          },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(6);

    return res.json({
      success: true,
      data: coupons.map((coupon) => ({
        code: coupon.code,
        label: coupon.label,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscountValue: coupon.maxDiscountValue,
        endDate: coupon.endDate,
        remainingRedemptions:
          coupon.usageLimit === null || coupon.usageLimit === undefined
            ? null
            : Math.max(coupon.usageLimit - coupon.usageCount, 0),
      })),
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: "Unable to fetch active coupons" });
  }
};

export {
  createCoupon,
  listCoupons,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getActiveCoupons,
};
