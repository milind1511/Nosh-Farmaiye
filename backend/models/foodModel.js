import mongoose from "mongoose";
import { FOOD_CATEGORY_IDS } from "../constants/foodCategories.js";

const foodSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    category: { type: String, required: true, enum: FOOD_CATEGORY_IDS },
  },
  {
    timestamps: true,
  }
);

const foodModel = mongoose.models.food || mongoose.model("food", foodSchema);

export default foodModel;
