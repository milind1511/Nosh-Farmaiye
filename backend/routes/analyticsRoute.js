import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
	getDashboardAnalytics,
	getAnalyticsInsights,
} from "../controllers/analyticsController.js";

const analyticsRouter = express.Router();

analyticsRouter.get("/dashboard", authMiddleware, getDashboardAnalytics);
analyticsRouter.get("/insights", authMiddleware, getAnalyticsInsights);

export default analyticsRouter;
