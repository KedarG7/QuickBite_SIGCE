import mongoose from "mongoose";

import { env } from "./env.js";

export async function connectToMongo() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGO_URI);
  console.log("MongoDB connected");
}

export async function disconnectFromMongo() {
  await mongoose.disconnect();
}

