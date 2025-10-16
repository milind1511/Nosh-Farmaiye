import userModel from "../models/userModel.js";

// add items to user cart
const addToCart = async (req, res) => {
  try {
    let userData = await userModel.findById(req.body.userId);
    let cartData = await userData.cartData;
    if (!cartData[req.body.itemId]) {
      cartData[req.body.itemId] = 1;
    } else {
      cartData[req.body.itemId] += 1;
    }
    await userModel.findByIdAndUpdate(req.body.userId, { cartData });
    res.json({ success: true, message: "Added to Cart" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// remove from cart
const removeFromCart = async (req, res) => {
  try {
    let userData = await userModel.findById(req.body.userId);
    let cartData = await userData.cartData;
    if (cartData[req.body.itemId] > 1) {
      cartData[req.body.itemId] -= 1;
    } else {
      delete cartData[req.body.itemId];
    }
    await userModel.findByIdAndUpdate(req.body.userId, { cartData });
    res.json({ success: true, message: "Removed from Cart" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// fetch user cart data
const getCart = async (req, res) => {
  try {
    let userData = await userModel.findById(req.body.userId);
    let cartData = await userData.cartData;
    res.json({ success: true, cartData: cartData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

const setCart = async (req, res) => {
  try {
    const incomingCart = req.body?.cartData;
    if (!incomingCart || typeof incomingCart !== "object") {
      return res.json({ success: false, message: "Invalid cart payload" });
    }

    const normalizedCart = Object.entries(incomingCart).reduce(
      (accumulator, [itemId, quantity]) => {
        const normalizedId = typeof itemId === "string" ? itemId.trim() : itemId;
        const normalizedQuantity = Number(quantity);
        if (
          typeof normalizedId === "string" &&
          normalizedId &&
          Number.isFinite(normalizedQuantity) &&
          normalizedQuantity > 0
        ) {
          const qty = Math.min(Math.floor(normalizedQuantity), 99);
          accumulator[normalizedId] = qty;
        }
        return accumulator;
      },
      {}
    );

    const userId = req.body.userId;
    if (!userId) {
      return res.json({ success: false, message: "User not found" });
    }

    await userModel.findByIdAndUpdate(userId, { cartData: normalizedCart });
    res.json({ success: true, message: "Cart updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

export { addToCart, removeFromCart, getCart, setCart };
