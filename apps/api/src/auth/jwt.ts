import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import type { Response } from "express";

import { env } from "../lib/env.js";
import type { UserRole } from "../models/User.js";

type AuthTokenPayload = {
  sub: string;
  role: UserRole;
};

export function signAuthToken(payload: AuthTokenPayload) {
  const secret: Secret = env.JWT_SECRET;
  const expiresIn: SignOptions["expiresIn"] = /^\d+$/.test(env.JWT_EXPIRES_IN)
    ? Number(env.JWT_EXPIRES_IN)
    : (env.JWT_EXPIRES_IN as SignOptions["expiresIn"]);
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
}

export function verifyAuthToken(token: string) {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    const sub = typeof decoded.sub === "string" ? decoded.sub : null;
    const role = typeof decoded.role === "string" ? decoded.role : null;
    if (!sub || (role !== "STUDENT" && role !== "TEACHER" && role !== "ADMIN")) return null;
    return { sub, role } as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: env.COOKIE_SAMESITE,
    secure: env.NODE_ENV === "production",
    path: "/"
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(env.COOKIE_NAME, { path: "/" });
}

