import { Router } from "express";

import { adminRouter } from "./admin.js";
import { announcementsRouter } from "./announcements.js";
import { authRouter } from "./auth.js";
import { displayRouter } from "./display.js";
import { menuRouter } from "./menu.js";
import { ordersRouter } from "./orders.js";
import { paymentsRouter } from "./payments.js";
import { slotsRouter } from "./slots.js";

export const apiRouter = Router();

apiRouter.get("/", (_req, res) => res.json({ ok: true, service: "sigce-canteen-api" }));

apiRouter.use("/auth", authRouter);
apiRouter.use("/menu", menuRouter);
apiRouter.use("/announcements", announcementsRouter);
apiRouter.use("/slots", slotsRouter);
apiRouter.use("/orders", ordersRouter);
apiRouter.use("/payments", paymentsRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/display", displayRouter);
