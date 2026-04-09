import crypto from "node:crypto";

import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";

import { env } from "../lib/env.js";
import { razorpay } from "../lib/razorpay.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { Order } from "../models/Order.js";
import { socket } from "../lib/socket.js";

export const paymentsRouter = Router();

paymentsRouter.post("/razorpay/verify", requireAuth, async (req, res) => {
  const body = z
    .object({
      orderId: z.string().min(1),
      razorpayOrderId: z.string().min(1),
      razorpayPaymentId: z.string().min(1),
      razorpaySignature: z.string().min(1)
    })
    .safeParse(req.body);

  if (!body.success) return res.status(400).json({ error: "INVALID_BODY" });
  if (!razorpay || !env.RAZORPAY_KEY_SECRET) return res.status(501).json({ error: "RAZORPAY_NOT_CONFIGURED" });

  if (!mongoose.isValidObjectId(body.data.orderId)) return res.status(400).json({ error: "INVALID_ORDER_ID" });

  const order = await Order.findById(body.data.orderId);
  if (!order) return res.status(404).json({ error: "NOT_FOUND" });
  if (String(order.userId) !== req.auth!.userId) return res.status(403).json({ error: "FORBIDDEN" });
  if (order.paymentMethod !== "RAZORPAY") return res.status(400).json({ error: "NOT_RAZORPAY_ORDER" });
  if (order.paymentStatus !== "PENDING" || order.status !== "AWAITING_PAYMENT") {
    return res.status(400).json({ error: "ORDER_NOT_AWAITING_PAYMENT" });
  }
  if (order.razorpay?.orderId !== body.data.razorpayOrderId) {
    return res.status(400).json({ error: "RAZORPAY_ORDER_MISMATCH" });
  }

  const signed = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${body.data.razorpayOrderId}|${body.data.razorpayPaymentId}`)
    .digest("hex");

  if (signed !== body.data.razorpaySignature) return res.status(400).json({ error: "INVALID_SIGNATURE" });

  order.paymentStatus = "PAID";
  order.status = "NEW";
  order.razorpay = { orderId: body.data.razorpayOrderId, paymentId: body.data.razorpayPaymentId };
  await order.save();

  socket.emitOrderNew({ orderId: String(order._id), token: order.token, status: order.status });
  socket.emitQueueUpdate({ updatedAt: new Date().toISOString() });

  res.json({
    ok: true,
    order: {
      id: String(order._id),
      token: order.token,
      status: order.status,
      fulfillment: order.fulfillment,
      staffRoomNumber: order.staffRoomNumber ?? null,
      scheduledFor: order.scheduledFor,
      totalPaise: order.totalPaise,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus
    }
  });
});

