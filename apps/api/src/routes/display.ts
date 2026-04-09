import { Router } from "express";
import { z } from "zod";

import { isoDay, nowInZone } from "../lib/time.js";
import { Order } from "../models/Order.js";

export const displayRouter = Router();

displayRouter.get("/queue", async (req, res) => {
  const parsed = z
    .object({
      day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    })
    .safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_QUERY" });

  const day = parsed.data.day ?? isoDay(nowInZone())!;
  const orders = await Order.find({
    day,
    status: { $in: ["NEW", "PREPARING", "READY"] }
  })
    .sort({ token: 1 })
    .lean();

  res.json({
    day,
    updatedAt: new Date().toISOString(),
    queue: orders.map((o) => ({
      token: o.token,
      status: o.status,
      fulfillment: o.fulfillment,
      staffRoomNumber: o.staffRoomNumber ?? null,
      scheduledFor: o.scheduledFor,
      items: o.items.map((it) => ({ name: it.name, quantity: it.quantity }))
    }))
  });
});

