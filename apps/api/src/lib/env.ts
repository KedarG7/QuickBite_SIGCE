import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  MONGO_URI: z.string().default("mongodb://localhost:27017/sigce_canteen"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters").default("please-change-me-please-change-me"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  COOKIE_NAME: z.string().default("sigce_canteen_session"),
  COOKIE_SAMESITE: z.enum(["lax", "none", "strict"]).default("lax"),

  STUDENT_EMAIL_REGEX: z.string().default("^\\\\d{4}ci\\\\d{2}f@sigce\\\\.edu\\\\.in$"),
  TEACHER_EMAIL_DOMAIN: z.string().default("sigce.edu.in"),
  ADMIN_EMAIL: z.string().email().default("admin@sigce.edu.in"),
  ADMIN_PASSWORD: z.string().min(8).default("admin12345"),

  TIMEZONE: z.string().default("Asia/Calcutta"),
  ENFORCE_COLLEGE_HOURS: z.coerce.boolean().default(true),
  COLLEGE_HOURS_START: z.string().default("09:00"),
  COLLEGE_HOURS_END: z.string().default("17:00"),
  TEACHER_LUNCH_PREORDER_CUTOFF: z.string().default("10:30"),
  LUNCH_WINDOW_START: z.string().default("12:00"),
  LUNCH_WINDOW_END: z.string().default("14:30"),

  ENFORCE_GEOFENCE: z.coerce.boolean().default(false),
  CANTEEN_LAT: z.coerce.number().default(0),
  CANTEEN_LNG: z.coerce.number().default(0),
  CANTEEN_RADIUS_METERS: z.coerce.number().int().positive().default(250),

  PICKUP_SLOT_MINUTES: z.coerce.number().int().positive().default(10),
  PICKUP_SLOT_CAPACITY: z.coerce.number().int().positive().default(15),
  PICKUP_LOOKAHEAD_MINUTES: z.coerce.number().int().positive().default(90),
  PICKUP_MIN_LEAD_MINUTES: z.coerce.number().int().nonnegative().default(5),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  POINTS_PER_RUPEE_DISCOUNT: z.coerce.number().int().positive().default(10),
  MAX_POINTS_REDEEM_PER_ORDER: z.coerce.number().int().nonnegative().default(1000)
});

export const env = schema.parse(process.env);
