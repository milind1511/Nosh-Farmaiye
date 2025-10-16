import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import couponModel from "../models/couponModel.js";
import {
  calculateDiscountAmount,
  validateCouponEligibility,
} from "../utils/couponUtils.js";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripeConfigured =
  typeof stripeSecretKey === "string" &&
  stripeSecretKey.trim().startsWith("sk_") &&
  !stripeSecretKey.toLowerCase().includes("placeholder");
const stripe = stripeConfigured ? new Stripe(stripeSecretKey) : null;

if (!stripe) {
  console.warn(
    "Stripe secret key is missing or invalid. Online payments will be disabled until it is configured."
  );
}
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const currency = (process.env.CURRENCY || "INR").toLowerCase();
const displayCurrency = currency.toUpperCase();
const deliveryFee = Number(process.env.DELIVERY_FEE || 0);

// placing user order for frontend
const placeOrder = async (req, res) => {
  try {
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (!rawItems.length) {
      return res.json({
        success: false,
        message: "Your cart is empty",
      });
    }

    const items = rawItems
      .map((item) => {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        if (quantity <= 0 || price <= 0) {
          return null;
        }
        return {
          _id: item._id,
          name: item.name,
          image: item.image,
          price,
          description: item.description,
          category: item.category,
          quantity,
        };
      })
      .filter(Boolean);

    if (!items.length) {
      return res.json({
        success: false,
        message: "Unable to process order items",
      });
    }

    const subtotalCents = items.reduce((sum, item) => {
      const priceCents = Math.round(item.price * 100);
      return sum + priceCents * item.quantity;
    }, 0);
    const subtotal = subtotalCents / 100;

    if (subtotal <= 0) {
      return res.json({ success: false, message: "Your cart is empty" });
    }

    const address =
      req.body.address && typeof req.body.address === "object"
        ? req.body.address
        : null;
    if (!address) {
      return res.json({ success: false, message: "Delivery address missing" });
    }

    const instructions =
      typeof req.body.instructions === "string"
        ? req.body.instructions.trim()
        : "";

    const rawPaymentMethod =
      typeof req.body.paymentMethod === "string"
        ? req.body.paymentMethod.trim().toLowerCase()
        : "online";
    const paymentMethod = [
      "cod",
      "cash",
      "cash-on-delivery",
      "cash_on_delivery",
    ].includes(rawPaymentMethod)
      ? "cod"
      : "online";
    const isCod = paymentMethod === "cod";

    const couponCode =
      typeof req.body.couponCode === "string"
        ? req.body.couponCode.trim().toUpperCase()
        : "";

    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const coupon = await couponModel.findOne({ code: couponCode });
      const eligibility = validateCouponEligibility(
        coupon,
        subtotal,
        req.body.userId
      );
      if (!eligibility.valid) {
        return res.json({ success: false, message: eligibility.message });
      }
      discountAmount = calculateDiscountAmount(coupon, subtotal);
      appliedCoupon = coupon;
    }

    const discountCents = Math.min(
      Math.round(discountAmount * 100),
      subtotalCents
    );
    const normalizedDiscount = discountCents / 100;
    const deliveryCharge = subtotal === 0 ? 0 : deliveryFee;
    const deliveryCents = Math.round(deliveryCharge * 100);
    const amountBeforeDeliveryCents = Math.max(subtotalCents - discountCents, 0);
    const totalCents = amountBeforeDeliveryCents + deliveryCents;
    const totalAmount = totalCents / 100;

    if (totalCents <= 0) {
      return res.json({
        success: false,
        message: "Order total must be at least ₹1 after discounts",
      });
    }

    const order = new orderModel({
      userId: req.body.userId,
      items,
      amount: totalAmount,
      subtotal,
      deliveryFee: deliveryCharge,
      discount: normalizedDiscount,
      address,
      instructions,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      couponSnapshot: appliedCoupon
        ? {
            code: appliedCoupon.code,
            label: appliedCoupon.label,
            discountType: appliedCoupon.discountType,
            discountValue: appliedCoupon.discountValue,
            maxDiscountValue: appliedCoupon.maxDiscountValue,
            minOrderAmount: appliedCoupon.minOrderAmount,
          }
        : null,
      currency: displayCurrency,
      paymentMethod,
      ...(isCod
        ? {
            status: "Awaiting cash collection",
          }
        : {}),
    });

    if (isCod) {
      await order.save();
      await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

      if (appliedCoupon) {
        const increment = {
          usageCount: 1,
        };
        increment[`userUsages.${req.body.userId}`] = 1;

        await couponModel.updateOne(
          { code: appliedCoupon.code },
          {
            $inc: increment,
          }
        );
      }

      return res.json({
        success: true,
        paymentMethod: "cod",
        orderId: order._id,
        message: "Cash on delivery order placed",
      });
    }

    if (!stripe) {
      return res.json({
        success: false,
        message:
          "Online payments are temporarily unavailable. Please choose Cash on Delivery or try again later.",
      });
    }

    const line_items = items.map((item) => ({
      price_data: {
        currency,
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    if (deliveryCharge > 0) {
      line_items.push({
        price_data: {
          currency,
          product_data: {
            name: "Delivery Charges",
          },
          unit_amount: Math.round(deliveryCharge * 100),
        },
        quantity: 1,
      });
    }

    const sessionPayload = {
      line_items,
      mode: "payment",
      success_url: `${frontendUrl}/verify?success=true&orderId=${order._id}`,
      cancel_url: `${frontendUrl}/verify?success=false&orderId=${order._id}`,
    };

    const metadata = {};
    if (instructions) {
      metadata.instructions = instructions;
    }
    if (appliedCoupon) {
      metadata.coupon_code = appliedCoupon.code;
      metadata.coupon_discount = normalizedDiscount.toFixed(2);
    }
    if (Object.keys(metadata).length) {
      sessionPayload.metadata = metadata;
    }

    let stripeCouponId = null;

    try {
      if (discountCents > 0) {
        const stripeCoupon = await stripe.coupons.create({
          amount_off: discountCents,
          currency,
          duration: "once",
          name: appliedCoupon ? `${appliedCoupon.code} discount` : "Order discount",
        });
        stripeCouponId = stripeCoupon.id;
        sessionPayload.discounts = [{ coupon: stripeCouponId }];
        order.stripeCouponId = stripeCouponId;
      }

      const session = await stripe.checkout.sessions.create(sessionPayload);

      await order.save();
      await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

      return res.json({
        success: true,
        session_url: session.url,
        paymentMethod: "online",
      });
    } catch (stripeError) {
      if (stripeCouponId) {
        try {
          await stripe.coupons.del(stripeCouponId);
        } catch (cleanupError) {
          console.error(
            "Unable to clean up Stripe coupon after failure",
            cleanupError?.message || cleanupError
          );
        }
      }

      const scrubbedMessage =
        typeof stripeError?.message === "string"
          ? stripeError.message.replace(/sk_(?:test|live)[0-9a-zA-Z_]+/g, "sk_****")
          : undefined;

      if (stripeError?.type === "StripeAuthenticationError") {
        console.error(
          "Stripe authentication error during checkout: %s",
          scrubbedMessage || stripeError?.type
        );
        return res.json({
          success: false,
          message:
            "Online payments are temporarily unavailable. Please choose Cash on Delivery or try again later.",
        });
      }

      const logDetail =
        scrubbedMessage ||
        (typeof stripeError?.type === "string" ? stripeError.type : "unknown");
      console.error("Stripe checkout session failed: %s", logDetail);
      return res.json({
        success: false,
        message:
          "We couldn't start the payment session. Please try again or switch to Cash on Delivery.",
      });
    }
  } catch (error) {
    const scrubbedMessage =
      typeof error?.message === "string"
        ? error.message.replace(/sk_(?:test|live)[0-9a-zA-Z_]+/g, "sk_****")
        : error;
    console.error("Failed to place order:", scrubbedMessage);
    res.json({ success: false, message: "Error" });
  }
};

const verifyOrder = async (req, res) => {
  const { orderId, success } = req.body;
  try {
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    if (order.paymentMethod === "cod") {
      return res.json({
        success: true,
        message: "Cash order verified",
      });
    }

    if (success == "true") {
      if (!order.payment) {
        const updatePayload = { payment: true };
        if (order.stripeCouponId) {
          updatePayload.stripeCouponId = null;
        }
        await orderModel.findByIdAndUpdate(orderId, updatePayload);

        if (order.couponCode) {
          const increment = {
            usageCount: 1,
          };
          increment[`userUsages.${order.userId}`] = 1;

          await couponModel.updateOne(
            { code: order.couponCode },
            {
              $inc: increment,
            }
          );
        }

        if (stripe && order.stripeCouponId) {
          try {
            await stripe.coupons.del(order.stripeCouponId);
          } catch (stripeError) {
            console.log("Unable to clean up Stripe coupon", stripeError);
          }
        }
      }
      return res.json({ success: true, message: "Paid" });
    } else {
      await orderModel.findByIdAndDelete(orderId);
      if (stripe && order.stripeCouponId) {
        try {
          await stripe.coupons.del(order.stripeCouponId);
        } catch (stripeError) {
          console.log("Unable to clean up Stripe coupon", stripeError);
        }
      }
      return res.json({ success: false, message: "Not Paid" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// user orders for frontend
const userOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({ userId: req.body.userId });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// Listing orders for admin pannel
const listOrders = async (req, res) => {
  try {
    let userData = await userModel.findById(req.body.userId);
    if (userData && userData.role === "admin") {
      const orders = await orderModel.find({});
      res.json({ success: true, data: orders });
    } else {
      res.json({ success: false, message: "You are not admin" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// api for updating status
const updateStatus = async (req, res) => {
  try {
    let userData = await userModel.findById(req.body.userId);
    if (userData && userData.role === "admin") {
      await orderModel.findByIdAndUpdate(req.body.orderId, {
        status: req.body.status,
      });
      res.json({ success: true, message: "Status Updated Successfully" });
    }else{
      res.json({ success: false, message: "You are not an admin" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

const removeOrder = async (req, res) => {
  const orderId = req.params?.orderId || req.body?.orderId;
  if (!orderId) {
    return res.json({ success: false, message: "Order id is required" });
  }

  try {
    const userData = await userModel.findById(req.userId || req.body.userId);
    if (!userData || userData.role !== "admin") {
      return res.json({ success: false, message: "You are not admin" });
    }

    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    await orderModel.findByIdAndDelete(orderId);

    if (stripe && order.stripeCouponId) {
      try {
        await stripe.coupons.del(order.stripeCouponId);
      } catch (stripeError) {
        console.log("Unable to clean up Stripe coupon", stripeError);
      }
    }

    if (order.couponCode && order.payment) {
      await couponModel.updateOne(
        { code: order.couponCode },
        {
          $inc: {
            usageCount: -1,
            [`userUsages.${order.userId}`]: -1,
          },
        }
      );
    }

    res.json({ success: true, message: "Order removed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

export { placeOrder, verifyOrder, userOrders, listOrders, updateStatus, removeOrder };
