import { Router } from "express";
import { DateTime } from "luxon";

import { env } from "../lib/env.js";
import { alignToSlot, isBeforeCutoff, makeSlotKey, nowInZone, parseTimeHHmm } from "../lib/time.js";
import { enforceCollegeHours } from "../middleware/enforceCollegeHours.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { Order } from "../models/Order.js";

export const slotsRouter = Router();

async function remainingForSlots(day: string, fulfillment: "PICKUP" | "STAFF_ROOM", slotKeys: string[]) {
  const rows = await Order.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        day,
        fulfillment,
        slotKey: { $in: slotKeys },
        status: { $ne: "CANCELLED" }
      }
    },
    { $group: { _id: "$slotKey", count: { $sum: 1 } } }
  ]);

  const map = new Map<string, number>();
  for (const r of rows) map.set(r._id, r.count);
  return map;
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

slotsRouter.get("/", requireAuth, enforceCollegeHours, async (req, res) => {
  const now = nowInZone();
  const day = now.toISODate()!;

  const slotMinutes = env.PICKUP_SLOT_MINUTES;
  const capacity = env.PICKUP_SLOT_CAPACITY;

  const pickupStart = alignToSlot(now.plus({ minutes: env.PICKUP_MIN_LEAD_MINUTES }), slotMinutes);
  const pickupEndRaw = alignToSlot(now.plus({ minutes: env.PICKUP_LOOKAHEAD_MINUTES }), slotMinutes);
  const collegeEnd = timeOnDay(day, env.COLLEGE_HOURS_END);
  const pickupEndLimit = collegeEnd ? collegeEnd.minus({ minutes: slotMinutes }) : pickupEndRaw;
  const pickupEnd = pickupEndRaw < pickupEndLimit ? pickupEndRaw : pickupEndLimit;

  const pickupSlots: DateTime[] = [];
  for (let dt = pickupStart; dt <= pickupEnd; dt = dt.plus({ minutes: slotMinutes })) pickupSlots.push(dt);

  const pickupSlotKeys = pickupSlots.map(makeSlotKey);
  const pickupCounts = await remainingForSlots(day, "PICKUP", pickupSlotKeys);

  const pickup = pickupSlots.map((dt) => {
    const key = makeSlotKey(dt);
    const used = pickupCounts.get(key) ?? 0;
    return {
      start: dt.toISO(),
      slotKey: key,
      remaining: Math.max(0, capacity - used)
    };
  });

  const staffRoomLunch: Array<{ start: string; slotKey: string; remaining: number }> = [];

  if (req.auth!.role === "TEACHER" && isBeforeCutoff(now, env.TEACHER_LUNCH_PREORDER_CUTOFF)) {
    const lunchStart = timeOnDay(day, env.LUNCH_WINDOW_START);
    const lunchEnd = timeOnDay(day, env.LUNCH_WINDOW_END);
    if (lunchStart && lunchEnd && lunchEnd > lunchStart) {
      const lunchSlots: DateTime[] = [];
      for (let dt = lunchStart; dt <= lunchEnd; dt = dt.plus({ minutes: slotMinutes })) lunchSlots.push(dt);
      const lunchKeys = lunchSlots.map(makeSlotKey);
      const lunchCounts = await remainingForSlots(day, "STAFF_ROOM", lunchKeys);
      for (const dt of lunchSlots) {
        const key = makeSlotKey(dt);
        const used = lunchCounts.get(key) ?? 0;
        staffRoomLunch.push({
          start: dt.toISO(),
          slotKey: key,
          remaining: Math.max(0, capacity - used)
        });
      }
    }
  }

  res.json({
    now: now.toISO(),
    rules: {
      slotMinutes,
      capacity,
      teacherPreorderCutoff: env.TEACHER_LUNCH_PREORDER_CUTOFF,
      lunchWindowStart: env.LUNCH_WINDOW_START,
      lunchWindowEnd: env.LUNCH_WINDOW_END
    },
    pickup,
    staffRoomLunch
  });
});
