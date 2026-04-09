import bcrypt from "bcryptjs";

import { env } from "../lib/env.js";
import { User } from "../models/User.js";

export async function seedAdminUser() {
  const email = env.ADMIN_EMAIL.toLowerCase();

  const existing = await User.findOne({ email }).lean();
  if (existing) return;

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
  await User.create({
    name: "Admin",
    email,
    role: "ADMIN",
    passwordHash
  });

  console.log(`Seeded admin user: ${email}`);
}

