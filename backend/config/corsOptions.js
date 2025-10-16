const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost",
  "http://127.0.0.1",
];

const parseOrigins = (originString = "") =>
  originString
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

const envOrigins = parseOrigins(process.env.ALLOWED_ORIGINS);

export const allowedOrigins = Array.from(
  new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins])
);

export const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (!allowedOrigins.length || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};
