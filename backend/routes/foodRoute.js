import express from "express";
import {
    addFood,
    listFood,
    removeFood,
    listFoodCategories,
} from "../controllers/foodController.js";
import multer from "multer";
import authMiddleware from "../middleware/auth.js";
import { resolveUploadsDir } from "../config/uploads.js";

const foodRouter = express.Router();

// Image Storage Engine

const uploadsDir = resolveUploadsDir();

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}${file.originalname}`),
});

const upload = multer({ storage });

foodRouter.post("/add",upload.single("image"),authMiddleware,addFood);
foodRouter.get("/list",listFood);
foodRouter.get("/categories", listFoodCategories);
foodRouter.post("/remove",authMiddleware,removeFood);

export default foodRouter;
