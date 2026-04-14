import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { DateTime } from "luxon";

import { env } from "../lib/env.js";
import { haversineMeters } from "../lib/geo.js";
import {
  alignToSlot,
  isBeforeCutoff,
  isoDay,
  isWithinCollegeHours,
  makeSlotKey,
  nowInZone,
  parseTimeHHmm
} from "../lib/time.js";
import { enforceCollegeHours } from "../middleware/enforceCollegeHours.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { MenuItem } from "../models/MenuItem.js";
import { Order } from "../models/Order.js";
import { TokenCounter } from "../models/TokenCounter.js";
import { User } from "../models/User.js";
import { socket } from "../lib/socket.js";
import { razorpay } from "../lib/razorpay.js";

export const ordersRouter = Router();

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(50)
      })
    )
    .min(1)
    .max(50),
  paymentMethod: z.enum(["CASH", "RAZORPAY"]).default("CASH"),
  fulfillment: z.enum(["PICKUP", "STAFF_ROOM"]).default("PICKUP"),
  scheduledFor: z.string().min(8),
  staffRoomNumber: z.string().trim().min(1).max(20).optional(),
  notes: z.string().trim().max(240).optional(),
  clientLocation: z
    .object({
      lat: z.number(),
      lng: z.number()
    })
    .optional()
});

async function nextToken(day: string) {
  const row = await TokenCounter.findOneAndUpdate(
    { day },
    { $inc: { lastToken: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return row.lastToken;
}

function timeOnDay(day: string, hhmm: string) {
  const t = parseTimeHHmm(hhmm);
  if (!t) return null;
  const dt = DateTime.fromISO(day, { zone: env.TIMEZONE }).set({
    hour: t.hh,
    minute: t.mm,
    second: 0,
    millisecond: 0
  });
  return dt.isValid ? dt : null;
}

function assertGeofence(clientLocation?: { lat: number; lng: number }) {
  if (!env.ENFORCE_GEOFENCE) return;
  if (!clientLocation) {
    throw Object.assign(new Error("Location required"), { code: "GEOFENCE_REQUIRED" });
  }

  const distance = haversineMeters(
    { lat: env.CANTEEN_LAT, lng: env.CANTEEN_LNG },
    { lat: clientLocation.lat, lng: clientLocation.lng }
  );
  if (distance > env.CANTEEN_RADIUS_METERS) {
    throw Object.assign(new Error("Outside canteen premises"), { code: "OUTSIDE_GEOFENCE", distance });
  }
}

ordersRouter.get("/my", requireAuth, async (req, res) => {
  const orders = await Order.find({ userId: req.auth!.userId }).sort({ createdAt: -1 }).limit(50).lean();
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
      items: o.items.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        lineTotalPaise: it.lineTotalPaise
      })),
      createdAt: o.createdAt
    }))
  });
});

ordersRouter.post("/", requireAuth, enforceCollegeHours, async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_BODY" });

  const auth = req.auth!;
  const now = nowInZone();

  try {
    assertGeofence(parsed.data.clientLocation);
  } catch (err: any) {
    if (err.code === "GEOFENCE_REQUIRED") return res.status(403).json({ error: "GEOFENCE_REQUIRED" });
    if (err.code === "OUTSIDE_GEOFENCE")
      return res.status(403).json({ error: "OUTSIDE_GEOFENCE", distanceMeters: err.distance });
    throw err;
  }

  const user = await User.findById(auth.userId).lean();
  if (!user) return res.status(401).json({ error: "UNAUTHORIZED" });
  if (user.role === "ADMIN") return res.status(403).json({ error: "ADMINS_CANNOT_ORDER" });

  const day = isoDay(now)!;
  const slotMinutes = env.PICKUP_SLOT_MINUTES;

  const roleAtOrder = user.role;
  const fulfillment =
    roleAtOrder === "STUDENT" ? "PICKUP" : (parsed.data.fulfillment as "PICKUP" | "STAFF_ROOM");

  if (fulfillment === "STAFF_ROOM") {
    if (roleAtOrder !== "TEACHER") return res.status(403).json({ error: "FORBIDDEN" });
    if (!isBeforeCutoff(now, env.TEACHER_LUNCH_PREORDER_CUTOFF)) {
      return res.status(403).json({ error: "PREORDER_CUTOFF_PASSED" });
    }
  }

  const scheduled = DateTime.fromISO(parsed.data.scheduledFor, { zone: env.TIMEZONE });
  if (!scheduled.isValid) return res.status(400).json({ error: "INVALID_SCHEDULED_FOR" });

  const scheduledAligned = alignToSlot(scheduled, slotMinutes);
  if (scheduledAligned.toISO() !== scheduled.toISO()) {
    return res.status(400).json({ error: "SLOT_NOT_ALIGNED" });
  }

  if (scheduledAligned.toISODate() !== day) {
    return res.status(400).json({ error: "INVALID_SCHEDULE_DAY" });
  }

  if (!isWithinCollegeHours(scheduledAligned)) {
    return res.status(400).json({ error: "SCHEDULE_OUTSIDE_COLLEGE_HOURS" });
  }

  if (fulfillment === "PICKUP") {
    const minDt = alignToSlot(now.plus({ minutes: env.PICKUP_MIN_LEAD_MINUTES }), slotMinutes);
    const maxDt = alignToSlot(now.plus({ minutes: env.PICKUP_LOOKAHEAD_MINUTES }), slotMinutes);
    if (scheduledAligned < minDt || scheduledAligned > maxDt) {
      return res.status(400).json({ error: "PICKUP_SLOT_OUT_OF_RANGE" });
    }
  }

  if (fulfillment === "STAFF_ROOM") {
    const lunchStart = timeOnDay(day, env.LUNCH_WINDOW_START);
    const lunchEnd = timeOnDay(day, env.LUNCH_WINDOW_END);
    if (!lunchStart || !lunchEnd || lunchEnd <= lunchStart) {
      return res.status(500).json({ error: "LUNCH_WINDOW_INVALID" });
    }
    if (scheduledAligned < lunchStart || scheduledAligned > lunchEnd) {
      return res.status(400).json({ error: "DELIVERY_SLOT_NOT_IN_LUNCH_WINDOW" });
    }
  }

  const slotKey = makeSlotKey(scheduledAligned);
  const count = await Order.countDocuments({
    day,
    fulfillment,
    slotKey,
    status: { $ne: "CANCELLED" }
  });
  if (count >= env.PICKUP_SLOT_CAPACITY) return res.status(409).json({ error: "SLOT_FULL" });

  const menuIds = parsed.data.items.map((i) => i.menuItemId);
  const objectIds = menuIds
    .map((id) => (mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : null))
    .filter(Boolean) as mongoose.Types.ObjectId[];

  if (objectIds.length !== menuIds.length) return res.status(400).json({ error: "INVALID_MENU_ITEM_ID" });

  const menuItems = await MenuItem.find({ _id: { $in: objectIds }, available: true }).lean();
  const menuById = new Map<string, (typeof menuItems)[number]>();
  for (const m of menuItems) menuById.set(String(m._id), m);

  const lineItems = [];
  let totalPaise = 0;
  for (const li of parsed.data.items) {
    const m = menuById.get(li.menuItemId);
    if (!m) return res.status(400).json({ error: "ITEM_UNAVAILABLE" });
    const lineTotalPaise = m.pricePaise * li.quantity;
    totalPaise += lineTotalPaise;
    lineItems.push({
      menuItemId: m._id,
      name: m.name,
      pricePaise: m.pricePaise,
      quantity: li.quantity,
      lineTotalPaise
    });
  }

  const token = await nextToken(day);

  let paymentMethod = parsed.data.paymentMethod;
  if (paymentMethod === "RAZORPAY" && (!razorpay || !env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET)) {
    paymentMethod = "CASH";
  }
  const staffRoomNumber =
    fulfillment === "STAFF_ROOM" ? parsed.data.staffRoomNumber ?? user.staffRoomNumber ?? undefined : undefined;

  if (fulfillment === "STAFF_ROOM" && !staffRoomNumber) {
    return res.status(400).json({ error: "STAFF_ROOM_REQUIRED" });
  }

  if (paymentMethod === "RAZORPAY") {
    const rp = razorpay as NonNullable<typeof razorpay>;
    const receipt = `${day}-T${token}`;
    const rpOrder = (await rp.orders.create({
      amount: totalPaise,
      currency: "INR",
      receipt,
      payment_capture: true
    })) as { id: string; amount: number; currency: string };

    const order = await Order.create({
      day,
      token,
      userId: user._id,
      userEmail: user.email,
      roleAtOrder,
      fulfillment,
      staffRoomNumber,
      slotKey,
      scheduledFor: scheduledAligned.toJSDate(),
      notes: parsed.data.notes,
      items: lineItems,
      totalPaise,
      paymentMethod: "RAZORPAY",
      paymentStatus: "PENDING",
      razorpay: { orderId: rpOrder.id },
      status: "AWAITING_PAYMENT"
    });

    socket.emitOrderNew({ orderId: String(order._id), token: order.token, status: order.status });
    socket.emitQueueUpdate({ updatedAt: new Date().toISOString() });

    return res.json({
      order: {
        id: String(order._id),
        token: order.token,
        status: order.status,
        fulfillment: order.fulfillment,
        staffRoomNumber: order.staffRoomNumber ?? null,
        scheduledFor: order.scheduledFor,
        totalPaise: order.totalPaise,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        items: order.items.map((it) => ({ name: it.name, quantity: it.quantity, lineTotalPaise: it.lineTotalPaise }))
      },
      razorpay: {
        keyId: env.RAZORPAY_KEY_ID,
        orderId: rpOrder.id,
        amount: rpOrder.amount,
        currency: rpOrder.currency
      }
    });
  }

  const order = await Order.create({
    day,
    token,
    userId: user._id,
    userEmail: user.email,
    roleAtOrder,
    fulfillment,
    staffRoomNumber,
    slotKey,
    scheduledFor: scheduledAligned.toJSDate(),
    notes: parsed.data.notes,
    items: lineItems,
    totalPaise,
    paymentMethod: "CASH",
    paymentStatus: "DUE",
    status: "NEW"
  });

  socket.emitOrderNew({ orderId: String(order._id), token: order.token, status: order.status });
  socket.emitQueueUpdate({ updatedAt: new Date().toISOString() });

  return res.json({
    order: {
      id: String(order._id),
      token: order.token,
      status: order.status,
      fulfillment: order.fulfillment,
      staffRoomNumber: order.staffRoomNumber ?? null,
      scheduledFor: order.scheduledFor,
      totalPaise: order.totalPaise,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      items: order.items.map((it) => ({ name: it.name, quantity: it.quantity, lineTotalPaise: it.lineTotalPaise }))
    }
  });
});
