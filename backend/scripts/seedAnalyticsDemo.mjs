import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import couponModel from "../models/couponModel.js";
import foodModel from "../models/foodModel.js";

const SEED_MARKER = "[seed] analytics demo";
const SEED_METADATA_KEY = "analytics-demo";
const DELIVERY_FEE = Number(process.env.DELIVERY_FEE || 49);
const DISPLAY_CURRENCY = (process.env.CURRENCY || "INR").toUpperCase();

const createSeededRandom = (seed) => {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const linearlySpread = (index) => index * 60 * 60 * 1000;

const loadMenuDishes = async () => {
  const results = await foodModel
    .find({}, { name: 1, category: 1, price: 1 })
    .lean()
    .exec();

  return results
    .map((doc) => ({
      id: doc._id.toString(),
      name: doc.name,
      category: doc.category,
      price: Number(doc.price) || 0,
    }))
    .filter((dish) => dish.name && dish.category && dish.price > 0);
};

const coupons = [
  {
    code: "WELCOME100",
    label: "Welcome ₹100 off",
    description: "Flat ₹100 off on first three orders",
    discountType: "flat",
    discountValue: 100,
    minOrderAmount: 499,
    metadata: { seed: SEED_METADATA_KEY },
  },
  {
    code: "CORP15",
    label: "Corporate lunch 15%",
    description: "15% off for weekday lunch orders (max ₹200)",
    discountType: "percentage",
    discountValue: 15,
    maxDiscountValue: 200,
    minOrderAmount: 399,
    metadata: { seed: SEED_METADATA_KEY },
  },
  {
    code: "SWEETTOOTH",
    label: "Dessert combo 20%",
    description: "Desserts at 20% off after 8pm",
    discountType: "percentage",
    discountValue: 20,
    maxDiscountValue: 180,
    minOrderAmount: 299,
    metadata: { seed: SEED_METADATA_KEY },
  },
];

const customers = [
  {
    name: "Ananya Rao",
    email: "ananya.rao+demo@noshfarmaiye.com",
    phone: "+91-9000000001",
    city: "Mumbai",
    segment: "Corporate",
    address: {
      street: "C-1202, Seaview Heights",
      locality: "Worli",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400030",
      instructions: "High-rise security gate",
    },
  },
  {
    name: "Karan Malhotra",
    email: "karan.malhotra+demo@noshfarmaiye.com",
    phone: "+91-9000000002",
    city: "Mumbai",
    segment: "Weekend",
    address: {
      street: "Villa 14, Lakeside Residency",
      locality: "Powai",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400076",
      instructions: "Call concierge",
    },
  },
  {
    name: "Nisha Pillai",
    email: "nisha.pillai+demo@noshfarmaiye.com",
    phone: "+91-9000000003",
    city: "Mumbai",
    segment: "Vegan",
    address: {
      street: "701, Greenfield Towers",
      locality: "Andheri East",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400059",
      instructions: "Ring bell twice",
    },
  },
  {
    name: "Rahul Sinha",
    email: "rahul.sinha+demo@noshfarmaiye.com",
    phone: "+91-9000000004",
    city: "Mumbai",
    segment: "Family",
    address: {
      street: "32, Banyan Row",
      locality: "Bandra West",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400050",
      instructions: "Leave at lobby",
    },
  },
  {
    name: "Shreya Iyer",
    email: "shreya.iyer+demo@noshfarmaiye.com",
    phone: "+91-9000000005",
    city: "Mumbai",
    segment: "Dessert Lover",
    address: {
      street: "503, Horizon Residency",
      locality: "Lower Parel",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400013",
      instructions: "Delivery desk",
    },
  },
  {
    name: "Devendra Kulkarni",
    email: "devendra.kulkarni+demo@noshfarmaiye.com",
    phone: "+91-9000000006",
    city: "Thane",
    segment: "Bulk",
    address: {
      street: "201, Sterling Chambers",
      locality: "Thane West",
      city: "Thane",
      state: "Maharashtra",
      pincode: "400601",
      instructions: "Reception",
    },
  },
];

const statusBuckets = [
  "Delivered",
  "Delivered",
  "Delivered",
  "Completed",
  "Out for delivery",
];

const paymentModes = ["online", "online", "online", "cod"];

const chooseCoupon = (rand) => {
  const roll = rand();
  if (roll > 0.7) return null;
  if (roll > 0.4) return coupons[0];
  if (roll > 0.2) return coupons[1];
  return coupons[2];
};

const calculateDiscount = (coupon, subtotal) => {
  if (!coupon) return 0;
  if (coupon.discountType === "flat") {
    return Math.min(coupon.discountValue, subtotal);
  }
  const pctValue = (subtotal * coupon.discountValue) / 100;
  if (!coupon.maxDiscountValue) return Math.min(pctValue, subtotal);
  return Math.min(pctValue, coupon.maxDiscountValue, subtotal);
};

const ensureUsers = async () => {
  const seededUsers = [];
  for (const customer of customers) {
    const user = await userModel.findOneAndUpdate(
      { email: customer.email },
      {
        $setOnInsert: {
          name: customer.name,
          email: customer.email,
          password: "seeded-analytics-user",
          role: "user",
        },
        $set: {
          phone: customer.phone,
        },
      },
      { upsert: true, new: true }
    );
    seededUsers.push({ ...customer, userId: user._id.toString() });
  }
  return seededUsers;
};

const upsertCoupons = async () => {
  await couponModel.deleteMany({ "metadata.seed": SEED_METADATA_KEY });
  const docs = [];
  for (const coupon of coupons) {
    const doc = await couponModel.create({
      ...coupon,
      active: true,
      usageCount: 0,
      userUsages: {},
    });
    docs.push(doc);
  }
  return docs;
};

const generateOrders = (users, dishes) => {
  const today = new Date();
  const totalDays = 365;
  const pattern = [1, 1, 1, 1, 2, 1, 1];
  const orders = [];
  const couponUsage = new Map();

  for (let offset = 0; offset < totalDays; offset += 1) {
    const orderDate = new Date(today);
    orderDate.setHours(12, 0, 0, 0);
    orderDate.setDate(today.getDate() - offset);
    const dow = orderDate.getDay();
    const month = orderDate.getMonth();
    let count = pattern[dow];

    // Seasonality boost for festive months (Oct-Dec)
    if ([9, 10, 11].includes(month)) {
      count += 1;
    } else if (month === 4 || month === 5) {
      // Early summer slowdown
      count = Math.max(1, count - 1);
    }

    const rand = createSeededRandom(orderDate.getTime());
    const variability = rand() * 1.5 - 0.75;
    count = Math.max(1, Math.round(count + variability));

    for (let idx = 0; idx < count; idx += 1) {
      const customer = users[(offset + idx) % users.length];
      const paymentMethod = paymentModes[Math.floor(rand() * paymentModes.length)];
      const status = statusBuckets[Math.floor(rand() * statusBuckets.length)];
      const itemCount = 2 + Math.floor(rand() * 3);
      const items = [];
      for (let line = 0; line < itemCount; line += 1) {
        const dish = dishes[Math.floor(rand() * dishes.length)];
        const quantity = 1 + Math.floor(rand() * 3);
        items.push({
          _id: dish.id,
          name: dish.name,
          category: dish.category,
          price: dish.price,
          quantity,
        });
      }

      const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const coupon = chooseCoupon(rand);
      const discount = calculateDiscount(coupon, subtotal);
      const amount = Math.max(subtotal - discount + DELIVERY_FEE, 0);

      if (coupon) {
        const key = coupon.code;
        if (!couponUsage.has(key)) {
          couponUsage.set(key, {
            count: 0,
            users: new Map(),
          });
        }
        const usage = couponUsage.get(key);
        usage.count += 1;
        usage.users.set(
          customer.userId,
          (usage.users.get(customer.userId) || 0) + 1
        );
      }

      orders.push({
        userId: customer.userId,
        items,
        amount: Number(amount.toFixed(2)),
        subtotal: Number(subtotal.toFixed(2)),
        deliveryFee: DELIVERY_FEE,
        discount: Number(discount.toFixed(2)),
        currency: DISPLAY_CURRENCY,
        address: {
          ...customer.address,
          contactName: customer.name,
          contactPhone: customer.phone,
        },
        instructions: `${SEED_MARKER} :: ${customer.segment}`,
        status,
        date: new Date(orderDate.getTime() + linearlySpread(idx)),
        payment: true,
        paymentMethod,
        couponCode: coupon ? coupon.code : null,
        couponSnapshot: coupon
          ? {
              code: coupon.code,
              label: coupon.label,
              discountType: coupon.discountType,
              discountValue: coupon.discountValue,
              maxDiscountValue: coupon.maxDiscountValue || null,
              minOrderAmount: coupon.minOrderAmount || 0,
            }
          : null,
      });
    }
  }

  return { orders, couponUsage };
};

const updateCouponUsageMetrics = async (couponUsage) => {
  for (const [code, meta] of couponUsage.entries()) {
    const userUsages = {};
    for (const [userId, count] of meta.users.entries()) {
      userUsages[userId] = count;
    }
    await couponModel.updateOne(
      { code },
      {
        $set: {
          usageCount: meta.count,
          userUsages,
        },
      }
    );
  }
};

const run = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    await orderModel.deleteMany({ instructions: { $regex: SEED_MARKER, $options: "i" } });
    console.log("Cleared existing seeded orders");

    const users = await ensureUsers();
    console.log(`Upserted ${users.length} demo users`);

    await upsertCoupons();
    console.log(`Seeded ${coupons.length} demo coupons`);

    const dishes = await loadMenuDishes();
    if (!dishes.length) {
      throw new Error(
        "No dishes found in the menu. Seed the menu before running the analytics demo seeder."
      );
    }
    console.log(`Loaded ${dishes.length} live menu items`);

    const { orders, couponUsage } = generateOrders(users, dishes);
    if (orders.length) {
      await orderModel.insertMany(orders);
    }
    console.log(`Inserted ${orders.length} demo orders`);

    await updateCouponUsageMetrics(couponUsage);
    console.log("Updated coupon usage metrics");

    console.log("Analytics demo dataset ready ✅");
  } catch (error) {
    console.error("Failed to seed analytics demo data", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

run();
