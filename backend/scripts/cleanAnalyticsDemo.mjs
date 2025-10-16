import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import orderModel from "../models/orderModel.js";
import couponModel from "../models/couponModel.js";
import userModel from "../models/userModel.js";

const SEED_MARKER = "[seed] analytics demo";
const SEED_METADATA_KEY = "analytics-demo";
const DEMO_EMAIL_REGEX = /\+demo@noshfarmaiye\.com$/i;
const DEMO_PASSWORD = "seeded-analytics-user";

const run = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    const demoUsers = await userModel
      .find(
        {
          email: { $regex: DEMO_EMAIL_REGEX },
          password: DEMO_PASSWORD,
        },
        { _id: 1 }
      )
      .lean();
    const demoUserIds = demoUsers.map((user) => user._id);

    const seededCoupons = await couponModel
      .find({ "metadata.seed": SEED_METADATA_KEY }, { code: 1 })
      .lean();
    const seededCouponCodes = seededCoupons
      .map((coupon) => coupon.code)
      .filter(Boolean);

    const orderFilters = [
      { instructions: { $regex: SEED_MARKER, $options: "i" } },
    ];

    if (demoUserIds.length) {
      orderFilters.push({ userId: { $in: demoUserIds } });
    }

    if (seededCouponCodes.length) {
      orderFilters.push({ couponCode: { $in: seededCouponCodes } });
    }

    const orderQuery = orderFilters.length === 1 ? orderFilters[0] : { $or: orderFilters };

    const ordersResult = await orderModel.deleteMany(orderQuery);
    console.log(`Removed ${ordersResult.deletedCount || 0} seeded orders`);

    const couponsResult = await couponModel.deleteMany({
      "metadata.seed": SEED_METADATA_KEY,
    });
    console.log(`Removed ${couponsResult.deletedCount || 0} seeded coupons`);

    const usersResult = await userModel.deleteMany({
      email: { $regex: DEMO_EMAIL_REGEX },
      password: DEMO_PASSWORD,
    });
    console.log(`Removed ${usersResult.deletedCount || 0} demo users`);

    console.log("Analytics demo data cleared ✅");
  } catch (error) {
    console.error("Failed to clean analytics demo data", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
};

run();
