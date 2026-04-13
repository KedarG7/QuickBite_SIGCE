import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";

import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { env } from "../lib/env.js";
import { isoDay, nowInZone } from "../lib/time.js";
import { Announcement } from "../models/Announcement.js";
import { MenuItem } from "../models/MenuItem.js";
import { Order } from "../models/Order.js";
import { socket } from "../lib/socket.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(["ADMIN"]));

adminRouter.get("/summary", async (req, res) => {
  const parsed = z
    .object({
      day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    })
    .safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_QUERY" });

  const day = parsed.data.day ?? isoDay(nowInZone())!;
  const match: any = { day, status: { $ne: "CANCELLED" } };

  const totals = await Order.aggregate<{
    _id: null;
    orders: number;
    totalPaise: number;
    paidPaise: number;
    cashDuePaise: number;
    cashPaidPaise: number;
    onlinePaidPaise: number;
  }>([
    { $match: match },
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        totalPaise: { $sum: "$totalPaise" },
        paidPaise: { $sum: { $cond: [{ $eq: ["$paymentStatus", "PAID"] }, "$totalPaise", 0] } },
        cashDuePaise: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ["$paymentMethod", "CASH"] }, { $eq: ["$paymentStatus", "DUE"] }] },
              "$totalPaise",
              0
            ]
          }
        },
        cashPaidPaise: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ["$paymentMethod", "CASH"] }, { $eq: ["$paymentStatus", "PAID"] }] },
              "$totalPaise",
              0
            ]
          }
        },
        onlinePaidPaise: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ["$paymentMethod", "RAZORPAY"] }, { $eq: ["$paymentStatus", "PAID"] }] },
              "$totalPaise",
              0
            ]
          }
        }
      }
    }
  ]);

  const byStatus = await Order.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  const topItems = await Order.aggregate<{ _id: string; quantity: number; salesPaise: number }>([
    { $match: match },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.name",
        quantity: { $sum: "$items.quantity" },
        salesPaise: { $sum: "$items.lineTotalPaise" }
      }
    },
    { $sort: { quantity: -1 } },
    { $limit: 10 }
  ]);

  const byHour = await Order.aggregate<{ _id: string; count: number }>([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: { format: "%H", date: "$createdAt", timezone: env.TIMEZONE }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.json({
    day,
    totals: totals[0] || {
      orders: 0,
      totalPaise: 0,
      paidPaise: 0,
      cashDuePaise: 0,
      cashPaidPaise: 0,
      onlinePaidPaise: 0
    },
    byStatus,
    topItems,
    byHour
  });
});

adminRouter.get("/orders", async (req, res) => {
  const parsed = z
    .object({
      day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      status: z
        .enum(["AWAITING_PAYMENT", "NEW", "PREPARING", "READY", "COMPLETED", "CANCELLED"])
        .optional(),
      limit: z.coerce.number().int().min(1).max(200).optional()
    })
    .safeParse(req.query);

  if (!parsed.success) return res.status(400).json({ error: "INVALID_QUERY" });

  const q: any = {};
  if (parsed.data.day) q.day = parsed.data.day;
  if (parsed.data.status) q.status = parsed.data.status;

  const limit = parsed.data.limit ?? 100;
  const orders = await Order.find(q).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({
    orders: orders.map((o) => ({
      id: String(o._id),
      day: o.day,
      token: o.token,
      status: o.status,
      fulfillment: o.fulfillment,
      staffRoomNumber: o.staffRoomNumber ?? null,
      scheduledFor: o.scheduledFor,
      totalPaise: o.totalPaise,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      userEmail: o.userEmail,
      items: o.items.map((it) => ({ name: it.name, quantity: it.quantity, lineTotalPaise: it.lineTotalPaise })),
      createdAt: o.createdAt
    }))
  });
});

adminRouter.patch("/orders/:id/status", async (req, res) => {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "INVALID_ID" });

  const parsed = z
    .object({
      status: z.enum(["NEW", "PREPARING", "READY", "COMPLETED", "CANCELLED"])
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_BODY" });

  const order = await Order.findByIdAndUpdate(
    id,
    { $set: { status: parsed.data.status } },
    { new: true }
  ).lean();
  if (!order) return res.status(404).json({ error: "NOT_FOUND" });
  socket.emitQueueUpdate({ updatedAt: new Date().toISOString() });
  return res.json({ ok: true });
});

adminRouter.patch("/orders/:id/payment", async (req, res) => {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "INVALID_ID" });

  const parsed = z
    .object({
      paymentStatus: z.enum(["DUE", "PAID"])
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_BODY" });

  const order = await Order.findById(id);
  if (!order) return res.status(404).json({ error: "NOT_FOUND" });
  if (order.paymentMethod !== "CASH") return res.status(400).json({ error: "ONLY_CASH_CAN_BE_MARKED" });

  order.paymentStatus = parsed.data.paymentStatus === "PAID" ? "PAID" : "DUE";
  if (order.paymentStatus === "PAID" && order.status !== "CANCELLED" && order.status !== "COMPLETED") {
    order.status = "READY";
  }
  await order.save();

  socket.emitQueueUpdate({ updatedAt: new Date().toISOString() });

  return res.json({ ok: true });
});

adminRouter.get("/menu", async (_req, res) => {
  const items = await MenuItem.find({}).sort({ category: 1, name: 1 }).lean();
  res.json({
    menuItems: items.map((i) => ({
      id: String(i._id),
      name: i.name,
      category: i.category,
      pricePaise: i.pricePaise,
      available: i.available
    }))
  });
});

adminRouter.post("/menu", async (req, res) => {
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(80),
      category: z.string().trim().min(1).max(40),
      priceRupees: z.coerce.number().min(0).max(10_000),
      available: z.coerce.boolean().optional()
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_BODY" });

  const item = await MenuItem.create({
    name: parsed.data.name,
    category: parsed.data.category,
    pricePaise: Math.round(parsed.data.priceRupees * 100),
    available: parsed.data.available ?? true
  });

  res.status(201).json({
    menuItem: {
      id: String(item._id),
      name: item.name,
      category: item.category,
      pricePaise: item.pricePaise,
      available: item.available
    }
  });
});

adminRouter.patch("/menu/:id", async (req, res) => {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "INVALID_ID" });

  const parsed = z
    .object({
      name: z.string().trim().min(1).max(80).optional(),
      category: z.string().trim().min(1).max(40).optional(),
      priceRupees: z.coerce.number().min(0).max(10_000).optional(),
      available: z.coerce.boolean().optional()
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_BODY" });

  const update: any = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.category !== undefined) update.category = parsed.data.category;
  if (parsed.data.priceRupees !== undefined) update.pricePaise = Math.round(parsed.data.priceRupees * 100);
  if (parsed.data.available !== undefined) update.available = parsed.data.available;

  const item = await MenuItem.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
  if (!item) return res.status(404).json({ error: "NOT_FOUND" });

  res.json({ ok: true });
});

adminRouter.delete("/menu/:id", async (req, res) => {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "INVALID_ID" });
  await MenuItem.findByIdAndDelete(id);
  res.json({ ok: true });
});

adminRouter.put("/announcements/:day", async (req, res) => {
  const day = req.params.day;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return res.status(400).json({ error: "INVALID_DAY" });

  const parsed = z
    .object({
      breakfast: z.string().trim().max(800).default(""),
      lunch: z.string().trim().max(800).default("")
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_BODY" });

  await Announcement.findOneAndUpdate(
    { day },
    { $set: { breakfast: parsed.data.breakfast, lunch: parsed.data.lunch, updatedByUserId: req.auth!.userId } },
    { upsert: true, new: true }
  );

  res.json({ ok: true });
});
