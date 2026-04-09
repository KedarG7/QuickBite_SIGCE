import { DateTime } from "luxon";

import { env } from "./env.js";

export function nowInZone() {
  return DateTime.now().setZone(env.TIMEZONE);
}

export function isoDay(dt: DateTime) {
  return dt.toISODate();
}

export function parseTimeHHmm(value: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23) return null;
  if (mm < 0 || mm > 59) return null;
  return { hh, mm };
}

export function isWithinCollegeHours(dt: DateTime) {
  const start = parseTimeHHmm(env.COLLEGE_HOURS_START);
  const end = parseTimeHHmm(env.COLLEGE_HOURS_END);
  if (!start || !end) return true;

  const startDt = dt.set({ hour: start.hh, minute: start.mm, second: 0, millisecond: 0 });
  const endDt = dt.set({ hour: end.hh, minute: end.mm, second: 0, millisecond: 0 });
  return dt >= startDt && dt < endDt;
}

export function isBeforeCutoff(dt: DateTime, cutoffHHmm: string) {
  const cutoff = parseTimeHHmm(cutoffHHmm);
  if (!cutoff) return true;
  const cutoffDt = dt.set({ hour: cutoff.hh, minute: cutoff.mm, second: 0, millisecond: 0 });
  return dt < cutoffDt;
}

export function makeSlotKey(dt: DateTime) {
  return dt.toFormat("yyyy-LL-dd'T'HH:mm");
}

export function alignToSlot(dt: DateTime, slotMinutes: number) {
  const minutes = Math.floor(dt.minute / slotMinutes) * slotMinutes;
  return dt.set({ minute: minutes, second: 0, millisecond: 0 });
}

