import bcrypt from "bcryptjs";

import { env } from "../lib/env.js";
import { User } from "../models/User.js";
import { MenuItem } from "../models/MenuItem.js";

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

export async function seedMenuItems() {
  const existingCount = await MenuItem.countDocuments();
  if (existingCount > 0) return;

  const items = [
    { name: "Tea", priceRupees: 10, category: "Beverages", available: true },
    { name: "Lemon Tea", priceRupees: 10, category: "Beverages", available: true },
    { name: "Black Tea", priceRupees: 10, category: "Beverages", available: true },
    { name: "Coffee", priceRupees: 15, category: "Beverages", available: false, imageUrl: "/menu-items/coffee.png" },
    { name: "Black Coffee", priceRupees: 15, category: "Beverages", available: true, imageUrl: "/menu-items/blackcoffee.png" },
    { name: "Cold Coffee", priceRupees: 20, category: "Beverages", available: true },
    { name: "Lemon Juice", priceRupees: 15, category: "Beverages", available: true },
    { name: "Chass", priceRupees: 15, category: "Beverages", available: true, imageUrl: "/menu-items/chass.png" },
    { name: "Poha", priceRupees: 20, category: "Snacks", available: false },
    { name: "Upama", priceRupees: 20, category: "Snacks", available: true },
    { name: "Idli Sambhar", priceRupees: 30, category: "Snacks", available: true },
    { name: "Misal Pav", priceRupees: 40, category: "Snacks", available: true },
    { name: "Vada Usal Pav", priceRupees: 40, category: "Snacks", available: true },
    { name: "Methi Paratha", priceRupees: 35, category: "Snacks", available: true },
    { name: "Aloo Paratha", priceRupees: 40, category: "Snacks", available: true },
    { name: "Sabudana Vada", priceRupees: 35, category: "Snacks", available: true },
    { name: "Vada Pav", priceRupees: 20, category: "Snacks", available: true, imageUrl: "/menu-items/vadapav.png" },
    { name: "Samosa", priceRupees: 15, category: "Snacks", available: true },
    { name: "Samosa Pav", priceRupees: 20, category: "Snacks", available: true },
    { name: "Bread Pattice", priceRupees: 20, category: "Snacks", available: false },
    { name: "Kanda Bhajiee", priceRupees: 25, category: "Snacks", available: true },
    { name: "Batata Bhajiee", priceRupees: 30, category: "Snacks", available: true },
    { name: "Moong Dal Bhajiee", priceRupees: 40, category: "Snacks", available: true },
    { name: "Manchurian", priceRupees: 20, category: "Snacks", available: true },
    { name: "Chinese Bhel", priceRupees: 30, category: "Snacks", available: true },
    { name: "Maggie", priceRupees: 25, category: "Snacks", available: true },
    { name: "Masala Maggie", priceRupees: 30, category: "Snacks", available: true },
    { name: "Veg Sandwich", priceRupees: 30, category: "Snacks", available: true },
    { name: "Veg Cheese Sandwich", priceRupees: 40, category: "Snacks", available: true },
    { name: "Dal", priceRupees: 50, category: "Lunch", available: true },
    { name: "Chapati", priceRupees: 8, category: "Lunch", available: true },
    { name: "Bhaji", priceRupees: 25, category: "Lunch", available: true },
    { name: "Jeera Rice", priceRupees: 25, category: "Lunch", available: true },
    { name: "Mini Thali", priceRupees: 50, category: "Lunch", available: true },
    { name: "Full Thali", priceRupees: 80, category: "Lunch", available: true },
    { name: "Special Thali", priceRupees: 125, category: "Lunch", available: true },
    { name: "Pulav Rice Full", priceRupees: 75, category: "Lunch", available: true },
    { name: "Pulav Rice Half", priceRupees: 40, category: "Lunch", available: true },
    { name: "Fried Rice Full", priceRupees: 70, category: "Lunch", available: true },
    { name: "Fried Rice Half", priceRupees: 50, category: "Lunch", available: true },
    { name: "Noodles", priceRupees: 50, category: "Lunch", available: true },
    { name: "Pasta", priceRupees: 50, category: "Lunch", available: true },
    { name: "Boiled Egg", priceRupees: 15, category: "Lunch", available: true },
    { name: "Omlette Pav Single Egg", priceRupees: 40, category: "Lunch", available: true },
    { name: "Omlette Pav Double Egg", priceRupees: 60, category: "Lunch", available: true },
    { name: "Anda Bhurji Single Egg", priceRupees: 50, category: "Lunch", available: true },
    { name: "Anda Bhurji Double Egg", priceRupees: 60, category: "Lunch", available: true },
    { name: "Anda Curry (with 2 Eggs)", priceRupees: 70, category: "Lunch", available: true },
    { name: "Murmura Bhel", priceRupees: 20, category: "Snacks", available: true },
    { name: "Boiled Chana Bhel", priceRupees: 30, category: "Snacks", available: true },
    { name: "Sada Dosa", priceRupees: 60, category: "Snacks", available: true },
    { name: "Masala Dosa", priceRupees: 60, category: "Snacks", available: true },
    { name: "Onion Uttapam", priceRupees: 40, category: "Snacks", available: true }
  ];

  await MenuItem.insertMany(
    items.map((i) => ({
      name: i.name,
      category: i.category,
      pricePaise: Math.round(i.priceRupees * 100),
      available: i.available,
      imageUrl: i.imageUrl
    }))
  );

  console.log(`Seeded menu items: ${items.length}`);
}

