import type { NextFunction, Request, Response } from "express";

import { env } from "../lib/env.js";
import { isWithinCollegeHours, nowInZone } from "../lib/time.js";

export function enforceCollegeHours(req: Request, res: Response, next: NextFunction) {
  if (!env.ENFORCE_COLLEGE_HOURS) return next();
  if (req.auth?.role === "ADMIN") return next();

  const now = nowInZone();
  if (isWithinCollegeHours(now)) return next();

  return res.status(403).json({
    error: "CANTEEN_CLOSED",
    message: `Ordering is available only during college hours (${env.COLLEGE_HOURS_START}–${env.COLLEGE_HOURS_END}).`
  });
}

