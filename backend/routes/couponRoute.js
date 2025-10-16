import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  createCoupon,
  listCoupons,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getActiveCoupons,
} from "../controllers/couponController.js";

const couponRouter = express.Router();

couponRouter.post("/", authMiddleware, createCoupon);
couponRouter.get("/", authMiddleware, listCoupons);
couponRouter.put("/:couponId", authMiddleware, updateCoupon);
couponRouter.delete("/:couponId", authMiddleware, deleteCoupon);
couponRouter.post("/validate", authMiddleware, validateCoupon);
couponRouter.get("/active", getActiveCoupons);

export default couponRouter;
