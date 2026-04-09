import http from "node:http";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Server as SocketIOServer } from "socket.io";

import { connectToMongo, disconnectFromMongo } from "./lib/db.js";
import { env } from "./lib/env.js";
import { attachSocket, socket } from "./lib/socket.js";
import { apiRouter } from "./routes/api.js";
import { seedAdminUser } from "./seed/seedAdmin.js";

async function main() {
  await connectToMongo();
  await seedAdminUser();

  const app = express();

  app.set("trust proxy", true);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json({ limit: "300kb" }));
  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 600
    })
  );

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api", apiRouter);

  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: env.CORS_ORIGIN, credentials: true }
  });

  attachSocket(io);
  io.on("connection", (s) => {
    socket.onConnect(s);
  });

  server.listen(env.PORT, () => {
    console.log(`API running on http://localhost:${env.PORT}`);
  });

  const shutdown = async () => {
    console.log("Shutting down...");
    io.close();
    server.close();
    await disconnectFromMongo();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
