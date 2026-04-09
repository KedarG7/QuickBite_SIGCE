import type { NextFunction, Request, Response } from "express";

import { env } from "../lib/env.js";
import { verifyAuthToken } from "../auth/jwt.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.[env.COOKIE_NAME] as string | undefined;
  const header = req.header("authorization");
  const bearerToken = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  const token = cookieToken || bearerToken;

  if (!token) return res.status(401).json({ error: "UNAUTHORIZED" });

  const decoded = verifyAuthToken(token);
  if (!decoded) return res.status(401).json({ error: "UNAUTHORIZED" });

  req.auth = { userId: decoded.sub, role: decoded.role };
  next();
}

