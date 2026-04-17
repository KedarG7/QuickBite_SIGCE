import mongoose from "mongoose";
import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { PointTransaction } from "../models/PointTransaction.js";
import { User } from "../models/User.js";

export const teacherRouter = Router();

teacherRouter.use(requireAuth, requireRole(["TEACHER"]));

teacherRouter.get("/students", async (req, res) => {
  const parsed = z
    .object({
      q: z.string().trim().min(1).max(120).optional()
    })
    .safeParse(req.query);

  if (!parsed.success) return res.status(400).json({ error: "INVALID_QUERY" });

  const q = parsed.data.q || "";
  const filter: any = { role: "STUDENT" };
  if (q) {
    filter.$or = [{ email: { $regex: q, $options: "i" } }, { name: { $regex: q, $options: "i" } }];
  }

  const students = await User.find(filter).sort({ name: 1 }).limit(40).lean();
  return res.json({
    students: students.map((s) => ({
      id: String(s._id),
      name: s.name,
      email: s.email,
      rewardPoints: Number(s.rewardPoints || 0)
    }))
  });
});

teacherRouter.post("/points/grant", async (req, res) => {
  const parsed = z
    .object({
      studentId: z.string().min(1),
      points: z.coerce.number().int().min(1).max(500),
      reason: z.string().trim().min(2).max(200)
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_BODY" });

  if (!mongoose.isValidObjectId(parsed.data.studentId)) return res.status(400).json({ error: "INVALID_STUDENT_ID" });

  const student = await User.findOne({ _id: parsed.data.studentId, role: "STUDENT" });
  if (!student) return res.status(404).json({ error: "STUDENT_NOT_FOUND" });

  student.rewardPoints += parsed.data.points;
  student.totalRewardPointsEarned += parsed.data.points;
  await student.save();

  await PointTransaction.create({
    studentId: student._id,
    teacherId: req.auth!.userId,
    type: "GRANT",
    points: parsed.data.points,
    reason: parsed.data.reason
  });

  return res.json({
    ok: true,
    student: {
      id: String(student._id),
      name: student.name,
      email: student.email,
      rewardPoints: student.rewardPoints
    }
  });
});

