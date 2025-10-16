import "dotenv/config";
import { connectDB } from "../config/db.js";
import couponModel from "../models/couponModel.js";

const COUPONS = [
  {
    code: "FESTIVE250",
    label: "₹250 off festive thaali",
    description:
      "Flat ₹250 off when your order crosses ₹1,499. Perfect for nawabi feast nights.",
    discountType: "flat",
    discountValue: 250,
    minOrderAmount: 1499,
    maxDiscountValue: 250,
    active: true,
    usageLimit: null,
    perUserLimit: 1,
  },
  {
    code: "NAWABI10",
    label: "10% off Nihari & Rogan Josh",
    description:
      "Save 10% on slow-cooked mutton signatures. Capped at ₹400, minimum order ₹999.",
    discountType: "percentage",
    discountValue: 10,
    minOrderAmount: 999,
    maxDiscountValue: 400,
    active: true,
    usageLimit: null,
    perUserLimit: 2,
  },
  {
    code: "DESSERT75",
    label: "Dessert add-on savings",
    description:
      "₹75 off when you add sweets to the party. Works on orders above ₹499.",
    discountType: "flat",
    discountValue: 75,
    minOrderAmount: 499,
    maxDiscountValue: null,
    active: true,
    usageLimit: 500,
    perUserLimit: 3,
  },
];

const upsertCoupon = async (coupon) => {
  const { code, ...payload } = coupon;

  await couponModel.updateOne(
    { code },
    {
      $set: {
        ...payload,
        startDate: payload.startDate ?? null,
        endDate: payload.endDate ?? null,
      },
      $setOnInsert: {
        usageCount: 0,
        userUsages: {},
        createdBy: null,
      },
    },
    { upsert: true }
  );
};

const seedCoupons = async () => {
  try {
    await connectDB();

    if (!COUPONS.length) {
      console.log("⚠️  No coupons configured for seeding");
      process.exit(0);
    }

    for (const coupon of COUPONS) {
      await upsertCoupon(coupon);
      console.log(`✔ Upserted coupon ${coupon.code}`);
    }

    console.log("✨ Coupon seeding complete");
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed coupons", error);
    process.exit(1);
  }
};

seedCoupons();
