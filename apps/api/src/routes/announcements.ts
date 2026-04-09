import { Router } from "express";
import { z } from "zod";

import { Announcement } from "../models/Announcement.js";

export const announcementsRouter = Router();

announcementsRouter.get("/", async (req, res) => {
  const parsed = z
    .object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      days: z.coerce.number().int().min(1).max(14).optional()
    })
    .safeParse(req.query);

  if (!parsed.success) return res.status(400).json({ error: "INVALID_QUERY" });
  const from = parsed.data.from;
  const days = parsed.data.days ?? 2;

  const query: any = {};
  if (from) query.day = { $gte: from };

  const rows = await Announcement.find(query).sort({ day: 1 }).limit(days).lean();
  return res.json({
    announcements: rows.map((a) => ({
      day: a.day,
      breakfast: a.breakfast,
      lunch: a.lunch,
      updatedAt: a.updatedAt
    }))
  });
});

