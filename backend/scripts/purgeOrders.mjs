import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "../config/db.js";
import orderModel from "../models/orderModel.js";

const FLAG_FORCE = "--force";
const FLAG_MONGO_PREFIX = "--mongo=";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env");

dotenv.config({ path: envPath });

const args = process.argv.slice(2);
const hasForceFlag = args.includes(FLAG_FORCE);
const mongoFlag = args.find((arg) => arg.startsWith(FLAG_MONGO_PREFIX));
const overrideMongoUrl = mongoFlag
  ? mongoFlag.slice(FLAG_MONGO_PREFIX.length).trim()
  : "";

if (!hasForceFlag) {
  console.error(
    `⚠️  Refusing to delete orders without the "${FLAG_FORCE}" flag.\n` +
      `Run: node scripts/purgeOrders.mjs ${FLAG_FORCE}`
  );
  process.exit(1);
}

if (overrideMongoUrl && !overrideMongoUrl.startsWith("mongodb://")) {
  console.error(
    `❌ The ${FLAG_MONGO_PREFIX}<uri> flag must be a valid MongoDB connection string.`
  );
  process.exit(1);
}

const FALLBACK_MONGO_URL = "mongodb://127.0.0.1:27017/nosh-farmaiye";
const mongoUrl = overrideMongoUrl || process.env.MONGO_URL || FALLBACK_MONGO_URL;

if (!process.env.MONGO_URL && !overrideMongoUrl) {
  console.warn(
    `ℹ️  No MONGO_URL found in ${envPath}. Using fallback connection: ${FALLBACK_MONGO_URL}`
  );
}

if (!mongoUrl) {
  console.error(
    "❌ Unable to determine Mongo connection string. Set MONGO_URL in backend/.env or pass --mongo=<uri>."
  );
  process.exit(1);
}

process.env.MONGO_URL = mongoUrl;

const run = async () => {
  try {
    console.log(`Connecting to MongoDB at ${mongoUrl}`);
    await connectDB();
    console.log("Connected to MongoDB");

    const result = await orderModel.deleteMany({});
    console.log(`Deleted ${result.deletedCount || 0} order(s).`);

    console.log("All orders removed ✅");
  } catch (error) {
    console.error("Failed to delete orders", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
};

run();
