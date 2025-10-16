import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";

// login user

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User Doesn't exist" });
    }
    const isMatch =await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid Credentials" });
    }
    const role=user.role;
    const token = createToken(user._id);
    res.json({ success: true, token,role });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// Create token

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET);
};

const isValidPhone = (phone) => {
  if (typeof phone !== "string") return false;
  const trimmed = phone.trim();
  if (!trimmed) return true; // allow empty optional phone
  if (!/^[+0-9()\-\s]+$/.test(trimmed)) return false;
  const digitsOnly = trimmed.replace(/\D/g, "");
  return digitsOnly.length === 10;
};

const normalizePhone = (phone) => {
  if (typeof phone !== "string") return "";
  const digitsOnly = phone.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return digitsOnly;
};

const isStrongPassword = (password) => {
  if (typeof password !== "string") return false;
  if (password.length < 8) return false;
  const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  return pattern.test(password);
};

const isValidEmailFormat = (email) => {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  if (!trimmed) return false;
  const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailPattern.test(trimmed);
};

const getProfile = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId;
    if (!userId) {
      return res.json({ success: false, message: "User not found" });
    }

    const user = await userModel
      .findById(userId)
      .select("name email role phone");

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        phone: user.phone || "",
      },
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// register user

const registerUser = async (req, res) => {
  const { name, email, password, phone } = req.body;
  try {
    // checking user is already exist
    const exists = await userModel.findOne({ email });
    if (exists) {
      return res.json({ success: false, message: "User already exists" });
    }

    // validating email format and strong password
    if (!validator.isEmail(email) || !isValidEmailFormat(email)) {
      return res.json({ success: false, message: "Please enter valid email" });
    }
    if (!isStrongPassword(password)) {
      return res.json({
        success: false,
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      });
    }

    // hashing user password

    const salt = await bcrypt.genSalt(Number(process.env.SALT));
    const hashedPassword = await bcrypt.hash(password, salt);

    if (phone && !isValidPhone(phone)) {
      return res.json({
        success: false,
        message: "Please enter a valid phone number",
      });
    }

    const newUser = new userModel({
      name: name,
      email: email,
      password: hashedPassword,
      phone: normalizePhone(phone),
    });

    const user = await newUser.save();
    const role=user.role;
    const token = createToken(user._id);
    res.json({ success: true, token, role});
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId;
    if (!userId) {
      return res.json({ success: false, message: "User not found" });
    }

  const { name, phone } = req.body;

    if (!name || !name.trim()) {
      return res.json({ success: false, message: "Name is required" });
    }

    if (!isValidPhone(phone ?? "")) {
      return res.json({
        success: false,
        message: "Please enter a valid phone number",
      });
    }

    const updatedUser = await userModel
      .findByIdAndUpdate(
        userId,
        {
          name: name.trim(),
          phone: normalizePhone(phone),
        },
        { new: true, runValidators: true, context: "query" }
      )
      .select("name email role phone");

    if (!updatedUser) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "Profile updated",
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role || "user",
        phone: updatedUser.phone || "",
      },
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

  const updatePassword = async (req, res) => {
    try {
      const userId = req.userId || req.body.userId;
      if (!userId) {
        return res.json({ success: false, message: "User not found" });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.json({
          success: false,
          message: "Current and new passwords are required",
        });
      }

      if (!isStrongPassword(newPassword)) {
        return res.json({
          success: false,
          message:
            "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
        });
      }

      const user = await userModel.findById(userId).select("password");

      if (!user) {
        return res.json({ success: false, message: "User not found" });
      }

      const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentValid) {
        return res.json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      if (currentPassword === newPassword) {
        return res.json({
          success: false,
          message: "New password must be different from current password",
        });
      }

      const salt = await bcrypt.genSalt(Number(process.env.SALT));
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await userModel.findByIdAndUpdate(userId, { password: hashedPassword });

      res.json({ success: true, message: "Password updated" });
    } catch (error) {
      console.log(error);
      res.json({ success: false, message: "Error" });
    }
  };

  export { loginUser, registerUser, getProfile, updateProfile, updatePassword };
