import "dotenv/config";
import bcrypt from "bcrypt";
import { connectDB } from "../config/db.js";
import userModel from "../models/userModel.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME?.trim() || "Kitchen Admin";
const SHOULD_RESET = String(process.env.ADMIN_FORCE_RESET || "false").toLowerCase() === "true";
const SALT_ROUNDS = Number(process.env.SALT ?? 10);

const exitWithError = (message) => {
  console.error(`❌ ${message}`);
  process.exit(1);
};

const isStrongPassword = (password) => {
  if (typeof password !== "string") return false;
  if (password.length < 8) return false;
  const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  return pattern.test(password);
};

const ensureAdminUser = async () => {
  if (!ADMIN_EMAIL) {
    exitWithError("ADMIN_EMAIL is required to seed an admin user.");
  }

  if (!ADMIN_PASSWORD) {
    exitWithError("ADMIN_PASSWORD is required to seed an admin user.");
  }

  if (!isStrongPassword(ADMIN_PASSWORD)) {
    exitWithError(
      "ADMIN_PASSWORD must be at least 8 characters and include uppercase, lowercase, number, and special character."
    );
  }

  await connectDB();

  const existingUser = await userModel.findOne({ email: ADMIN_EMAIL });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);

    await userModel.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
      phone: "",
    });

    console.log(`✨ Admin user created for ${ADMIN_EMAIL}`);
    process.exit(0);
  }

  const updates = {};
  if (existingUser.role !== "admin") {
    updates.role = "admin";
  }

  if (SHOULD_RESET) {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
    updates.password = hashedPassword;
  }

  if (Object.keys(updates).length > 0) {
    await userModel.updateOne({ _id: existingUser._id }, { $set: updates });
    console.log(
      `✅ Updated admin user ${ADMIN_EMAIL}${
        SHOULD_RESET ? " with refreshed password" : ""
      }`
    );
  } else {
    console.log(`ℹ️ Admin user ${ADMIN_EMAIL} already present. No changes.`);
  }

  process.exit(0);
};

ensureAdminUser().catch((error) => {
  console.error("Failed to seed admin user", error);
  process.exit(1);
});
