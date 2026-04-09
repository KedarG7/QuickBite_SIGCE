import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { Router } from "express";
import { z } from "zod";

import { signAuthToken, setAuthCookie, clearAuthCookie } from "../auth/jwt.js";
import { env } from "../lib/env.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { User } from "../models/User.js";

export const authRouter = Router();

const studentEmailRegex = new RegExp(env.STUDENT_EMAIL_REGEX, "i");
const teacherDomain = env.TEACHER_EMAIL_DOMAIN.toLowerCase();
const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

function asSafeUser(u: any) {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    staffRoomNumber: u.staffRoomNumber ?? null
  };
}

authRouter.post("/register/student", async (req, res) => {
  const body = z
    .object({
      name: z.string().trim().min(2).max(80),
      email: z.string().trim().toLowerCase().max(120),
      password: z.string().min(8).max(72)
    })
    .safeParse(req.body);

  if (!body.success) return res.status(400).json({ error: "INVALID_BODY" });

  const { name, email, password } = body.data;
  if (!studentEmailRegex.test(email)) {
    return res.status(400).json({
      error: "INVALID_STUDENT_EMAIL",
      message: "Use your college email id like 2024ci19f@sigce.edu.in"
    });
  }

  const existing = await User.findOne({ email }).lean();
  if (existing) return res.status(409).json({ error: "EMAIL_IN_USE" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, role: "STUDENT", passwordHash });

  const token = signAuthToken({ sub: String(user._id), role: "STUDENT" });
  setAuthCookie(res, token);
  return res.json({ user: asSafeUser(user) });
});

authRouter.post("/register/teacher", async (req, res) => {
  const body = z
    .object({
      name: z.string().trim().min(2).max(80),
      email: z.string().trim().toLowerCase().max(120),
      password: z.string().min(8).max(72),
      staffRoomNumber: z.string().trim().min(1).max(20)
    })
    .safeParse(req.body);

  if (!body.success) return res.status(400).json({ error: "INVALID_BODY" });

  const { name, email, password, staffRoomNumber } = body.data;
  if (!email.endsWith(`@${teacherDomain}`)) {
    return res.status(400).json({ error: "INVALID_TEACHER_EMAIL", message: `Use a ${teacherDomain} email.` });
  }

  const existing = await User.findOne({ email }).lean();
  if (existing) return res.status(409).json({ error: "EMAIL_IN_USE" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, role: "TEACHER", passwordHash, staffRoomNumber });

  const token = signAuthToken({ sub: String(user._id), role: "TEACHER" });
  setAuthCookie(res, token);
  return res.json({ user: asSafeUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const body = z
    .object({
      email: z.string().trim().toLowerCase().max(120),
      password: z.string().min(1).max(72)
    })
    .safeParse(req.body);

  if (!body.success) return res.status(400).json({ error: "INVALID_BODY" });

  const { email, password } = body.data;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "INVALID_CREDENTIALS" });
  if (!user.passwordHash) return res.status(400).json({ error: "PASSWORD_NOT_SET" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

  const token = signAuthToken({ sub: String(user._id), role: user.role });
  setAuthCookie(res, token);
  return res.json({ user: asSafeUser(user) });
});

authRouter.post("/google", async (req, res) => {
  const body = z
    .object({
      idToken: z.string().min(10),
      staffRoomNumber: z.string().trim().min(1).max(20).optional()
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "INVALID_BODY" });
  if (!googleClient || !env.GOOGLE_CLIENT_ID) return res.status(501).json({ error: "GOOGLE_NOT_CONFIGURED" });

  const ticket = await googleClient.verifyIdToken({
    idToken: body.data.idToken,
    audience: env.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();
  const email = payload?.email?.toLowerCase();
  const sub = payload?.sub;
  const name = payload?.name || payload?.given_name || "User";

  if (!email || !sub) return res.status(401).json({ error: "INVALID_GOOGLE_TOKEN" });

  let role: "STUDENT" | "TEACHER" | null = null;
  if (studentEmailRegex.test(email)) role = "STUDENT";
  else if (email.endsWith(`@${teacherDomain}`)) role = "TEACHER";
  else role = null;

  if (!role) return res.status(403).json({ error: "EMAIL_NOT_ALLOWED" });

  let user = await User.findOne({ email });
  if (!user) {
    if (role === "TEACHER" && !body.data.staffRoomNumber) {
      return res.status(400).json({ error: "STAFF_ROOM_REQUIRED" });
    }

    user = await User.create({
      name,
      email,
      role,
      googleSub: sub,
      staffRoomNumber: role === "TEACHER" ? body.data.staffRoomNumber : undefined
    });
  } else {
    if (!user.googleSub) {
      user.googleSub = sub;
      if (user.role === "TEACHER" && body.data.staffRoomNumber && !user.staffRoomNumber) {
        user.staffRoomNumber = body.data.staffRoomNumber;
      }
      await user.save();
    }
  }

  const token = signAuthToken({ sub: String(user._id), role: user.role });
  setAuthCookie(res, token);
  return res.json({ user: asSafeUser(user) });
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.auth!.userId).lean();
  if (!user) return res.status(401).json({ error: "UNAUTHORIZED" });
  return res.json({ user: asSafeUser(user) });
});

