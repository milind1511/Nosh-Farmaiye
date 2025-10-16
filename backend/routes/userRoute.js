import express from "express";
import {
	loginUser,
	registerUser,
	getProfile,
	updateProfile,
    updatePassword,
} from "../controllers/userController.js";
import authMiddleware from "../middleware/auth.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.get("/me", authMiddleware, getProfile);
userRouter.put("/me", authMiddleware, updateProfile);
userRouter.put("/me/password", authMiddleware, updatePassword);

export default userRouter;
