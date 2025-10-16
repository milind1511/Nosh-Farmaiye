import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, "..");

export const LOCAL_UPLOADS_DIR = path.join(BACKEND_ROOT, "uploads");
export const CONTAINER_UPLOADS_DIR = path.resolve(BACKEND_ROOT, "..", "uploads");

export const resolveUploadsDir = () => {
  const preferredDir = fs.existsSync(CONTAINER_UPLOADS_DIR)
    ? CONTAINER_UPLOADS_DIR
    : LOCAL_UPLOADS_DIR;

  if (!fs.existsSync(preferredDir)) {
    fs.mkdirSync(preferredDir, { recursive: true });
  }

  return preferredDir;
};

export const ensureUploadsDir = resolveUploadsDir;
