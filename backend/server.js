import express from "express";
import cors from "cors";
import "dotenv/config";
import { connectDB } from "./config/db.js";
import foodRouter from "./routes/foodRoute.js";
import userRouter from "./routes/userRoute.js";
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";
import couponRouter from "./routes/couponRoute.js";
import analyticsRouter from "./routes/analyticsRoute.js";
import { corsOptions } from "./config/corsOptions.js";
import { resolveUploadsDir } from "./config/uploads.js";
const uploadsDir = resolveUploadsDir();

// app config
const app = express();
const port = process.env.PORT || 4000;

//middlewares
app.use(express.json());
app.use(cors(corsOptions));

// DB connection
connectDB();

// api endpoints
app.use("/api/food", foodRouter);
app.use("/images", express.static(uploadsDir));
app.use("/api/user", userRouter);
app.use("/api/cart", cartRouter);
app.use("/api/order", orderRouter);
app.use("/api/coupon", couponRouter);
app.use("/api/analytics", analyticsRouter);

app.get("/", (req, res) => {
  res.send("API Working");
});

app.use((err, req, res, next) => {
  if (err?.message === "Not allowed by CORS") {
    return res.status(403).json({ success: false, message: err.message });
  }
  return next(err);
});

app.listen(port, () => {
  console.log(`Server Started on port: ${port}`);
});
