import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  items: { type: Array, required: true },
  amount: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  deliveryFee: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  currency: { type: String, default: "INR" },
  address: { type: Object, required: true },
  instructions: { type: String, default: "" },
  status: { type: String, default: "Food Processing" },
  date: { type: Date, default: Date.now() },
  payment: { type: Boolean, default: false },
  paymentMethod: {
    type: String,
    enum: ["online", "cod"],
    default: "online",
  },
  couponCode: { type: String, default: null },
  couponSnapshot: { type: Object, default: null },
  stripeCouponId: { type: String, default: null },
});

const orderModel =
  mongoose.models.order || mongoose.model("order", orderSchema);

export default orderModel;
